#!/usr/bin/env python3
"""
Build the KKI archive catalog: src/data/kki-archive.json.

Archive = KKI series with NO counterpart in Nuvellite (from
kki-unmatched.json produced by match_kki.py). These are mostly old /
out-of-print series that never appear on gramedia.com.

Each entry carries series-level data straight from the KKI sheets plus an
optional `mu` block filled later by mu_enrich.py (cover, EN description,
ID translation). Entries without MU data still render fine.

Output is deterministic (sorted by title) so the file diffs cleanly.
"""

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DATA_DIR = REPO / "src" / "data"


def slugify(title: str) -> str:
    s = title.lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    return s[:80] or "tanpa-judul"


def main():
    unmatched_path = KKI_DIR / "kki-unmatched.json"
    if not unmatched_path.exists():
        raise SystemExit("run match_kki.py first (kki-unmatched.json missing)")

    unmatched = json.load(open(unmatched_path, encoding="utf-8"))

    # keep existing MU enrichment AND pranala covers across rebuilds.
    # BUG fixed 2026-10-24: pranalaCover was NOT preserved here, so every
    # Tue/Fri sync wiped all publisher-store covers, and the incremental
    # pranala run (30/run) could never accumulate — the real reason
    # archive covers stayed blank for weeks despite "successful" syncs.
    old_mu = {}
    old_pranala = {}
    archive_path = DATA_DIR / "kki-archive.json"
    if archive_path.exists():
        for e in json.load(open(archive_path, encoding="utf-8")):
            if e.get("mu"):
                old_mu[e["id"]] = e["mu"]
            if e.get("pranalaCover"):
                old_pranala[e["id"]] = (
                    e["pranalaCover"], e.get("pranalaCoverSource"))

    seen_slugs = set()
    archive = []
    for r in unmatched:
        title = r["title"].strip()
        base_slug = slugify(title)
        slug = base_slug
        n = 2
        while slug in seen_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        seen_slugs.add(slug)

        medium = "LIGHT_NOVEL" if r["medium"] == "LIGHT_NOVEL" else "MANGA"
        entry_id = f"kki_{slug}"
        entry = {
            "id": entry_id,
            "slug": slug,
            "title": title,
            "author": r["author"] or None,
            "illustrator": r.get("illustrator") or None,
            "medium": medium,
            "demographic": r["demographic"] or None,
            "volumesId": r["volumes_id"] or None,
            "statusId": r["status_id"] or None,
            "publisherId": r["publisher_id"] or None,
            "yearFirstVol": r["year_first_vol"] or None,
            "priceMin": r["price_min"] or None,
            "priceMax": r["price_max"] or None,
            "paperType": r["paper_type"] or None,
            "volumesJp": r["volumes_jp"] or None,
            "statusJp": r["status_jp"] or None,
            "publisherJp": r["publisher_jp"] or None,
            "mangaupdatesUrl": r["mangaupdates_url"] or None,
            "pranala": r.get("pranala") or None,
            "notes": r["notes"] or None,
        }
        if entry_id in old_mu:
            entry["mu"] = old_mu[entry_id]
        if entry_id in old_pranala:
            entry["pranalaCover"], entry["pranalaCoverSource"] = old_pranala[entry_id]
        archive.append(entry)

    archive.sort(key=lambda e: e["title"].lower())

    with open(archive_path, "w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False, indent=1)

    with_mu = sum(1 for e in archive if e.get("mu", {}).get("status") == "ok")
    print(f"archive entries: {len(archive)} (with MU data: {with_mu})")


if __name__ == "__main__":
    main()
