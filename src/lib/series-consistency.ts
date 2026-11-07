import domainRules from '@/data/domain-rules.json';

const PREFIX_PATTERN = /^(light novel|level comic|komik|akasha|lc)\s*:\s*/i;
const LC_PREFIX_PATTERN = /^\(lc\)\s*/i;

const EDITION_PATTERNS = [
  /\s*\(\s*omnibus\s*\)\s*/gi,
  /\s*\bbind[\s-]?up(?:\s+edition)?\b/gi,
  /\s*\bomnibus\b/gi,
  /\s*\bcomplete\s+edition\b/gi,
  /\s*\bedisi\s+koleksi\b/gi,
  /\s*\b[2-9]\s*in\s*1\b/gi,
];

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

export function isDuplicateSeriesName(a: string, b: string): boolean {
  const na = normalizeSeriesName(a);
  const nb = normalizeSeriesName(b);
  return na.length >= 4 && na === nb;
}

export interface PriceValidation {
  valid: boolean;
  issues: string[];
  fixedCurrent?: number;
  fixedOriginal?: number;
}

export const SUSPICIOUS_DISCOUNT_THRESHOLD = 0.9;

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

const JUNK_TITLE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^bundling\b/i, reason: 'bundling SKU' },
  { pattern: /^(komik\s+)?satuan$/i, reason: 'satuan placeholder' },
  { pattern: /^paket$/i, reason: 'paket placeholder' },
  { pattern: /^paket\s+/i, reason: 'paket bundle SKU' },
  {
    pattern: /hunter hat/i,
    reason: 'hunter hat junk (witch hat atelier is exempt)',
  },
];

export function detectJunkTitle(title: string): string | null {
  // An "FS-" (flash-sale) prefix alone is not junk: Gramedia also lists
  // genuine manga/LN volumes only under FS- SKUs. Strip it and judge the
  // underlying title; FS- non-manga is still caught by the known
  // non-manga fragments and category gates in classifyProduct().
  const t = (title || '').trim().replace(/^fs-\s*/i, '');
  if (/witch hat atelier/i.test(t)) return null;
  if (/^paket\b/i.test(t) && /\d+\s*-\s*\d+/.test(t)) return null;
  for (const { pattern, reason } of JUNK_TITLE_PATTERNS) {
    if (pattern.test(t)) return reason;
  }
  return null;
}

export const SERIES_BASE_ALIASES: Record<string, [string, string]> =
  domainRules.seriesAliases.baseAliases as unknown as Record<string, [string, string]>;

export const SERIES_MEDIUM_ALIASES: Record<string, [string, string]> =
  domainRules.seriesAliases.mediumAliases as unknown as Record<string, [string, string]>;

export function resolveBaseAlias(baseSlug: string): [string, string | null] {
  const slug = baseSlug || '';
  const hit = SERIES_BASE_ALIASES[slug] || SERIES_BASE_ALIASES[slug.replace(/-+/g, '-')];
  return hit ? [hit[0], hit[1]] : [baseSlug, null];
}

export function resolveMediumAlias(
  baseSlug: string,
  medium: string
): [string, string | null] {
  const slug = baseSlug || '';
  const med = medium || '';
  const hit =
    SERIES_MEDIUM_ALIASES[`${slug}::${med}`] ||
    SERIES_MEDIUM_ALIASES[`${slug.replace(/-+/g, '-')}::${med}`];
  return hit ? [hit[0], hit[1]] : [baseSlug, null];
}