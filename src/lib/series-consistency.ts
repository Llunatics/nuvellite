/**
 * Series consistency utilities — canonical normalization for duplicate
 * detection, price validation, and title sanity checks.
 *
 * Mirrors scripts/catalog_consistency.py. Both implementations must stay
 * in sync: same normalization rules, same validation thresholds.
 */

/** Publisher/store prefixes stripped before normalization. */
const PREFIX_PATTERN = /^(light novel|level comic|komik|akasha|lc)\s*:\s*/i;
const LC_PREFIX_PATTERN = /^\(lc\)\s*/i;

/** Edition markers stripped (bind-up, omnibus, etc.). */
const EDITION_PATTERNS = [
  /\s*\(\s*omnibus\s*\)\s*/gi,
  /\s*\bbind[\s-]?up\b/gi,
  /\s*\bomnibus\b/gi,
  /\s*\bcomplete\s+edition\b/gi,
  /\s*\bedisi\s+koleksi\b/gi,
  /\s*\b[2-9]\s*in\s*1\b/gi,
];

/**
 * Canonical series-name normalization for duplicate detection.
 * "Gokushufudo - The Way of House Husband" -> "gokushufudo the way of house husband"
 * "Bungo Stray Dogs BEAST" -> "bungo stray dogs beast"
 */
export function normalizeSeriesName(name: string | null | undefined): string {
  let n = (name || '').toLowerCase();
  n = n.replace(PREFIX_PATTERN, '');
  n = n.replace(LC_PREFIX_PATTERN, '');
  for (const p of EDITION_PATTERNS) {
    p.lastIndex = 0;
    n = n.replace(p, ' ');
  }
  n = n.replace(/[^a-z0-9\s]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

/**
 * Returns true when two series names refer to the same series
 * (after canonical normalization).
 */
export function isDuplicateSeriesName(a: string, b: string): boolean {
  const na = normalizeSeriesName(a);
  const nb = normalizeSeriesName(b);
  return na.length >= 4 && na === nb;
}

export interface PriceValidation {
  valid: boolean;
  issues: string[];
  /** Corrected values when auto-fixable (currentPrice > originalPrice swap). */
  fixedCurrent?: number;
  fixedOriginal?: number;
}

/** Discounts above this are flagged as suspicious (likely data error). */
export const SUSPICIOUS_DISCOUNT_THRESHOLD = 0.9;

/**
 * Validate a book's price fields. Returns issues and auto-fix suggestions.
 * - currentPrice must not exceed originalPrice (auto-fixable by swap)
 * - discount >90% is suspicious (not auto-fixed, needs review)
 * - negative/zero prices are invalid
 */
export function validatePrice(
  currentPrice: number | null | undefined,
  originalPrice: number | null | undefined
): PriceValidation {
  const issues: string[] = [];
  let fixedCurrent: number | undefined;
  let fixedOriginal: number | undefined;

  const cp = currentPrice ?? 0;
  const op = originalPrice ?? 0;

  if (cp < 0 || op < 0) {
    issues.push('negative price');
  }
  if (cp > 0 && op > 0 && cp > op) {
    issues.push(`currentPrice (${cp}) exceeds originalPrice (${op})`);
    // Auto-fix: swap (original is the higher SRP)
    fixedCurrent = op;
    fixedOriginal = cp;
  }
  const effOp = fixedOriginal ?? op;
  const effCp = fixedCurrent ?? cp;
  if (effOp > 0 && effCp > 0 && effCp < effOp) {
    const discount = (effOp - effCp) / effOp;
    if (discount > SUSPICIOUS_DISCOUNT_THRESHOLD) {
      issues.push(`discount ${(discount * 100).toFixed(0)}% suspicious (>90%)`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    fixedCurrent,
    fixedOriginal,
  };
}

/** Junk title patterns (mirrors auto-sync-catalog.py classify_book). */
const JUNK_TITLE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^bundling\b/i, reason: 'bundling SKU' },
  { pattern: /^(komik\s+)?satuan$/i, reason: 'satuan placeholder' },
  { pattern: /^paket$/i, reason: 'paket placeholder' },
  {
    pattern: /hunter hat/i,
    reason: 'hunter hat junk (witch hat atelier is exempt)',
  },
];

/**
 * Returns the junk reason when a book title is a known non-book product,
 * or null when the title looks legitimate.
 * "Witch Hat Atelier" must NOT match (negative guard).
 */
export function detectJunkTitle(title: string): string | null {
  const t = (title || '').trim();
  if (/witch hat atelier/i.test(t)) return null;
  for (const { pattern, reason } of JUNK_TITLE_PATTERNS) {
    if (pattern.test(t)) return reason;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Canonical franchise aliases.
//
// TypeScript mirror of scripts/catalog_consistency.py (SERIES_BASE_ALIASES /
// SERIES_MEDIUM_ALIASES). Durable encoding of the 2026-10-12 audit's series
// merges — applied by the sync pipeline on every run so vendor-feed drift
// cannot re-split them. Keep both implementations in sync.
// ---------------------------------------------------------------------------

/** base_slug -> [canonical_base_slug, canonical_display_name] */
export const SERIES_BASE_ALIASES: Record<string, [string, string]> = {
  // 'Bungo Stray Dogs BEAST' consolidates into 'Bungo Stray Dogs'.
  'bungo-stray-dogs-beast': ['bungo-stray-dogs', 'Bungo Stray Dogs'],
  // New-format 'Cerita Spesial Doraemon Edisi <subtitle>' titles keep the
  // full subtitle as series name; the canonical series is the short name.
  'cerita-spesial-doraemon-edisi-musik-yang-bergema-dungtek': [
    'cerita-spesial-doraemon',
    'Cerita Spesial Doraemon',
  ],
};

/** "base_slug::medium" -> [canonical_base_slug, canonical_display_name] */
export const SERIES_MEDIUM_ALIASES: Record<string, [string, string]> = {
  // Both 'Detektif Conan Movie: ...' and 'Detektif Conan The Movie: ...'
  // are the same movie line; canonical id ser_detektif-conan-the.
  'detektif-conan::MOVIE': ['detektif-conan-the', 'Detektif Conan The Movie'],
};

/** Resolve a base franchise slug through SERIES_BASE_ALIASES. */
export function resolveBaseAlias(baseSlug: string): [string, string | null] {
  const hit = SERIES_BASE_ALIASES[baseSlug || ''];
  return hit ? [hit[0], hit[1]] : [baseSlug, null];
}

/** Resolve a (base_slug, medium) pair through SERIES_MEDIUM_ALIASES. */
export function resolveMediumAlias(
  baseSlug: string,
  medium: string
): [string, string | null] {
  const hit = SERIES_MEDIUM_ALIASES[`${baseSlug || ''}::${medium || ''}`];
  return hit ? [hit[0], hit[1]] : [baseSlug, null];
}
