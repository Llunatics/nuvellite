#!/usr/bin/env python3
"""
Pranala cover fallback for KKI archive entries.

MangaUpdates is persistently rate-limiting this network (HTTP 429), so this
script provides an alternative cover source: the "Pranala" column in the KKI
sheets, which links to publisher store pages (mncgramedia.id,
phoenixgramedia.id, etc.). Those pages carry an og:image meta tag with the
book cover, reachable from this network (verified 2026-10-12, ~88% hit rate).

For each archive entry that has a `pranala` URL but no cover yet (neither MU
cover nor pranalaCover), fetch the page and extract og:image. Results are
written back into kki-archive.json as `pranalaCover` (preserved across
rebuilds like the MU block).

Network policy: 1s delay between requests, browser-like UA, graceful skip
on any error. Incremental: only processes entries without a cover.

Usage:
  python3 pranala_cover.py --limit 50   # process first 50 pending entries
  python3 pranala_cover.py --all        # process all pending entries
"""

import argparse
import json
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA_DIR = REPO / "src" / "data"
ARCHIVE_JSON = DATA_DIR / "kki-archive.json"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
DELAY_S = 1.0

OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', re.I)
OG_IMAGE_RE_ALT = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I)


def fetch_og_image(url: str, timeout: int = 20) -> str | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            # follow redirects automatically; only accept HTML
            ctype = resp.headers.get("Content-Type", "")
            if "html" not in ctype:
                return None
            html = resp.read(300_000).decode("utf-8", "ignore")
    except Exception:
        return None
    m = OG_IMAGE_RE.search(html) or OG_IMAGE_RE_ALT.search(html)
    if not m:
        return None
    img = m.group(1).strip()
    # filter out logos / placeholders
    low = img.lower()
    if any(x in low for x in ("logo", "default", "placeholder", "icon", "banner")):
        return None
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    entries = json.load(open(ARCHIVE_JSON, encoding="utf-8"))
    pending = [
        e for e in entries
        if (e.get("pranala") or "").strip()
        and not (e.get("mu") or {}).get("cover")
        and not e.get("pranalaCover")
    ]
    if not args.all:
        pending = pending[: args.limit]
    print(f"pending entries with pranala: {len(pending)}")

    done = 0
    for i, e in enumerate(pending):
        url = e["pranala"].strip()
        cover = fetch_og_image(url)
        if cover:
            e["pranalaCover"] = cover
            e["pranalaCoverSource"] = url
            done += 1
            print(f"  OK  {e['title'][:50]}", flush=True)
        else:
            print(f"  MISS {e['title'][:50]}", flush=True)
        # save progress incrementally so kills/interrupts don't lose work
        if (i + 1) % 10 == 0:
            with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
                json.dump(entries, f, ensure_ascii=False, indent=1)
        time.sleep(DELAY_S)

    with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)
    print(f"done: {done}/{len(pending)} covers fetched")


if __name__ == "__main__":
    main()
