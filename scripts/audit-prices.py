#!/usr/bin/env python3
"""
Price audit: sample catalog books, fetch live Gramedia prices, report mismatches.

Usage:
    python3 scripts/audit-prices.py --sample 50        # audit 50 random books
    python3 scripts/audit-prices.py --sample 50 --apply # fix mismatches in catalog.json
    python3 scripts/audit-prices.py --book <book_id>    # audit single book

Compares catalog currentPrice/originalPrice against Gramedia's
product-detail-variants API (same source the sync pipeline uses).
"""

import json
import random
import re
import sys
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

CATALOG_PATH = 'src/data/catalog-listing.json'
API_BASE = 'https://api-service.gramedia.com/api/v2/public'

# Mismatch thresholds
PRICE_TOLERANCE = 0      # rupiah; any difference counts
SUSPICIOUS_DISCOUNT = 0.90  # >90% off flagged for review


def slug_from_url(url: str) -> str | None:
    m = re.search(r'/products/([a-z0-9\-]+)', url or '')
    return m.group(1) if m else None


def fetch_live_price(slug: str) -> dict | None:
    url = f'{API_BASE}/product-detail-variants/{slug}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.load(r)
        data = d.get('data', [])
        if not data:
            return None
        f = data[0]
        final_p = f.get('final_price') or 0
        slice_p = f.get('slice_price') or 0
        curr = final_p if final_p > 0 else slice_p
        orig = slice_p if slice_p > curr else curr
        return {'current': curr, 'original': orig, 'oos': f.get('is_oos', False)}
    except Exception:
        return None


def audit_book(book: dict) -> dict:
    slug = slug_from_url(book.get('gramediaUrl'))
    if not slug:
        return {'book_id': book['id'], 'status': 'no_slug'}
    live = fetch_live_price(slug)
    if not live:
        return {'book_id': book['id'], 'status': 'fetch_failed', 'slug': slug}

    cat_cp = book.get('currentPrice') or book.get('price')
    cat_op = book.get('originalPrice')
    result = {
        'book_id': book['id'],
        'title': book.get('title'),
        'slug': slug,
        'status': 'ok',
        'catalog': {'current': cat_cp, 'original': cat_op},
        'live': live,
    }
    issues = []
    if cat_cp and live['current'] and abs(cat_cp - live['current']) > PRICE_TOLERANCE:
        issues.append(f"currentPrice {cat_cp} != live {live['current']}")
    if cat_op and live['original'] and abs(cat_op - live['original']) > PRICE_TOLERANCE:
        issues.append(f"originalPrice {cat_op} != live {live['original']}")
    # Sanity: live discount >90% is suspicious
    if live['original'] and live['current']:
        disc = (live['original'] - live['current']) / live['original']
        if disc > SUSPICIOUS_DISCOUNT:
            issues.append(f'live discount {disc:.0%} suspicious')
    if issues:
        result['status'] = 'mismatch'
        result['issues'] = issues
    return result


def main():
    args = sys.argv[1:]
    apply = '--apply' in args
    sample_n = 50
    single = None
    for i, a in enumerate(args):
        if a == '--sample' and i + 1 < len(args):
            sample_n = int(args[i + 1])
        if a == '--book' and i + 1 < len(args):
            single = args[i + 1]

    with open(CATALOG_PATH) as f:
        cat = json.load(f)
    books = cat['books']
    books = list(books.values()) if isinstance(books, dict) else books
    # Only Gramedia-backed books with URLs
    candidates = [b for b in books if b.get('gramediaUrl')]

    if single:
        targets = [b for b in candidates if b['id'] == single]
        if not targets:
            print(f"Book {single} not found or no gramediaUrl")
            return
    else:
        random.seed(20261012)
        targets = random.sample(candidates, min(sample_n, len(candidates)))

    print(f"Auditing {len(targets)} books against Gramedia API...\n")
    results = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for r in ex.map(audit_book, targets):
            results.append(r)

    mismatches = [r for r in results if r['status'] == 'mismatch']
    failed = [r for r in results if r['status'] in ('fetch_failed', 'no_slug')]
    ok = [r for r in results if r['status'] == 'ok']

    print(f"OK: {len(ok)} | MISMATCH: {len(mismatches)} | FAILED: {len(failed)}\n")
    for r in mismatches:
        print(f"MISMATCH '{r['title'][:55]}'")
        print(f"  catalog: cp={r['catalog']['current']} op={r['catalog']['original']}")
        print(f"  live:    cp={r['live']['current']} op={r['live']['original']}")
        for i in r['issues']:
            print(f"  - {i}")

    if apply and mismatches:
        # Apply fixes to catalog.json (source of truth)
        with open('src/data/catalog.json') as f:
            src = json.load(f)
        src_books = src['books']
        is_dict = isinstance(src_books, dict)
        blist = list(src_books.values()) if is_dict else src_books
        bmap = {b['id']: b for b in blist}
        fixed = 0
        for r in mismatches:
            b = bmap.get(r['book_id'])
            if not b:
                continue
            live = r['live']
            # Only auto-fix when live data looks sane
            if live['current'] and live['original'] and live['current'] <= live['original']:
                b['currentPrice'] = live['current']
                b['originalPrice'] = live['original']
                if 'price' in b:
                    b['price'] = live['current']
                fixed += 1
        with open('src/data/catalog.json', 'w') as f:
            json.dump(src, f, ensure_ascii=False, indent=1)
        print(f"\nFixed {fixed} books in catalog.json")
        print("Run split-catalog.py to regenerate listing.")


if __name__ == '__main__':
    main()
