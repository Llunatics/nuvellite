#!/usr/bin/env python3
"""
Cover-only MangaUpdates bulk fetch for KKI archive entries.

Fixes:
1. Validates URLs via sanitize_mu_url() and puts urllib.request.Request inside try/except.
2. Skips entries already marked "blocked", "fetch-failed", "parse-empty", or "invalid-url"
   unless --retry-blocked is passed.
3. Exits with code 0 on 429 circuit-break (logging a warning) so sync-kki.py
   always proceeds to pranala_cover.py.
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
KKI_DIR = REPO / "scripts" / "kki"
ARCHIVE_JSON = REPO / "src" / "data" / "kki-archive.json"

sys.path.insert(0, str(KKI_DIR))
from url_utils import sanitize_mu_url

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

IMG_RE = re.compile(r'<img[^>]+src="(https://cdn\.mangaupdates\.com[^"]+)"')
IMG_ANY_RE = re.compile(r'(https://cdn\.mangaupdates\.com/image[s]?/[^"\\\s]+)')

stop_event = threading.Event()
save_lock = threading.Lock()


def fetch_cover(url: str, timeout: int = 25) -> str | None:
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        })
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
    ap.add_argument("--retry-blocked", action="store_true")
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--delay", type=float, default=3.0)
    args = ap.parse_args()

    entries = json.load(open(ARCHIVE_JSON, encoding="utf-8"))

    def effective_cover(e):
        mu = e.get("mu") or {}
        return mu.get("cover") or e.get("pranalaCover")

    pending = []
    for e in entries:
        clean_url = sanitize_mu_url(e.get("mangaupdatesUrl"))
        if not clean_url:
            if e.get("mangaupdatesUrl"):
                e["mangaupdatesUrl"] = None
            continue
        e["mangaupdatesUrl"] = clean_url
        if effective_cover(e):
            continue
        status = (e.get("mu") or {}).get("status")
        if status in ("fetch-failed", "parse-empty", "invalid-url"):
            continue
        if status == "blocked" and not args.retry_blocked:
            continue
        pending.append(e)

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
        url = e["mangaupdatesUrl"]
        cover = fetch_cover(url)
        if cover == "BLOCKED":
            stop_event.set()
            e["mu"] = {"status": "blocked", "fetchedAt": time.strftime("%Y-%m-%d")}
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
        if counter["n"] % 20 == 0:
            save()
            print(f"  ... {counter['n']}/{len(pending)} (ok={done['ok']} miss={done['miss']})", flush=True)
        time.sleep(args.delay)

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(work, pending))
    save()
    print(f"done: ok={done['ok']} miss={done['miss']} blocked={done['blocked']} of {len(pending)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())