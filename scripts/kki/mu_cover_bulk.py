#!/usr/bin/env python3
"""Cover-only MangaUpdates bulk fetch for KKI archive entries.

Why this exists (2026-10-24): 2601/2626 archive series had no cover.
The existing mu_enrich.py fetches the cover AND translates the
description via MyMemory (rate-limited, ~5000 chars/day) and runs only
--limit 30 per sync, so cover fetching was starved for weeks. This
script does cover ONLY: no translation, no MyMemory, polite concurrency.

Sources, in order, are handled by the caller (kki-service.ts):
  mu.cover (this script) -> pranalaCover -> typographic fallback UI.

Network policy: 6 workers, ~0.4s stagger per worker, browser-like UA.
On HTTP 429 the run stops gracefully (progress already saved) instead
of hammering MangaUpdates into a longer block.

Usage:
  python3 mu_cover_bulk.py --limit 20   # trial run
  python3 mu_cover_bulk.py --all        # all pending entries
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
ARCHIVE_JSON = REPO / "src" / "data" / "kki-archive.json"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

IMG_RE = re.compile(r'<img[^>]+src="(https://cdn\.mangaupdates\.com[^"]+)"')
IMG_ANY_RE = re.compile(r'(https://cdn\.mangaupdates\.com/image/[^"\\\s]+)')

stop_event = threading.Event()
save_lock = threading.Lock()


def fetch_cover(url: str, timeout: int = 25) -> str | None:
    """Return the MU cover URL, 'BLOCKED' on 429, or None."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                return None
            html = resp.read(400_000).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        if e.code == 429:
            return "BLOCKED"
        return None
    except Exception:
        return None
    m = IMG_RE.search(html) or IMG_ANY_RE.search(html)
    return m.group(1) if m else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--delay", type=float, default=0.4,
                    help="Seconds each worker sleeps between fetches. "
                         "MangaUpdates 429-blocks this network on bursts, "
                         "so scheduled runs should use --workers 1 --delay 3.")
    args = ap.parse_args()

    entries = json.load(open(ARCHIVE_JSON, encoding="utf-8"))

    def effective_cover(e):
        mu = e.get("mu") or {}
        return mu.get("cover") or e.get("pranalaCover")

    pending = [e for e in entries
               if (e.get("mangaupdatesUrl") or "").strip()
               and not effective_cover(e)]
    if not args.all and args.limit:
        pending = pending[: args.limit]
    print(f"pending MU-cover entries: {len(pending)}", flush=True)
    if not pending:
        return 0

    done = {"ok": 0, "miss": 0, "blocked": 0}
    counter = {"n": 0}

    def save():
        with save_lock:
            with open(ARCHIVE_JSON, "w", encoding="utf-8") as f:
                json.dump(entries, f, ensure_ascii=False, indent=1)

    def work(e):
        if stop_event.is_set():
            return
        url = e["mangaupdatesUrl"].strip()
        cover = fetch_cover(url)
        if cover == "BLOCKED":
            stop_event.set()
            done["blocked"] += 1
            print("  !! 429 from MangaUpdates — stopping gracefully", flush=True)
            return
        mu = e.setdefault("mu", {})
        if cover:
            mu["cover"] = cover
            mu["status"] = "ok"
            done["ok"] += 1
        else:
            mu["status"] = mu.get("status") or "fetch-failed"
            done["miss"] += 1
        mu["fetchedAt"] = time.strftime("%Y-%m-%d")
        counter["n"] += 1
        if counter["n"] % 25 == 0:
            save()
            print(f"  ... {counter['n']}/{len(pending)} "
                  f"(ok={done['ok']} miss={done['miss']})", flush=True)
        time.sleep(args.delay)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(work, pending))
    save()
    print(f"done: ok={done['ok']} miss={done['miss']} "
          f"blocked={done['blocked']} of {len(pending)}", flush=True)
    return 0 if not stop_event.is_set() else 2


if __name__ == "__main__":
    sys.exit(main())
