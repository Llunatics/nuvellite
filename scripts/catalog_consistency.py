#!/usr/bin/env python3
"""
Catalog consistency primitives — shared by audit scripts and the sync pipeline.

Mirrors src/lib/series-consistency.ts. Both implementations must stay in sync:
same normalization rules, same validation thresholds.
"""

import re

SUSPICIOUS_DISCOUNT_THRESHOLD = 0.90


def normalize_series_name(name):
    """Canonical series-name normalization for duplicate detection."""
    n = (name or '').lower()
    n = re.sub(r'^(light novel|level comic|komik|akasha|lc)\s*:\s*', '', n)
    n = re.sub(r'^\(lc\)\s*', '', n)
    n = re.sub(r'\s*\(\s*omnibus\s*\)\s*', ' ', n)
    n = re.sub(r'\s*\bbind[\s-]?up\b', ' ', n)
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
    (re.compile(r'^paket$', re.I), 'paket placeholder'),
    (re.compile(r'hunter hat', re.I), 'hunter hat junk'),
]


def detect_junk_title(title):
    """Return junk reason or None. 'Witch Hat Atelier' is exempt."""
    t = (title or '').strip()
    if re.search(r'witch hat atelier', t, re.I):
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
    from collections import defaultdict
    groups = defaultdict(list)
    for s in series_list:
        key = normalize_series_name(s.get('name'))
        if len(key) >= 4:
            groups[key].append(s)
    return {k: v for k, v in groups.items() if len(v) > 1}


# ---------------------------------------------------------------------------
# Canonical franchise aliases.
#
# Durable encoding of the 2026-10-12 consistency audit's series merges.
# The audit fixed these as one-time DATA edits, so later auto-syncs re-split
# them as soon as the vendor feed drifted (regressions observed 2026-10-15..20:
# Conan movie split again, Bungo Stray Dogs BEAST split again, display name
# 'Detektif Conan The Movie' decayed to 'Detektif Conan The').
#
# The sync pipeline MUST apply these on every run (see auto-sync-catalog.py
# step 5). The TypeScript mirror lives in src/lib/series-consistency.ts and
# the TS consolidator (src/lib/data/deduplicator.ts) applies the same rules.
# ---------------------------------------------------------------------------

# base_slug -> (canonical_base_slug, canonical_display_name)
# Applied right after clean_base_franchise().
SERIES_BASE_ALIASES = {
    # 'Bungo Stray Dogs BEAST' (spin-off line) consolidates into the main
    # 'Bungo Stray Dogs' series per the 2026-10-12 audit + series-tracker test.
    'bungo-stray-dogs-beast': ('bungo-stray-dogs', 'Bungo Stray Dogs'),
    # New-format 'Cerita Spesial Doraemon Edisi <subtitle>' titles keep the
    # full subtitle as series name; the canonical series is 'Cerita Spesial
    # Doraemon' (old ' - Edisi ...' titles parsed to the short name).
    'cerita-spesial-doraemon-edisi-musik-yang-bergema-dungtek': (
        'cerita-spesial-doraemon', 'Cerita Spesial Doraemon'),
}

# (base_slug, medium) -> (canonical_base_slug, canonical_display_name)
# Applied after the per-franchise medium set is computed, before the
# medium-separated series id/display name is assigned.
SERIES_MEDIUM_ALIASES = {
    # Both 'Detektif Conan Movie: ...' (base 'detektif-conan', medium MOVIE)
    # and 'Detektif Conan The Movie: ...' (base 'detektif-conan-the') are the
    # same movie line; canonical id ser_detektif-conan-the per the 2026-10-12
    # audit + series-tracker test.
    ('detektif-conan', 'MOVIE'): ('detektif-conan-the', 'Detektif Conan The Movie'),
}


def resolve_base_alias(base_slug):
    """Return (canonical_base_slug, canonical_display_name|None)."""
    hit = SERIES_BASE_ALIASES.get(base_slug or '')
    if hit:
        return hit
    return base_slug, None


def resolve_medium_alias(base_slug, medium):
    """Return (canonical_base_slug, canonical_display_name|None)."""
    hit = SERIES_MEDIUM_ALIASES.get((base_slug or '', medium or ''))
    if hit:
        return hit
    return base_slug, None
