#!/usr/bin/env python3
"""One-time audit: purge non-manga / non-light-novel items from catalog.json.

Uses the same classify_book() as the sync pipeline. A book is purged only on
POSITIVE junk evidence:
  - title matches the merchandise / non-manga title patterns, or
  - its Gramedia store category (category_slugs from product specs) is in the
    disallowed list and the title carries no explicit manga/LN format token.

Books whose specs cannot be fetched are KEPT (never purge on unknown).

Usage:
    python3 scripts/audit-purge-catalog.py            # dry run, prints purge list
    python3 scripts/audit-purge-catalog.py --apply    # writes cleaned catalog.json
"""
import json
import os
import sys
import argparse
from concurrent.futures import ThreadPoolExecutor

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
import importlib.util
_spec = importlib.util.spec_from_file_location(
    'asc', os.path.join(SCRIPT_DIR, 'auto-sync-catalog.py'))
asc = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(asc)

from adapters import ElexAdapter, MCAdapter, PGIAdapter

CATALOG_PATH = os.path.join(SCRIPT_DIR, '../src/data/catalog.json')
ADAPTERS = {
    'pub_elex': ElexAdapter(),
    'pub_mnc': MCAdapter(),
    'pub_pgi': PGIAdapter(),
}


def real_slug(book):
    url = book.get('gramediaUrl') or ''
    if '/products/' in url:
        return url.rsplit('/products/', 1)[-1].strip('/')
    return book.get('slug')


def audit_book(book):
    title = book.get('title') or ''
    pub_id = book.get('publisherId') or ''
    t_lower = title.lower()

    # Fast path 1: explicit manga/LN format token in title -> definitely keep.
    if any(tok in t_lower for tok in asc.EXPLICIT_FORMAT_TOKENS):
        return book, 'KEEP', 'explicit format token in title'

    # Fast path 2: API-independent hard rejects (merchandise, Qanza imprint).
    # classify_book with no category defers title-pattern checks, so a REJECT
    # here is always safe to apply without fetching specs.
    pre_status, _, pre_reason = asc.classify_book(title, pub_id)
    if pre_status == 'REJECT':
        return book, 'PURGE', pre_reason + ' (title-only)'

    # Slow path: fetch store category and classify with full signals.
    # (Title negatives are NOT applied blindly here: a comic store category
    # overrides them, e.g. "Teka-Teki Rumah Aneh - Hen Na Ie" is real manga.)
    adapter = ADAPTERS.get(pub_id)
    if not adapter:
        return book, 'KEEP', 'unknown publisher'
    slug = real_slug(book)
    try:
        sp = adapter.fetch_product_specs(slug)
    except Exception as e:
        return book, 'KEEP', f'spec fetch error: {e}'
    if not sp:
        return book, 'KEEP', 'spec fetch returned nothing'
    status, _cat, reason = asc.classify_book(
        title, pub_id, cat_slugs=sp.get('category_slugs') or '', specs=sp)
    if status == 'REJECT':
        return book, 'PURGE', reason
    return book, 'KEEP', reason


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    with open(CATALOG_PATH, encoding='utf-8') as f:
        catalog = json.load(f)
    books = catalog.get('books', [])
    print(f'Auditing {len(books)} books...')

    # Fast paths first (no network), then threaded spec fetches.
    fast = [b for b in books
            if any(tok in (b.get('title') or '').lower() for tok in asc.EXPLICIT_FORMAT_TOKENS)]
    rest = [b for b in books if b not in fast]
    print(f'  fast-keep (explicit title token): {len(fast)}')
    print(f'  need spec check: {len(rest)}')

    results = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        for r in ex.map(audit_book, rest):
            results.append(r)

    purge = [(b, reason) for b, verdict, reason in results if verdict == 'PURGE']
    print(f'\nPURGE candidates: {len(purge)}')
    for b, reason in sorted(purge, key=lambda x: x[0]['title']):
        print(f"  - {b['title'][:70]} [{b.get('publisherShortName')}] ({reason})")

    if not args.apply:
        print('\nDry run — nothing written. Re-run with --apply to purge.')
        return

    purge_ids = {b['id'] for b, _ in purge}
    catalog['books'] = [b for b in books if b['id'] not in purge_ids]
    # Drop series left without books, and snapshots of purged books.
    kept_series_ids = {b.get('seriesId') for b in catalog['books'] if b.get('seriesId')}
    catalog['series'] = [s for s in catalog.get('series', []) if s['id'] in kept_series_ids]
    catalog['priceSnapshots'] = [s for s in catalog.get('priceSnapshots', [])
                                 if s.get('bookId') not in purge_ids]

    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f'\nWrote cleaned catalog: {len(catalog["books"])} books, '
          f'{len(catalog["series"])} series remain.')


if __name__ == '__main__':
    main()
