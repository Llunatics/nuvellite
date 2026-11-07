import domainRules from '@/data/domain-rules.json';

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

const BIND_UP_PATTERNS: PatternRule[] = [
  { kind: 'BIND_UP', label: 'Bind Up', regex: /\bbind[\s-]?up\b/i },
  { kind: 'OMNIBUS', label: 'Omnibus', regex: /\bomnibus\b/i },
  {
    kind: 'X_IN_1',
    label: (m) => `${m[1]}-in-1`,
    regex: /\b([2-9])\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b/i,
  },
  { kind: 'COMPLETE_EDITION', label: 'Complete Edition', regex: /\bcomplete\s+edition\b/i },
  {
    kind: 'ULTIMATE_EDITION',
    label: 'Ultimate Edition',
    regex: /\bultimate(?:\s+edition|\s+\d{1,3}\b|\s*$)/i,
  },
  {
    kind: 'DELUXE',
    label: 'Deluxe',
    regex: /\bdeluxe(?:\s+edition|\s+\d{1,3}\b|\s*$)/i,
  },
  { kind: 'TRILOGY', label: 'Trilogi', regex: /\btrilog[yi]\b/i },
  { kind: 'EDISI_KOLEKSI', label: 'Edisi Koleksi', regex: /\bedisi\s+koleksi\b/i },
];

const NON_BIND_UP_PATTERNS: RegExp[] = domainRules.bindUp.nonBindUpPatterns.map(
  (pat) => new RegExp(pat, 'i')
);

const CURATED_BIND_UPS = domainRules.bindUp.curatedBindUps.map((c) => ({
  match: new RegExp(c.pattern, 'i'),
  publisherId: c.publisherId,
  kind: c.kind as BindUpKind,
  label: c.label,
}));

function isExplicitNonBindUp(title: string, seriesName?: string | null): boolean {
  const haystack = [title, seriesName].filter(Boolean).join(' ');
  return NON_BIND_UP_PATTERNS.some((re) => re.test(haystack));
}

export function detectBindUp(title: string, opts: DetectBindUpOptions = {}): BindUpInfo | null {
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

export function isBindUpTitle(title: string, opts: DetectBindUpOptions = {}): boolean {
  return detectBindUp(title, opts) !== null;
}