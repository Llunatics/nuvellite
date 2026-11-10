#!/usr/bin/env python3
"""
Offline catalog repair — applies the recurring pipeline's consistency steps
(legacy sweep + volume/series re-parse, franchise separation + aliases,
duplicate-listing merge, edition consolidation, series reconstruction, and
orphan snapshot pruning) to the existing catalog.json WITHOUT touching the network.
"""

import sys as _sys

# Round 2 S6.2 guard: this script's re-grouping is LOSSY and damages bind-up
# groupings (Naruto, Classroom of the Elite, Detective Conan movies, Bungo
# Stray Dogs). It is disabled permanently; catalog fixes go through the
# sync pipeline's consistency steps instead.
_sys.exit("FORBIDDEN: repair-catalog.py is disabled to protect bind-up groupings")

import argparse
import json
import os
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import importlib.util
_spec = importlib.util.spec_from_file_location(
    "auto_sync_catalog", os.path.join(SCRIPT_DIR, "auto-sync-catalog.py"))
_sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_sync)

_split_spec = importlib.util.spec_from_file_location(
    "split_catalog", os.path.join(SCRIPT_DIR, "split-catalog.py"))
_split_mod = importlib.util.module_from_spec(_split_spec)
_split_spec.loader.exec_module(_split_mod)
split_catalog = _split_mod.split_catalog


def main():
    parser = argparse.ArgumentParser(description="Offline catalog consistency repair")
    parser.add_argument("--catalog", default=os.path.join(SCRIPT_DIR, "..", "src", "data", "catalog.json"))
    parser.add_argument("--no-backup", action="store_true", help="Skip timestamped backup of catalog.json")
    args = parser.parse_args()

    catalog_path = os.path.abspath(args.catalog)
    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    if not args.no_backup:
        backup_path = f"{catalog_path}.bak-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        shutil.copy2(catalog_path, backup_path)
        print(f"[backup] {backup_path}")

    all_books = catalog.get("books", [])
    existing_series_map = {s["id"]: s for s in catalog.get("series", [])}
    price_snapshot_map = defaultdict(list)
    for s in catalog.get("priceSnapshots", []):
        price_snapshot_map[s.get("bookId")].append(s)

    print(f"[repair] books in: {len(all_books)}, series in: {len(existing_series_map)}")

    all_books, purged_ids = _sync.sweep_legacy_books(all_books)
    _sync.apply_franchise_separation(all_books)
    all_books, dupes_merged = _sync.merge_duplicate_listings(all_books, price_snapshot_map)
    all_books = _sync.consolidate_editions(all_books, price_snapshot_map)
    new_series_list = _sync.reconstruct_series(all_books, existing_series_map)

    surviving_book_ids = {b["id"] for b in all_books}
    clean_snapshots = [
        snap for bid, snaps in price_snapshot_map.items()
        if bid in surviving_book_ids
        for snap in snaps
    ]

    catalog["books"] = all_books
    catalog["series"] = new_series_list
    catalog["priceSnapshots"] = clean_snapshots
    catalog["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print(f"[repair] books out: {len(all_books)} (purged: {len(purged_ids)}), "
          f"series out: {len(new_series_list)}, duplicate listings merged: {dupes_merged}, "
          f"snapshots kept: {len(clean_snapshots)}")

    split_catalog()
    print("[repair] done — run `npx vitest run` to verify")


if __name__ == "__main__":
    main()