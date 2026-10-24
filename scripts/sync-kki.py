#!/usr/bin/env python3
"""
KKI sync orchestrator — idempotent, safe to re-run.

Pipeline:
  1. Download fresh CSVs from the KKI Google Sheets
     (gid 1781960306 = manga, gid 640933522 = light novel)
  2. match_kki.py      -> kki-enrichment.json + review queue + unmatched
  3. build_archive.py  -> kki-archive.json (preserves existing MU data)
  4. mu_enrich.py      -> MU cover/description/translation for NEW entries
                         only (skips already-enriched; graceful on 429)

Usage:
  python3 scripts/sync-kki.py                 # full sync, MU enrich all new
  python3 scripts/sync-kki.py --skip-mu       # data only, no MU scraping
  python3 scripts/sync-kki.py --mu-limit 20   # MU enrich at most 20 new entries
  python3 scripts/sync-kki.py --retry-blocked # also retry MU-blocked entries

After sync, rebuild the Next.js site to pick up the new JSON data.
MU enrichment is intentionally incremental: translation APIs are
rate-limited, so each run tops up the cache (kki-translations.json).
"""

import argparse
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
KKI_DIR = REPO / "scripts" / "kki"
SHEET_ID = "1eFyeZl-wscG0NcXSbdS4-f1vFf8u3uALZSWJMUT6n4E"
GIDS = {"kki-manga.csv": "1781960306", "kki-ln.csv": "640933522"}


def download_csvs():
    KKI_DIR.mkdir(parents=True, exist_ok=True)
    for fname, gid in GIDS.items():
        url = (f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
               f"/export?format=csv&gid={gid}")
        print(f"downloading {fname} ...")
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        (KKI_DIR / fname).write_bytes(data)
        print(f"  {len(data)//1024} KB")


def run_step(name: str, *args: str):
    print(f"\n=== {name} ===")
    r = subprocess.run([sys.executable, *args], cwd=REPO)
    if r.returncode != 0:
        raise SystemExit(f"step failed: {name} (exit {r.returncode})")


def main():
    ap = argparse.ArgumentParser(description="Sync KKI database into Nuvellite")
    ap.add_argument("--skip-mu", action="store_true",
                    help="skip MangaUpdates enrichment")
    ap.add_argument("--mu-limit", type=int, default=0,
                    help="max new MU entries to enrich (0 = all new)")
    ap.add_argument("--retry-blocked", action="store_true",
                    help="retry MU entries previously marked blocked")
    args = ap.parse_args()

    download_csvs()
    run_step("match KKI <-> Nuvellite", str(KKI_DIR / "match_kki.py"))
    run_step("build archive", str(KKI_DIR / "build_archive.py"))

    if not args.skip_mu:
        mu_args = [str(KKI_DIR / "mu_enrich.py")]
        if args.mu_limit:
            mu_args += ["--limit", str(args.mu_limit)]
        else:
            mu_args += ["--all"]
        if args.retry_blocked:
            mu_args += ["--retry-blocked"]
        run_step("MU enrichment (incremental)", *mu_args)

    # Cover-only MU bulk fetch (no translation bottleneck): mu_enrich.py
    # also translates descriptions via MyMemory and is therefore capped
    # at ~30/run, while cover fetching alone is fast. Ultra-polite
    # (1 worker, 3s delay) because MangaUpdates 429-blocks this network
    # on bursts; on 429 the script stops gracefully and retries next run.
    if not args.skip_mu:
        mu_cover_args = [str(KKI_DIR / "mu_cover_bulk.py"),
                         "--workers", "1", "--delay", "3"]
        if args.mu_limit:
            mu_cover_args += ["--limit", str(args.mu_limit)]
        else:
            mu_cover_args += ["--limit", "150"]
        run_step("MU cover-only bulk fetch (polite)", *mu_cover_args)

    # Pranala og:image cover fallback (incremental). Runs even when
    # --skip-mu: publisher store pages are reachable from this network.
    # --all is deliberate: the backlog (950+ entries) is what kept covers
    # blank for weeks; once it is drained, later runs are incremental
    # (only new entries) and fast. build_archive.py now preserves
    # pranalaCover across rebuilds, so results finally accumulate.
    pranala_args = [str(KKI_DIR / "pranala_cover.py"), "--all"]
    run_step("Pranala cover fallback (incremental)", *pranala_args)

    print("\nSync complete. Rebuild the site (npm run build) to apply.")
    print("Review queue: scripts/kki/kki-review-queue.json")


if __name__ == "__main__":
    main()
