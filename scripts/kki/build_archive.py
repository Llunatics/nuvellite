#!/usr/bin/env python3
"""
Build the KKI archive catalog: src/data/kki-archive.json.
Preserves MU enrichment and Pranala covers across rebuilds using both entry_id
and a fallback (medium, normalized_title) key so slug shifts never orphan data.
Also sanitizes mangaupdatesUrl and pranala fields.
"""

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
KKI_DIR = REPO / "scripts" / "kki"
DATA_DIR = REPO / "src" / "data"
sys.path.insert(0, str(KKI_DIR))
from url_utils import sanitize_http_url, sanitize_mu_url


def slugify(title: str) -> str:
    s = title.lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    return s[:80] or "tanpa-judul"


def norm_key(medium: str, title: str) -> str:
    return f"{medium}::{slugify(title)}"


def main():
    unmatched_path = KKI_DIR / "kki-unmatched.json"
    if not unmatched_path.exists():
        raise SystemExit("run match_kki.py first (kki-unmatched.json missing)")

    unmatched = json.load(open(unmatched_path, encoding="utf-8"))

    old_mu = {}
    old_pranala = {}
    archive_path = DATA_DIR / "kki-archive.json"
    if archive_path.exists():
        for e in json.load(open(archive_path, encoding="utf-8")):
            nk = norm_key(e.get("medium", "MANGA"), e.get("title", ""))
            if e.get("mu"):
                old_mu[e["id"]] = e["mu"]
                old_mu[nk] = e["mu"]
            if e.get("pranalaCover") or e.get("pranalaStatus"):
                pdata = (
                    e.get("pranalaCover"),
                    e.get("pranalaCoverSource"),
                    e.get("pranalaStatus"),
                )
                old_pranala[e["id"]] = pdata
                old_pranala[nk] = pdata

    seen_slugs = set()
    archive = []
    for r in unmatched:
        title = r["title"].strip()
        medium = "LIGHT_NOVEL" if r["medium"] == "LIGHT_NOVEL" else "MANGA"
        base_slug = slugify(title)
        slug = base_slug
        if slug in seen_slugs and medium == "LIGHT_NOVEL" and f"{base_slug}-ln" not in seen_slugs:
            slug = f"{base_slug}-ln"
        n = 2
        while slug in seen_slugs:
            slug = f"{base_slug}-{n}"
            n += 1
        seen_slugs.add(slug)

        entry_id = f"kki_{slug}"
        nk = norm_key(medium, title)
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
            "mangaupdatesUrl": sanitize_mu_url(r.get("mangaupdates_url")),
            "pranala": sanitize_http_url(r.get("pranala")),
            "notes": r["notes"] or None,
        }
        mu_val = old_mu.get(entry_id) or old_mu.get(nk)
        if mu_val:
            entry["mu"] = mu_val
        pr_val = old_pranala.get(entry_id) or old_pranala.get(nk)
        if pr_val:
            cov, src, st = pr_val
            if cov:
                entry["pranalaCover"] = cov
                entry["pranalaCoverSource"] = src
            if st:
                entry["pranalaStatus"] = st
        archive.append(entry)

    archive.sort(key=lambda e: e["title"].lower())

    with open(archive_path, "w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False, indent=1)

    with_mu = sum(1 for e in archive if e.get("mu", {}).get("status") == "ok")
    with_pr = sum(1 for e in archive if e.get("pranalaCover"))
    print(f"archive entries: {len(archive)} (MU ok: {with_mu}, Pranala cover: {with_pr})")


if __name__ == "__main__":
    main()