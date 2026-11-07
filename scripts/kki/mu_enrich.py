#!/usr/bin/env python3
"""
MangaUpdates enrichment for KKI archive entries.

Fixes:
1. Validates every URL with sanitize_mu_url() and wraps Request construction
   inside try/except so dirty cells (like "いのちの火" on "Api Kehidupan")
   are marked status="invalid-url" and never crash the run.
2. Circuit breaker: stops immediately after 3 consecutive HTTP 429 responses
   instead of looping over hundreds of blocked entries.
3. Saves archive & translation cache incrementally every 15 entries.
4. Skips terminal statuses ("ok", "invalid-url", "parse-empty", "fetch-failed")
   unless explicitly retried.
"""

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from html import unescape

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DATA_DIR = REPO / "src" / "data"
ARCHIVE_JSON = DATA_DIR / "kki-archive.json"
TRANSLATION_CACHE = KKI_DIR / "kki-translations.json"

sys.path.insert(0, str(KKI_DIR))
from url_utils import sanitize_mu_url

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
DELAY_S = 1.5
MAX_CONSECUTIVE_429 = 3


def fetch(url: str, timeout: int = 25) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                return None
            return resp.read(500_000).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return "BLOCKED"
        return None
    except Exception:
        return None


def parse_mu_page(html: str) -> dict:
    out = {"cover": None, "description_en": None}
    m = re.search(
        r'<img[^>]+src="(https://cdn\.mangaupdates\.com[^"]+)"[^>]*>',
        html)
    if m:
        out["cover"] = m.group(1)
    else:
        m = re.search(r'(https://cdn\.mangaupdates\.com/image[s]?/[^"\s]+)', html)
        if m:
            out["cover"] = m.group(1)

    m = re.search(
        r'<div class="sContent"[^>]*>(.*?)</div>',
        html, re.DOTALL | re.IGNORECASE)
    if m:
        desc = re.sub(r"<br\s*/?>", "\n", m.group(1))
        desc = re.sub(r"<[^>]+>", "", desc)
        desc = unescape(desc).strip()
        desc = re.sub(r"\n{3,}", "\n\n", desc)
        desc = re.sub(r"\s*\[.*?\]\s*$", "", desc).strip()
        if len(desc) > 20:
            out["description_en"] = desc
    return out


def translate_id(text_en: str, cache: dict) -> str | None:
    key = hashlib.sha1(text_en.encode("utf-8")).hexdigest()[:16]
    if key in cache:
        return cache[key]["id"]

    sentences = re.split(r"(?<=[.!?])\s+", text_en)
    chunks, cur = [], ""
    for s in sentences:
        if len(cur) + len(s) + 1 > 400:
            if cur:
                chunks.append(cur)
            cur = s[:400]
        else:
            cur = (cur + " " + s).strip() if cur else s
    if cur:
        chunks.append(cur)

    out_parts = []
    try:
        for c in chunks:
            q = urllib.parse.quote(c)
            url = f"https://api.mymemory.translated.net/get?q={q}&langpair=en|id"
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if str(data.get("responseStatus")) != "200":
                raise RuntimeError(f"MyMemory status {data.get('responseStatus')}")
            translated = data["responseData"]["translatedText"]
            if "MYMEMORY WARNING" in translated or not translated.strip():
                raise RuntimeError("MyMemory quota warning/empty")
            out_parts.append(translated)
            time.sleep(1.0)
    except Exception as e:
        print(f"  translate skipped: {e}", file=sys.stderr)
        return None

    translated = " ".join(out_parts)
    cache[key] = {"en": text_en[:500], "id": translated,
                  "translatedAt": time.strftime("%Y-%m-%d")}
    return translated


def save_state(archive, cache):
    with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False, indent=1)
    with open(TRANSLATION_CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--retry-blocked", action="store_true")
    ap.add_argument("--retry-failed", action="store_true")
    args = ap.parse_args()

    if not ARCHIVE_JSON.exists():
        print("kki-archive.json not found — run build_archive.py first", file=sys.stderr)
        sys.exit(1)

    archive = json.load(open(ARCHIVE_JSON, encoding="utf-8"))
    cache = json.load(open(TRANSLATION_CACHE, encoding="utf-8")) if TRANSLATION_CACHE.exists() else {}

    pending = []
    invalid_cleaned = 0
    for e in archive:
        raw_url = e.get("mangaupdatesUrl")
        if not raw_url:
            continue
        clean_url = sanitize_mu_url(raw_url)
        if not clean_url:
            e["mangaupdatesUrl"] = None
            e["mu"] = {"status": "invalid-url", "fetchedAt": time.strftime("%Y-%m-%d")}
            invalid_cleaned += 1
            continue
        e["mangaupdatesUrl"] = clean_url
        mu = e.get("mu") or {}
        status = mu.get("status")
        if status in ("ok", "invalid-url"):
            continue
        if status == "blocked" and not args.retry_blocked:
            continue
        if status in ("fetch-failed", "parse-empty") and not args.retry_failed:
            continue
        pending.append(e)

    if invalid_cleaned:
        print(f"cleaned {invalid_cleaned} invalid MangaUpdates URLs")
        save_state(archive, cache)

    if args.limit:
        pending = pending[:args.limit]
    elif not args.all:
        print(f"{len(pending)} pending. Use --limit N or --all.")
        return 0

    print(f"enriching {len(pending)} entries...")
    ok = blocked = failed = 0
    consecutive_429 = 0

    for i, e in enumerate(pending, 1):
        url = e["mangaupdatesUrl"]
        print(f"[{i}/{len(pending)}] {e['title'][:50]}")
        html = fetch(url)
        if html == "BLOCKED":
            e["mu"] = {"status": "blocked", "fetchedAt": time.strftime("%Y-%m-%d")}
            blocked += 1
            consecutive_429 += 1
            print(f"  -> 429 blocked ({consecutive_429}/{MAX_CONSECUTIVE_429})")
            if consecutive_429 >= MAX_CONSECUTIVE_429:
                print("  !! Circuit breaker triggered (MangaUpdates 429) — stopping MU step gracefully.")
                break
        elif not html:
            e["mu"] = {"status": "fetch-failed", "fetchedAt": time.strftime("%Y-%m-%d")}
            failed += 1
            consecutive_429 = 0
            print("  -> fetch failed")
        else:
            consecutive_429 = 0
            parsed = parse_mu_page(html)
            mu = {"status": "ok", "fetchedAt": time.strftime("%Y-%m-%d")}
            if parsed["cover"]:
                mu["cover"] = parsed["cover"]
            if parsed["description_en"]:
                mu["descriptionEn"] = parsed["description_en"]
                id_text = translate_id(parsed["description_en"], cache)
                if id_text:
                    mu["descriptionId"] = id_text
            if not parsed["cover"] and not parsed["description_en"]:
                mu["status"] = "parse-empty"
                failed += 1
            else:
                ok += 1
            e["mu"] = mu
            print(f"  -> cover={'yes' if parsed['cover'] else 'no'}, desc={'yes' if parsed['description_en'] else 'no'}")

        if i % 15 == 0:
            save_state(archive, cache)
        time.sleep(DELAY_S)

    save_state(archive, cache)
    print(f"done: ok={ok} blocked={blocked} failed={failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())