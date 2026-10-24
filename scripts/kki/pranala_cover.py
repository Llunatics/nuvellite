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

Network policy (2026-10-24 upgrade): the old serial 1s-delay loop only
managed ~30 entries per sync, which is why 950+ pranala entries sat
unfetched for weeks. Now 12 workers with a 0.3s stagger, plus one retry
for transient disconnects (mncgramedia.id drops connections often —
a single attempt marked many live pages as MISS). Dead pages (no
og:image, or the default placeholder image) still count as MISS.
Incremental: only processes entries without a cover.

Usage:
  python3 pranala_cover.py --limit 50   # process first 50 pending entries
  python3 pranala_cover.py --all        # process all pending entries
"""

import argparse
import json
import re
import sys
import threading
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
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


def fetch_og_image(url: str, timeout: int = 12) -> str | None:
    # One retry: mncgramedia.id frequently closes the connection on the
    # first attempt ("RemoteDisconnected") while the page itself is fine.
    for attempt in range(2):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                # follow redirects automatically; only accept HTML
                ctype = resp.headers.get("Content-Type", "")
                if "html" not in ctype:
                    return None
                html = resp.read(300_000).decode("utf-8", "ignore")
                break
        except Exception:
            if attempt == 1:
                return None
            time.sleep(2)
            continue
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
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--timeout", type=int, default=12,
                    help="Seconds per page fetch. og:image lives in <head>, "
                         "so a page that hasn't responded in 12s is dead "
                         "for our purposes; waiting 20s+ per dead page is "
                         "what made the old backlog take hours.")
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

    save_lock = threading.Lock()
    counter = {"n": 0, "ok": 0}

    def save():
        with save_lock:
            with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
                json.dump(entries, f, ensure_ascii=False, indent=1)

    def work(e):
        url = e["pranala"].strip()
        cover = fetch_og_image(url, timeout=args.timeout)
        if cover:
            e["pranalaCover"] = cover
            e["pranalaCoverSource"] = url
            counter["ok"] += 1
            print(f"  OK  {e['title'][:50]}", flush=True)
        else:
            print(f"  MISS {e['title'][:50]}", flush=True)
        counter["n"] += 1
        # save progress incrementally so kills/interrupts don't lose work
        if counter["n"] % 25 == 0:
            save()
            print(f"  ... {counter['n']}/{len(pending)} "
                  f"(ok={counter['ok']})", flush=True)
        time.sleep(0.3)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(work, pending))

    save()
    print(f"done: {counter['ok']}/{len(pending)} covers fetched")


if __name__ == "__main__":
    main()
