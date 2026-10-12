/**
 * KKI <-> Nuvellite series match decision policy.
 *
 * Mirrors scripts/kki/match_kki.py (Python, rapidfuzz). The fuzzy title score
 * itself is computed in Python; this module encapsulates the DECISION rules
 * (thresholds + guards) so they are unit-tested in the repo's vitest suite.
 *
 * Policy (conservative):
 *  - auto-match:  score >= 90, same medium, author compatible,
 *                 no short-title inexactness, no suspicious substring extra
 *  - review:      score >= 70 (with a reason), never auto-matched
 *  - no match:    score < 70
 */

export const KKI_AUTO_THRESHOLD = 90;
export const KKI_REVIEW_THRESHOLD = 70;
export const KKI_AUTHOR_THRESHOLD = 70;
export const KKI_AUTHOR_STRONG_THRESHOLD = 85;

const PUBLISHER_IN_AUTHOR_RE =
  /elex|m&c|gramedia|komputindo|publishing|publisher|phoenix|\bpgi\b|koloni|akasha|level comic/i;

const EDITION_MARKERS = new Set([
  'complete', 'edition', 'deluxe', 'omnibus', 'bind', 'up', 'bindup',
  'vol', 'volume', 'best',
]);

const SPINOFF_MARKERS = new Set([
  'spesial', 'special', 'cerita', 'kisah', 'selection', 'archives',
  'arsip', 'vs', 'tribute', 'anthology', 'antologi', 'another',
  'gaiden', 'side', 'secret',
]);

export function normalizeKkiTitle(title: string): string {
  let t = (title || '').toLowerCase();
  t = t.replace(/^(level comic|akasha|koloni|komik|light novel)\s*:\s*/, '');
  t = t.replace(/[^\w\s]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function isPersonAuthor(a: string | null | undefined): boolean {
  const s = (a || '').trim();
  return !!s && !PUBLISHER_IN_AUTHOR_RE.test(s);
}

/**
 * Author compatibility score 0-100, or -1 when unverifiable
 * (missing author, or the "author" field holds a publisher name).
 */
export function kkiAuthorScore(
  nuvAuthor: string | null | undefined,
  kkiAuthor: string | null | undefined,
): number {
  if (!isPersonAuthor(nuvAuthor) || !isPersonAuthor(kkiAuthor)) return -1;
  const na = (nuvAuthor as string).toLowerCase().replace(/[^\w\s]/g, ' ');
  const ka = (kkiAuthor as string).toLowerCase().replace(/[^\w\s]/g, ' ');
  const naTokens = na.split(/\s+/).filter((w) => w.length > 2);
  const kaTokens = ka.split(/\s+/).filter((w) => w.length > 2);
  if (naTokens.length && kaTokens.length) {
    const [short, long] =
      naTokens.length <= kaTokens.length ? [naTokens, kaTokens] : [kaTokens, naTokens];
    const overlap = short.filter((w) => long.includes(w)).length / short.length;
    // name-order insensitive: "gosho aoyama" == "aoyama gosho"
    if (overlap >= 0.5) return 85;
  }
  return na === ka ? 100 : 0;
}

export type KkiMatchVerdict =
  | { decision: 'auto' }
  | { decision: 'review'; reason: string }
  | { decision: 'none' };

export interface KkiMatchInput {
  nuvTitle: string;
  kkiTitle: string;
  /** precomputed fuzzy title score 0-100 (rapidfuzz in Python) */
  titleScore: number;
  nuvAuthor?: string | null;
  kkiAuthor?: string | null;
  crossMedium: boolean;
}

/**
 * Decide whether a (nuvellite series, KKI row) pair is an auto-match,
 * needs manual review, or is not a match — given the fuzzy title score.
 */
export function decideKkiMatch(input: KkiMatchInput): KkiMatchVerdict {
  const { titleScore } = input;
  if (titleScore < KKI_REVIEW_THRESHOLD) return { decision: 'none' };

  const na = normalizeKkiTitle(input.nuvTitle);
  const nb = normalizeKkiTitle(input.kkiTitle);

  const shortExactOnly = Math.min(na.length, nb.length) <= 3 && na !== nb;

  const asc = kkiAuthorScore(input.nuvAuthor, input.kkiAuthor);
  const authorOk = asc < 0 || asc >= KKI_AUTHOR_THRESHOLD;
  const authorStrong = asc >= KKI_AUTHOR_STRONG_THRESHOLD;

  let substringExtra = false;
  if (na !== nb && (na.includes(nb) || nb.includes(na))) {
    const longer = nb.length > na.length ? nb : na;
    const shorter = nb.length > na.length ? na : nb;
    const extra = longer
      .split(shorter)
      .join(' ')
      .split(/\s+/)
      .filter((w) => w && !EDITION_MARKERS.has(w) && !/^\d+$/.test(w));
    const hasSpinoff = extra.some((w) => SPINOFF_MARKERS.has(w));
    if (extra.length > 0 && (hasSpinoff || !authorStrong)) {
      substringExtra = true;
    }
  }

  if (
    titleScore >= KKI_AUTO_THRESHOLD &&
    !input.crossMedium &&
    !shortExactOnly &&
    authorOk &&
    !substringExtra
  ) {
    return { decision: 'auto' };
  }

  let reason = 'score-below-auto';
  if (input.crossMedium) reason = 'cross-medium';
  else if (shortExactOnly) reason = 'short-title-inexact';
  else if (!authorOk) reason = 'author-mismatch';
  else if (substringExtra) reason = 'substring-extra-words';
  return { decision: 'review', reason };
}
