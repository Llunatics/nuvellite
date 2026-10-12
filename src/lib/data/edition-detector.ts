/**
 * Bind-up / omnibus edition detection.
 *
 * Indonesian publishers (Elex, m&c!/Akasha/Koloni, Level Comics) reprint
 * finished series as bind-up editions — several original volumes bound into
 * one thicker volume. These are detected purely by title patterns (no
 * hardcoded series list), so new bind-up releases are picked up automatically
 * by the sync pipeline. A tiny curated list covers verified bind-ups whose
 * store titles carry no marker at all (e.g. Akasha's Uzumaki 3-in-1).
 *
 * Deliberately NOT markers (would cause false positives):
 * - "Complete Set" / "Box Set"          -> bundles of regular volumes (BUNDLE)
 * - "New Edition" / "Premium"           -> nicer reprints, not combined volumes
 * - "Special Set" / "Birthday Set"      -> merchandise bundles (SPECIAL_SET)
 * - Story anthologies ("Best of Best", "Fragments of Horror",
 *   "Twisted Visions", "... Compilation") -> short-story collections,
 *   not volume bind-ups
 *
 * Verified 1:1 "Complete Edition" reprints (NON_BIND_UP_PATTERNS):
 * - City Hunter Complete Edition       -> 35 vols -> 32 (kanzenban reprint,
 *   not combined; "Complete Edition" is just reprint branding)
 */

export type BindUpKind =
  | 'BIND_UP'
  | 'OMNIBUS'
  | 'X_IN_1'
  | 'COMPLETE_EDITION'
  | 'ULTIMATE_EDITION'
  | 'DELUXE'
  | 'TRILOGY'
  | 'EDISI_KOLEKSI'
  | 'CURATED';

export interface BindUpInfo {
  kind: BindUpKind;
  /** Display label, e.g. "Bind Up", "3-in-1", "Complete Edition". */
  label: string;
}

export interface DetectBindUpOptions {
  seriesName?: string | null;
  publisherId?: string;
}

interface PatternRule {
  kind: BindUpKind;
  label: string | ((m: RegExpMatchArray) => string);
  regex: RegExp;
}

// Order matters: first match wins (most specific markers first).
const BIND_UP_PATTERNS: PatternRule[] = [
  { kind: 'BIND_UP', label: 'Bind Up', regex: /\bbind[\s-]?up\b/i },
  { kind: 'OMNIBUS', label: 'Omnibus', regex: /\bomnibus\b/i },
  {
    kind: 'X_IN_1',
    label: (m) => `${m[1]}-in-1`,
    regex: /\b([2-9])\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b/i,
  },
  { kind: 'COMPLETE_EDITION', label: 'Complete Edition', regex: /\bcomplete\s+edition\b/i },
  { kind: 'ULTIMATE_EDITION', label: 'Ultimate Edition', regex: /\bultimate\b/i },
  { kind: 'DELUXE', label: 'Deluxe', regex: /\bdeluxe\b/i },
  { kind: 'TRILOGY', label: 'Trilogi', regex: /\btrilog[yi]\b/i },
  { kind: 'EDISI_KOLEKSI', label: 'Edisi Koleksi', regex: /\bedisi\s+koleksi\b/i },
];

interface CuratedBindUp {
  /** Matches against title (and series name). */
  match: RegExp;
  /** Restrict to this publisher id when set. */
  publisherId?: string;
  kind: BindUpKind;
  label: string;
  note: string;
}

// Verified NON-bind-ups whose titles match a bind-up pattern but are actually
// 1:1 reprints (no volumes combined). Checked BEFORE patterns — if a title
// matches here, it is never a bind-up, no matter what markers it carries.
//
// - City Hunter "Complete Edition": the Tokuma kanzenban reprint, 35 tankobon
//   -> 32 vols (Akasha: 31 vols). "Complete Edition" here is reprint branding,
//   not combined volumes. (Verified 2026-10-12 vs en.wikipedia.org List of
//   City Hunter chapters: 35 vols original, 32-vol "Complete Edition".)
const NON_BIND_UP_PATTERNS: RegExp[] = [
  /\bcity\s+hunter\b/i,
];

function isExplicitNonBindUp(title: string, seriesName?: string | null): boolean {
  const haystack = [title, seriesName].filter(Boolean).join(' ');
  return NON_BIND_UP_PATTERNS.some((re) => re.test(haystack));
}

// Verified bind-up releases whose Indonesian store titles carry no
// unambiguous marker ("New Edition" / "Collector's Edition" / "Premium"
// alone prove nothing — e.g. Orange New Edition is a 1:1 reprint).
// Every entry below was verified volume-count by volume-count against the
// Japanese edition it reprints. Keep this list evidence-backed; patterns
// do the heavy lifting.
const CURATED_BIND_UPS: CuratedBindUp[] = [
  {
    match: /\buzumaki\b/i,
    publisherId: 'pub_mnc',
    kind: 'CURATED',
    label: '3-in-1',
    note: 'Akasha Uzumaki: 648-page single-volume complete edition (3-in-1).',
  },
  {
    match: /death note[\s-]*new edition/i,
    publisherId: 'pub_mnc',
    kind: 'CURATED',
    label: 'Bunkoban',
    note: 'm&c! Death Note New Edition: bunkoban reprint, 12 vols -> 7 (2-in-1).',
  },
  {
    match: /evangelion[\s-]*collector'?s edition/i,
    publisherId: 'pub_mnc',
    kind: 'CURATED',
    label: "Collector's Edition",
    note: "Akasha Evangelion Collector's Edition: 14 vols -> 7 (2-in-1).",
  },
  {
    match: /akasha\s*:?\s*monster/i,
    publisherId: 'pub_mnc',
    kind: 'CURATED',
    label: 'Kanzenban',
    note: 'Akasha Monster: kanzenban reprint, 18 vols -> 9 (2-in-1).',
  },
  {
    match: /slam dunk[\s-]*new edition/i,
    publisherId: 'pub_elex',
    kind: 'CURATED',
    label: 'New Edition',
    note: 'Elex Slam Dunk New Edition: shinsoban reprint, 31 vols -> 20.',
  },
  {
    // Negative lookahead: the "- Retry" sequel is a regular 2-volume series.
    match: /alice in borderland(?!.*retry)/i,
    publisherId: 'pub_elex',
    kind: 'CURATED',
    label: '2-in-1',
    note: 'Elex Alice in Borderland 2-in-1 reprint: 18 vols -> 9.',
  },
  {
    match: /orb[\s:]*on the movements of the earth/i,
    publisherId: 'pub_elex',
    kind: 'CURATED',
    label: 'Bind Up',
    note: 'Level Comics Orb: On the Movements of the Earth: bind-up edition (8 tankobon -> 2-in-1 volumes).',
  },
];

export function detectBindUp(title: string, opts: DetectBindUpOptions = {}): BindUpInfo | null {
  // Explicit non-bind-ups win over everything (1:1 reprints with misleading markers).
  if (isExplicitNonBindUp(title, opts.seriesName)) return null;

  const haystack = [title, opts.seriesName].filter(Boolean).join(' ');

  for (const rule of BIND_UP_PATTERNS) {
    const m = haystack.match(rule.regex);
    if (m) {
      return {
        kind: rule.kind,
        label: typeof rule.label === 'function' ? rule.label(m) : rule.label,
      };
    }
  }

  const pubId = (opts.publisherId || '').toLowerCase();
  for (const c of CURATED_BIND_UPS) {
    if (c.publisherId && pubId !== c.publisherId.toLowerCase()) continue;
    if (c.match.test(haystack)) {
      return { kind: c.kind, label: c.label };
    }
  }

  return null;
}

/** Convenience: true when the title is a bind-up / omnibus edition. */
export function isBindUpTitle(title: string, opts: DetectBindUpOptions = {}): boolean {
  return detectBindUp(title, opts) !== null;
}
