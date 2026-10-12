#!/usr/bin/env python3
"""
MangaUpdates enrichment for KKI archive entries.

Fetches cover image URL + English description from a MangaUpdates series
page, then auto-translates the description to Indonesian (cached).

Translation: MyMemory free API (no key needed), chunked to ~400 chars,
1s delay between chunks, results cached in kki-translations.json keyed by
sha1(english_text) — never re-translates the same text. MyMemory anonymous
is rate-limited (~5000 chars/day), so enrichment is intentionally
incremental: each sync run tops up the cache. On translation failure the
English description is kept and translation is retried next run.

Network policy:
  - 1.5s delay between MU requests, browser-like UA
  - on HTTP 429 / block: record mu_status="blocked" and continue
    (enrichment is retried on the next sync run)

Usage:
  python3 mu_enrich.py --limit 50        # enrich first 50 pending entries
  python3 mu_enrich.py --all             # enrich all pending entries
  python3 mu_enrich.py --retry-blocked   # retry entries marked blocked
"""

import argparse
import hashlib
import json
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from html import unescape

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DATA_DIR = REPO / "src" / "data"
ARCHIVE_JSON = DATA_DIR / "kki-archive.json"
TRANSLATION_CACHE = KKI_DIR / "kki-translations.json"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
DELAY_S = 1.5


def fetch(url: str, timeout: int = 25) -> str | None:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                return None
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return "BLOCKED"
        return None
    except Exception:
        return None


def parse_mu_page(html: str) -> dict:
    """Extract cover image URL and English description from MU series HTML."""
    out = {"cover": None, "description_en": None}

    # cover: MU series pages show the cover in the sidebar
    # typical: <img ... src="https://cdn.mangaupdates.com/image/...">
    m = re.search(
        r'<img[^>]+src="(https://cdn\.mangaupdates\.com[^"]+)"[^>]*>',
        html)
    if m:
        out["cover"] = m.group(1)
    else:
        # fallback: any mangaupdates image
        m = re.search(r'(https://cdn\.mangaupdates\.com/images/[^"\s]+)', html)
        if m:
            out["cover"] = m.group(1)

    # description: inside <div class="sContent"> ... </div>
    m = re.search(
        r'<div class="sContent"[^>]*>(.*?)</div>',
        html, re.DOTALL | re.IGNORECASE)
    if m:
        desc = re.sub(r"<br\s*/?>", "\n", m.group(1))
        desc = re.sub(r"<[^>]+>", "", desc)
        desc = unescape(desc).strip()
        desc = re.sub(r"\n{3,}", "\n\n", desc)
        # strip common trailing junk
        desc = re.sub(r"\s*\[.*?\]\s*$", "", desc).strip()
        if len(desc) > 20:
            out["description_en"] = desc
    return out


def translate_id(text_en: str, cache: dict) -> str | None:
    """Translate EN->ID via MyMemory (free, no key). Cached by text hash."""
    key = hashlib.sha1(text_en.encode("utf-8")).hexdigest()[:16]
    if key in cache:
        return cache[key]["id"]

    # MyMemory anonymous: ~500 chars per query, 5000 chars/day.
    # Chunk on sentence boundaries; cache makes this progressive.
    import urllib.parse
    sentences = re.split(r"(?<=[.!?])\s+", text_en)
    chunks, cur = [], ""
    for s in sentences:
        if len(cur) + len(s) + 1 > 400:
            chunks.append(cur)
            cur = s
        else:
            cur = (cur + " " + s).strip() if cur else s
    if cur:
        chunks.append(cur)

    out_parts = []
    try:
        for c in chunks:
            q = urllib.parse.quote(c)
            url = ("https://api.mymemory.translated.net/get"
                   f"?q={q}&langpair=en|id")
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if str(data.get("responseStatus")) != "200":
                raise RuntimeError(f"MyMemory status {data.get('responseStatus')}: "
                                   f"{data.get('responseDetails')}")
            translated = data["responseData"]["translatedText"]
            # MyMemory sometimes returns the query back or "MYMEMORY WARNING"
            if "MYMEMORY WARNING" in translated or not translated.strip():
                raise RuntimeError("MyMemory warning/empty")
            out_parts.append(translated)
            time.sleep(1.0)  # be nice to the free API
    except Exception as e:
        print(f"  translate failed: {e}", file=sys.stderr)
        return None

    translated = " ".join(out_parts)
    cache[key] = {"en": text_en[:500], "id": translated,
                  "translatedAt": time.strftime("%Y-%m-%d")}
    return translated


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--retry-blocked", action="store_true")
    args = ap.parse_args()

    if not ARCHIVE_JSON.exists():
        print("kki-archive.json not found — run build_archive.py first",
              file=sys.stderr)
        sys.exit(1)

    archive = json.load(open(ARCHIVE_JSON, encoding="utf-8"))
    cache = json.load(open(TRANSLATION_CACHE, encoding="utf-8")) \
        if TRANSLATION_CACHE.exists() else {}

    pending = []
    for e in archive:
        mu = e.get("mu", {})
        status = mu.get("status")
        if not e.get("mangaupdatesUrl"):
            continue
        if status == "ok":
            continue
        if status == "blocked" and not args.retry_blocked:
            continue
        pending.append(e)

    if args.limit:
        pending = pending[:args.limit]
    elif not args.all:
        print(f"{len(pending)} pending. Use --limit N or --all.", file=sys.stderr)
        sys.exit(2)

    print(f"enriching {len(pending)} entries...")
    ok = blocked = failed = 0
    for i, e in enumerate(pending):
        url = e["mangaupdatesUrl"]
        print(f"[{i+1}/{len(pending)}] {e['title'][:50]}")
        html = fetch(url)
        if html == "BLOCKED":
            e["mu"] = {"status": "blocked", "fetchedAt": time.strftime("%Y-%m-%d")}
            blocked += 1
            print("  -> 429 blocked, marked for retry")
        elif not html:
            e["mu"] = {"status": "fetch-failed", "fetchedAt": time.strftime("%Y-%m-%d")}
            failed += 1
            print("  -> fetch failed")
        else:
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
            print(f"  -> cover={'yes' if parsed['cover'] else 'no'}, "
                  f"desc={'yes' if parsed['description_en'] else 'no'}")
        time.sleep(DELAY_S)

    json.dump(archive, open(ARCHIVE_JSON, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump(cache, open(TRANSLATION_CACHE, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"done: ok={ok} blocked={blocked} failed={failed}")
    print(f"translation cache entries: {len(cache)}")


if __name__ == "__main__":
    main()
