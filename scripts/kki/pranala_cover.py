#!/usr/bin/env python3
"""
Pranala cover fallback for KKI archive entries.

Fixes:
1. Validates URLs via sanitize_http_url() and puts Request inside try/except.
2. Records pranalaStatus = "ok" | "miss" | "invalid-url" on each entry so
   dead publisher store URLs are not re-fetched on every sync run.
"""

import argparse
import json
import re
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DATA_DIR = REPO / "src" / "data"
ARCHIVE_JSON = DATA_DIR / "kki-archive.json"

sys.path.insert(0, str(KKI_DIR))
from url_utils import sanitize_http_url

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', re.I)
OG_IMAGE_RE_ALT = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I)


def fetch_og_image(url: str, timeout: int = 12) -> str | None:
    html = ""
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                ctype = resp.headers.get("Content-Type", "")
                if "html" not in ctype.lower():
                    return None
                html = resp.read(300_000).decode("utf-8", "ignore")
                break
        except Exception:
            if attempt == 1:
                return None
            time.sleep(1.5)
    if not html:
        return None
    m = OG_IMAGE_RE.search(html) or OG_IMAGE_RE_ALT.search(html)
    if not m:
        return None
    img = m.group(1).strip()
    low = img.lower()
    if any(x in low for x in ("logo", "default", "placeholder", "icon", "banner")):
        return None
    return sanitize_http_url(img)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--retry-miss", action="store_true")
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--timeout", type=int, default=12)
    args = ap.parse_args()

    entries = json.load(open(ARCHIVE_JSON, encoding="utf-8"))
    pending = []
    for e in entries:
        if (e.get("mu") or {}).get("cover") or e.get("pranalaCover"):
            continue
        raw_pr = e.get("pranala")
        if not raw_pr:
            continue
        clean_pr = sanitize_http_url(raw_pr)
        if not clean_pr:
            e["pranala"] = None
            e["pranalaStatus"] = "invalid-url"
            continue
        e["pranala"] = clean_pr
        if e.get("pranalaStatus") in ("miss", "invalid-url") and not args.retry_miss:
            continue
        pending.append(e)

    if not args.all:
        pending = pending[: args.limit]
    print(f"pending entries with pranala: {len(pending)}")
    if not pending:
        return 0

    save_lock = threading.Lock()
    counter = {"n": 0, "ok": 0}

    def save():
        with save_lock:
            with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
                json.dump(entries, f, ensure_ascii=False, indent=1)

    def work(e):
        url = e["pranala"]
        cover = fetch_og_image(url, timeout=args.timeout)
        if cover:
            e["pranalaCover"] = cover
            e["pranalaCoverSource"] = url
            e["pranalaStatus"] = "ok"
            counter["ok"] += 1
            print(f"  OK   {e['title'][:50]}", flush=True)
        else:
            e["pranalaStatus"] = "miss"
            print(f"  MISS {e['title'][:50]}", flush=True)
        counter["n"] += 1
        if counter["n"] % 25 == 0:
            save()
            print(f"  ... {counter['n']}/{len(pending)} (ok={counter['ok']})", flush=True)
        time.sleep(0.3)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(work, pending))

    save()
    print(f"done: {counter['ok']}/{len(pending)} covers fetched")
    return 0


if __name__ == "__main__":
    sys.exit(main())