#!/usr/bin/env python3
"""
Catalog consistency audit & fix (2026-10-12).

Fixes:
1. Purge junk books (bundling SKUs, satuan placeholders, merchandise, paket junk)
2. Merge duplicate/fragmented series into canonical series
3. Deduplicate books (same series + volume)
4. Validate prices (currentPrice <= originalPrice, sane discount ranges)

Usage:
    python3 scripts/audit-consistency.py --dry-run   # report only
    python3 scripts/audit-consistency.py --apply      # modify src/data/catalog.json

The script operates on src/data/catalog.json (source of truth), then
run scripts/split-catalog.py to regenerate catalog-listing.json.
"""

import json
import re
import sys
import copy
from collections import defaultdict

CATALOG_PATH = 'src/data/catalog.json'

# ---------------------------------------------------------------------------
# Series name normalization (mirrors src/lib/series-consistency.ts)
# ---------------------------------------------------------------------------

def normalize_series_name(name: str) -> str:
    """Canonical normalization for duplicate detection."""
    n = (name or '').lower()
    # Strip publisher prefixes
    n = re.sub(r'^(light novel|level comic|komik|akasha|lc)\s*:\s*', '', n)
    n = re.sub(r'^\(lc\)\s*', '', n)
    # Strip edition markers
    n = re.sub(r'\s*\(\s*omnibus\s*\)\s*', ' ', n)
    n = re.sub(r'\s*\bbind[\s-]?up\b', ' ', n)
    n = re.sub(r'\s*\bomnibus\b', ' ', n)
    n = re.sub(r'\s*\bcomplete\s+edition\b', ' ', n)
    n = re.sub(r'\s*\bedisi\s+koleksi\b', ' ', n)
    n = re.sub(r'\s*\b[2-9]\s*in\s*1\b', ' ', n)
    # Remove all punctuation
    n = re.sub(r'[^a-z0-9\s]', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n


def titles_match(a: str, b: str) -> bool:
    """Fuzzy title match for duplicate book detection."""
    na = re.sub(r'[^a-z0-9]', '', (a or '').lower())
    nb = re.sub(r'[^a-z0-9]', '', (b or '').lower())
    return na == nb and len(na) > 5


# ---------------------------------------------------------------------------
# Verified merge groups: (canonical_series_id, [source_series_ids...])
# Each group was manually verified 2026-10-12. Canonical = most books / cleanest name.
# ---------------------------------------------------------------------------

MERGE_GROUPS = [
    # Bungo Stray Dogs BEAST: exact duplicate (vols 1,4 overlap)
    ('ser_bungo-stray-dogs-beast',
     ['ser_bungo-stray-dogs---beast']),
    # Gokushufudo: 4 fragments of the same Elex/Level Comic series
    ('ser_gokushufudo',
     ['ser_gokushufudo---the-way-of-house-husband',
      'ser_gokushufudo---the-way-of-househusband',
      'ser_gokushufudou---the-way-of-house-husband']),
    # Kung Fu Boy Legends: 3 fragments ('Leg' is truncated 'Legend')
    ('ser_kung-fu-boy-legends',
     ['ser_kung-fu-boy-leg', 'ser_kung-fu-boy-legend']),
    # Kindaichi 37 Tahun: same series
    ('ser_kindaichi-37-tahun',
     ['ser_kindaichi-37']),
    # Haikyu!!: all books titled 'Haikyu!!: Fly High! Volleyball! NN'
    ('ser_haikyu-fly-high-volleyball',
     ['ser_haikyu']),
    # Detektif Conan The Movie: same movie adaptation series
    ('ser_detektif-conan-the',
     ['ser_detektif-conan-movie']),
    # Shiboyugi: vol 2 duplicated across both
    ('ser_shiboyugi-menantang-permainan-maut-demi-sesuap-nasi',
     ['ser_shiboyugi']),
    # Jurnal Mukai Usagido: '6 of 8' is vol 6 (misparsed as vol 8)
    ('ser_jurnal-mukai-usagido',
     ['ser_jurnal-mukai-usagido-6-of']),
]

# Series whose books are duplicates of another series -> delete series + books
DELETE_SERIES = [
    # 'I Sold My Life ... 01/02/03 Of' are dupes of vols 1-3 in main series
    'ser_i-sold-my-life-for-ten-thousand-yen-per-year-01-of',
    'ser_i-sold-my-life-for-ten-thousand-yen-per-year-02-of',
    'ser_i-sold-my-life-for-ten-thousand-yen-per-year-03-of',
]

# Canonical series renames (bad extracted names)
SERIES_RENAMES = {
    'ser_mob-psycho': 'Mob Psycho 100 - Reigen',  # spin-off, was truncated
}

# Volume fixes: {book_id: correct_volume}
VOLUME_FIXES = {
    # 'Jurnal Mukai Usagido 6 of 8' = vol 6, not vol 8
    # (resolved by book title match at runtime)
}

# ---------------------------------------------------------------------------
# Junk patterns (must match auto-sync-catalog.py classify_book)
# ---------------------------------------------------------------------------

def is_junk_book(book) -> str | None:
    """Return junk reason or None."""
    title = (book.get('title') or '')
    t_lower = title.lower().strip()
    authors = (book.get('author') or '')
    a_lower = authors.lower()

    if 'merchandise' in a_lower:
        return 'merchandise author'
    if t_lower in ('satuan', 'komik satuan'):
        return 'satuan placeholder'
    if t_lower.startswith('bundling'):
        return 'bundling SKU'
    if 'hunter hat' in t_lower and 'witch hat' not in t_lower:
        return 'hunter hat junk'
    # Paket/bundle products (not real series)
    if re.match(r'^paket(\s|$)', t_lower) and not re.search(r'\d+\s*-\s*\d+', t_lower):
        # 'Paket' alone or 'Paket X' without volume range = junk bundle listing
        if t_lower in ('paket',):
            return 'paket placeholder'
    return None


def main():
    dry_run = '--apply' not in sys.argv
    mode = 'DRY RUN' if dry_run else 'APPLY'
    print(f"=== Catalog Consistency Audit [{mode}] ===\n")

    with open(CATALOG_PATH) as f:
        catalog = json.load(f)

    books = catalog['books']
    # books may be dict or list
    if isinstance(books, dict):
        book_list = list(books.values())
        book_dict = books
    else:
        book_list = books
        book_dict = {b['id']: b for b in books}

    series_list = catalog['series']
    series_by_id = {s['id']: s for s in series_list}

    report = {
        'junk_purged': [],
        'series_merged': [],
        'series_deleted': [],
        'series_renamed': [],
        'books_deduped': [],
        'volumes_fixed': [],
        'prices_fixed': [],
    }

    # ---- 1. Purge junk books ----
    junk_ids = set()
    for b in book_list:
        reason = is_junk_book(b)
        if reason:
            junk_ids.add(b['id'])
            report['junk_purged'].append((b['id'], b.get('title'), reason))

    # ---- 2. Delete junk series (I Sold My Life Of variants) ----
    for sid in DELETE_SERIES:
        s = series_by_id.get(sid)
        if s:
            for b in book_list:
                if b.get('seriesId') == sid:
                    junk_ids.add(b['id'])
            report['series_deleted'].append((sid, s.get('name')))

    # ---- 3. Merge duplicate series ----
    merge_map = {}  # old_sid -> canonical_sid
    for canonical_sid, source_sids in MERGE_GROUPS:
        if canonical_sid not in series_by_id:
            print(f"WARNING: canonical {canonical_sid} not found, skipping group")
            continue
        for src_sid in source_sids:
            if src_sid not in series_by_id:
                print(f"WARNING: source {src_sid} not found, skipping")
                continue
            if src_sid == canonical_sid:
                continue
            merge_map[src_sid] = canonical_sid
            report['series_merged'].append(
                (src_sid, series_by_id[src_sid].get('name'),
                 canonical_sid, series_by_id[canonical_sid].get('name')))

    # ---- 4. Rename bad series names ----
    for sid, new_name in SERIES_RENAMES.items():
        if sid in series_by_id:
            old = series_by_id[sid]['name']
            if old != new_name:
                report['series_renamed'].append((sid, old, new_name))

    # ---- 5. Fix volumes (Jurnal Mukai Usagido 6 of 8) ----
    for b in book_list:
        t = (b.get('title') or '')
        if 'jurnal mukai usagido 6 of 8' in t.lower():
            if b.get('volume') != 6:
                report['volumes_fixed'].append((b['id'], t, b.get('volume'), 6))

    # ---- 6. Price validation ----
    for b in book_list:
        bid = b['id']
        if bid in junk_ids:
            continue
        cp = b.get('currentPrice') or b.get('price')
        op = b.get('originalPrice')
        # currentPrice should not exceed originalPrice
        if cp and op and cp > op:
            report['prices_fixed'].append((bid, b.get('title'), cp, op, 'swap'))
        # discount sanity: >90% off is suspicious (likely data error)
        if cp and op and op > 0:
            disc = (op - cp) / op
            if disc > 0.90:
                report['prices_fixed'].append(
                    (bid, b.get('title'), cp, op, f'{disc:.0%} off suspicious'))

    # ---- 7. Detect duplicate books within merged series ----
    # (same normalized title + same volume in same canonical series)
    if not dry_run:
        # Apply all changes
        # Remove junk books
        if isinstance(books, dict):
            for bid in junk_ids:
                books.pop(bid, None)
            book_list = list(books.values())
        else:
            catalog['books'] = [b for b in book_list if b['id'] not in junk_ids]
            book_list = catalog['books']

        # Remap series IDs
        for b in book_list:
            sid = b.get('seriesId')
            if sid in merge_map:
                b['seriesId'] = merge_map[sid]
                # Update seriesName to canonical
                canon = series_by_id[merge_map[sid]]
                b['seriesName'] = canon.get('name')

        # Fix volumes
        for b in book_list:
            t = (b.get('title') or '')
            if 'jurnal mukai usagido 6 of 8' in t.lower():
                b['volume'] = 6

        # Rename series
        for sid, new_name in SERIES_RENAMES.items():
            if sid in series_by_id:
                series_by_id[sid]['name'] = new_name

        # Deduplicate books: same canonical series + same volume + similar title
        seen = {}
        deduped = []
        for b in sorted(book_list, key=lambda x: x['id']):
            sid = b.get('seriesId') or ''
            vol = b.get('volume')
            key = (sid, vol, normalize_series_name(b.get('title') or '')[:40])
            if key in seen and vol is not None:
                # Keep the one with more complete data (prefer non-null price)
                existing = seen[key]
                e_score = sum(1 for k in ('currentPrice', 'coverImage', 'description')
                              if existing.get(k))
                b_score = sum(1 for k in ('currentPrice', 'coverImage', 'description')
                              if b.get(k))
                if b_score > e_score:
                    deduped.append((existing['id'], existing.get('title')))
                    seen[key] = b
                else:
                    deduped.append((b['id'], b.get('title')))
            else:
                seen[key] = b
        report['books_deduped'] = deduped
        keep_ids = set(b['id'] for b in seen.values())
        if isinstance(catalog['books'], dict):
            for bid in list(catalog['books'].keys()):
                if bid not in keep_ids:
                    del catalog['books'][bid]
        else:
            catalog['books'] = [b for b in catalog['books'] if b['id'] in keep_ids]

        # Fix prices (swap when currentPrice > originalPrice)
        for b in (catalog['books'].values() if isinstance(catalog['books'], dict)
                  else catalog['books']):
            cp = b.get('currentPrice') or b.get('price')
            op = b.get('originalPrice')
            if cp and op and cp > op:
                b['currentPrice'] = op
                b['originalPrice'] = cp
                if b.get('price'):
                    b['price'] = op

        # Remove merged/deleted series
        remove_sids = set(merge_map.keys()) | set(DELETE_SERIES)
        catalog['series'] = [s for s in catalog['series'] if s['id'] not in remove_sids]

        # Recalculate series stats
        series_books = defaultdict(list)
        final_books = (list(catalog['books'].values())
                       if isinstance(catalog['books'], dict) else catalog['books'])
        for b in final_books:
            if b.get('seriesId'):
                series_books[b['seriesId']].append(b)
        for s in catalog['series']:
            bs = series_books.get(s['id'], [])
            s['totalVolumes'] = len(bs)
            s['bookIds'] = [b['id'] for b in bs]

        # Write back
        with open(CATALOG_PATH, 'w') as f:
            json.dump(catalog, f, ensure_ascii=False, indent=1)
        print(f"Wrote {CATALOG_PATH}")

    # ---- Report ----
    print(f"Junk books purged: {len(report['junk_purged'])}")
    for bid, title, reason in report['junk_purged'][:25]:
        print(f"  - [{reason}] '{title}'")
    if len(report['junk_purged']) > 25:
        print(f"  ... +{len(report['junk_purged']) - 25} more")

    print(f"\nSeries merged: {len(report['series_merged'])}")
    for src, sname, canon, cname in report['series_merged']:
        print(f"  - '{sname}' -> '{cname}'")

    print(f"\nSeries deleted: {len(report['series_deleted'])}")
    for sid, name in report['series_deleted']:
        print(f"  - '{name}' [{sid}]")

    print(f"\nSeries renamed: {len(report['series_renamed'])}")
    for sid, old, new in report['series_renamed']:
        print(f"  - '{old}' -> '{new}'")

    print(f"\nVolumes fixed: {len(report['volumes_fixed'])}")
    for bid, title, old_v, new_v in report['volumes_fixed']:
        print(f"  - '{title}': {old_v} -> {new_v}")

    print(f"\nPrice issues: {len(report['prices_fixed'])}")
    for bid, title, cp, op, note in report['prices_fixed'][:20]:
        print(f"  - [{note}] '{(title or '')[:50]}' cp={cp} op={op}")

    if not dry_run:
        print(f"\nBooks deduped: {len(report['books_deduped'])}")
        for bid, title in report['books_deduped'][:20]:
            print(f"  - '{(title or '')[:60]}'")

    # Final counts
    if not dry_run:
        with open(CATALOG_PATH) as f:
            c2 = json.load(f)
        b2 = c2['books']
        b2 = list(b2.values()) if isinstance(b2, dict) else b2
        print(f"\nFINAL: {len(b2)} books, {len(c2['series'])} series")


if __name__ == '__main__':
    main()
