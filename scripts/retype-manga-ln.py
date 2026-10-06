#!/usr/bin/env python3
"""One-time re-typing pass: fix Manga <-> Light Novel mislabels.

Only touches books with HIGH-CONFIDENCE evidence:
  1. Title carries an explicit LN token (light novel / (novel) / the novel)
     but the stored category is Manga  -> Light Novel.
  2. "Akasha: You are a Four Leaf Clover" (m&c!) stored as Light Novel:
     verified manga series (Akasha = m&c! manga imprint; the old naive
     'clover'-substring rule mislabeled it) -> Manga.

Usage: python3 scripts/retype-manga-ln.py [--apply]
"""
import json
import os
import sys
import argparse

CATALOG_PATH = os.path.join(os.path.dirname(__file__), '../src/data/catalog.json')

LN_TOKENS = ('light novel', '(novel)', 'the novel')


def decide(book):
    t = (book.get('title') or '')
    tl = t.lower()
    cat = book.get('category')
    if cat == 'Manga' and any(tok in tl for tok in LN_TOKENS):
        return 'Light Novel', 'explicit LN token in title'
    if cat == 'Light Novel' and 'four leaf clover' in tl and 'akasha' in tl:
        return 'Manga', 'verified Akasha manga series (old clover-substring mislabel)'
    return None, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    with open(CATALOG_PATH, encoding='utf-8') as f:
        catalog = json.load(f)

    changes = []
    for b in catalog.get('books', []):
        new_cat, reason = decide(b)
        if new_cat:
            changes.append((b['title'][:60], b['category'], new_cat, reason))
            if args.apply:
                b['category'] = new_cat
                b['format'] = 'LIGHT_NOVEL' if new_cat == 'Light Novel' else 'MANGA'
                b['classificationReason'] = f'Retyped: {reason}'

    print(f'Retype candidates: {len(changes)}')
    for title, old, new, reason in changes:
        print(f'  {old:10} -> {new:10} | {title} ({reason})')

    if not args.apply:
        print('\nDry run — nothing written. Re-run with --apply.')
        return

    # Fix series types to match their books' majority category.
    from collections import Counter, defaultdict
    by_series = defaultdict(list)
    for b in catalog['books']:
        if b.get('seriesId'):
            by_series[b['seriesId']].append(b['category'])
    fixed_series = 0
    for s in catalog.get('series', []):
        cats = by_series.get(s['id'])
        if not cats:
            continue
        majority = Counter(cats).most_common(1)[0][0]
        want = 'LIGHT_NOVEL' if majority == 'Light Novel' else 'MANGA'
        if s.get('type') != want:
            s['type'] = want
            fixed_series += 1

    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f'\nApplied {len(changes)} book retypes, {fixed_series} series type fixes.')


if __name__ == '__main__':
    main()
