#!/usr/bin/env python3
"""
Catalog consistency primitives — shared by audit scripts and the sync pipeline.
Reads canonical rules and aliases from src/data/domain-rules.json (shared with TS).
"""

import json
import os
import re
from collections import defaultdict

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RULES_PATH = os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'domain-rules.json')

with open(RULES_PATH, 'r', encoding='utf-8') as _f:
    DOMAIN_RULES = json.load(_f)

SUSPICIOUS_DISCOUNT_THRESHOLD = 0.90

SERIES_BASE_ALIASES = {
    k: tuple(v)
    for k, v in DOMAIN_RULES.get('seriesAliases', {}).get('baseAliases', {}).items()
}

SERIES_MEDIUM_ALIASES = {
    tuple(k.split('::', 1)): tuple(v)
    for k, v in DOMAIN_RULES.get('seriesAliases', {}).get('mediumAliases', {}).items()
    if '::' in k
}


def normalize_series_name(name):
    """Canonical series-name normalization for duplicate detection."""
    n = (name or '').lower()
    n = re.sub(r'^(light novel|level comic|komik|akasha|lc)\s*:\s*', '', n)
    n = re.sub(r'^\(lc\)\s*', '', n)
    n = re.sub(r'\s*\(\s*omnibus\s*\)\s*', ' ', n)
    n = re.sub(r'\s*\bbind[\s-]?up(?:\s+edition)?\b', ' ', n)
    n = re.sub(r'\s*\bomnibus\b', ' ', n)
    n = re.sub(r'\s*\bcomplete\s+edition\b', ' ', n)
    n = re.sub(r'\s*\bedisi\s+koleksi\b', ' ', n)
    n = re.sub(r'\s*\b[2-9]\s*in\s*1\b', ' ', n)
    n = re.sub(r'[^a-z0-9\s]', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n


def is_duplicate_series_name(a, b):
    """True when two series names refer to the same series."""
    na = normalize_series_name(a)
    nb = normalize_series_name(b)
    return len(na) >= 4 and na == nb


def validate_price(current_price, original_price):
    """
    Validate book price fields.
    Returns (valid, issues, fixed_current, fixed_original).
    """
    issues = []
    fixed_current = None
    fixed_original = None

    cp = current_price or 0
    op = original_price or 0

    if cp < 0 or op < 0:
        issues.append('negative price')
    if cp > 0 and op > 0 and cp > op:
        issues.append(f'currentPrice ({cp}) exceeds originalPrice ({op})')
        fixed_current = op
        fixed_original = cp

    eff_op = fixed_original if fixed_original is not None else op
    eff_cp = fixed_current if fixed_current is not None else cp
    if eff_op > 0 and eff_cp > 0 and eff_cp < eff_op:
        discount = (eff_op - eff_cp) / eff_op
        if discount > SUSPICIOUS_DISCOUNT_THRESHOLD:
            issues.append(f'discount {discount:.0%} suspicious (>90%)')

    return (len(issues) == 0, issues, fixed_current, fixed_original)


_JUNK_TITLE_PATTERNS = [
    (re.compile(r'^bundling\b', re.I), 'bundling SKU'),
    (re.compile(r'^(komik\s+)?satuan$', re.I), 'satuan placeholder'),
    (re.compile(r'^paket(\s|$)', re.I), 'paket bundle SKU'),
    (re.compile(r'hunter hat', re.I), 'hunter hat junk (witch hat atelier is exempt)'),
]


def detect_junk_title(title):
    """Return junk reason or None. 'Witch Hat Atelier' and volume-range Paket are exempt."""
    t = (title or '').strip()
    # An "FS-" (flash-sale) prefix alone is not junk: Gramedia also lists
    # genuine manga/LN volumes only under FS- SKUs. Strip it and judge the
    # underlying title; FS- non-manga is still caught by the known
    # non-manga fragments and category gates in classify_book().
    t = re.sub(r'^fs-\s*', '', t, flags=re.I)
    if re.search(r'witch hat atelier', t, re.I):
        return None
    if re.match(r'^paket\b', t, re.I) and re.search(r'\d+\s*-\s*\d+', t):
        return None
    for pattern, reason in _JUNK_TITLE_PATTERNS:
        if pattern.search(t):
            return reason
    return None


def find_duplicate_series(series_list):
    """
    Group series by normalized name. Returns {normalized: [series...]}
    for groups with 2+ members (potential duplicates).
    """
    groups = defaultdict(list)
    for s in series_list:
        key = normalize_series_name(s.get('name'))
        if len(key) >= 4:
            groups[key].append(s)
    return {k: v for k, v in groups.items() if len(v) > 1}


def resolve_base_alias(base_slug):
    """Return (canonical_base_slug, canonical_display_name|None)."""
    slug = base_slug or ''
    hit = SERIES_BASE_ALIASES.get(slug)
    if hit:
        return hit
    collapsed = re.sub(r'-+', '-', slug)
    hit = SERIES_BASE_ALIASES.get(collapsed)
    if hit:
        return hit
    return base_slug, None


def resolve_medium_alias(base_slug, medium):
    """Return (canonical_base_slug, canonical_display_name|None)."""
    slug = base_slug or ''
    med = medium or ''
    hit = SERIES_MEDIUM_ALIASES.get((slug, med))
    if hit:
        return hit
    collapsed = re.sub(r'-+', '-', slug)
    hit = SERIES_MEDIUM_ALIASES.get((collapsed, med))
    if hit:
        return hit
    return base_slug, None