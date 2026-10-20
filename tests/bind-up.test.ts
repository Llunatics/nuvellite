import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { detectBindUp, isBindUpTitle } from '../src/lib/data/edition-detector';
import { groupBindUpBooks } from '../src/lib/data/bind-up';
import type { Book, Series } from '../src/lib/types';

describe('Bind-up / omnibus edition detection', () => {
  it('detects "bind up" markers across Indonesian publisher title formats', () => {
    expect(detectBindUp('Naruto Bind Up Edition 01')).toEqual({ kind: 'BIND_UP', label: 'Bind Up' });
    expect(detectBindUp('Level Comic: Attack on Titan Bind Up 11')).toEqual({
      kind: 'BIND_UP',
      label: 'Bind Up',
    });
    expect(detectBindUp('Black Jack 06 (Bind Up Edition)')).toEqual({ kind: 'BIND_UP', label: 'Bind Up' });
    expect(detectBindUp('Vagabond Bind Up Vol. 03')?.kind).toBe('BIND_UP');
  });

  it('detects omnibus, N-in-1, complete/ultimate/deluxe editions and trilogies', () => {
    expect(detectBindUp('Koloni H2O Reborn Trilogy (Omnibus)')?.kind).toBe('OMNIBUS');
    expect(detectBindUp('Akasha : Gyo Complete Edition - 2 In 1')).toEqual({
      kind: 'X_IN_1',
      label: '2-in-1',
    });
    expect(detectBindUp('Namaku Miiko 4 in 1')).toEqual({ kind: 'X_IN_1', label: '4-in-1' });
    expect(detectBindUp('Dragon Ball Ultimate 06')).toEqual({
      kind: 'ULTIMATE_EDITION',
      label: 'Ultimate Edition',
    });
    expect(detectBindUp('Shaman King Complete Edition 16')?.kind).toBe('COMPLETE_EDITION');
  });

  it('does NOT flag verified 1:1 "Complete Edition" reprints (blocklist)', () => {
    // City Hunter: 35 tankobon -> 32-vol kanzenban "Complete Edition".
    // "Complete Edition" here is reprint branding, not combined volumes.
    // (Verified 2026-10-12 vs List of City Hunter chapters.)
    const titles = [
      'Akasha : City Hunter - Complete Edition 30',
      'Akasha : City Hunter - Complete Edition 01',
    ];
    for (const title of titles) {
      expect(detectBindUp(title, { publisherId: 'pub_mnc' }), `false positive: ${title}`).toBeNull();
      expect(isBindUpTitle(title, { publisherId: 'pub_mnc' })).toBe(false);
    }
  });

  it('flags curated bind-ups whose store titles carry no marker', () => {
    expect(detectBindUp('Akasha : Uzumaki', { publisherId: 'pub_mnc' })).toEqual({
      kind: 'CURATED',
      label: '3-in-1',
    });
    // Publisher gate: Uzumaki outside m&c! is not assumed to be the 3-in-1.
    expect(detectBindUp('Akasha : Uzumaki', { publisherId: 'pub_elex' })).toBeNull();
  });

  it('flags verified combined reprints via the curated list', () => {
    // m&c! Death Note New Edition: bunkoban, 12 vols -> 7 (2-in-1)
    expect(detectBindUp('Death Note - New Edition 07', { publisherId: 'pub_mnc' })).toEqual({
      kind: 'CURATED',
      label: 'Bunkoban',
    });
    // Akasha Evangelion Collector's Edition: 14 vols -> 7 (2-in-1)
    expect(
      detectBindUp("Akasha : Neon Genesis Evangelion - Collector's Edition 07", { publisherId: 'pub_mnc' })
    ).toEqual({ kind: 'CURATED', label: "Collector's Edition" });
    // Akasha Monster: kanzenban, 18 vols -> 9 (2-in-1)
    expect(detectBindUp('Akasha : Monster 09', { publisherId: 'pub_mnc' })).toEqual({
      kind: 'CURATED',
      label: 'Kanzenban',
    });
    // Elex Slam Dunk New Edition: shinsoban, 31 vols -> 20
    expect(detectBindUp('Slam Dunk New Edition 20', { publisherId: 'pub_elex' })).toEqual({
      kind: 'CURATED',
      label: 'New Edition',
    });
    // Elex Alice in Borderland 2-in-1 reprint: 18 vols -> 9
    expect(detectBindUp('Alice in Borderland Vol. 09', { publisherId: 'pub_elex' })).toEqual({
      kind: 'CURATED',
      label: '2-in-1',
    });
    // ...but the "- Retry" sequel stays a regular series.
    expect(detectBindUp('Alice in Borderland - Retry 02', { publisherId: 'pub_elex' })).toBeNull();
    // Level Comics Orb: bind-up edition (8 tankobon -> 2-in-1 volumes).
    expect(
      detectBindUp('Orb: On The Movements of the Earth 02', { publisherId: 'pub_elex' })
    ).toEqual({ kind: 'CURATED', label: 'Bind Up' });
  });

  it('falls back to the series name when the title itself has no marker', () => {
    expect(detectBindUp('Some Plain Title', { seriesName: 'Naruto Bind Up' })?.kind).toBe('BIND_UP');
  });

  it('does NOT flag bundles, 1:1 reprints, premium paper, or story anthologies', () => {
    const falsePositives = [
      'One Piece Complete Set',
      'Jujutsu Kaisen Box Set Vol. 1-5',
      'Detektif Conan Premium 33',
      'Detektif Kindaichi Premium 30',
      'Yuyu Hakusho Premium 04',
      'Hai, Miiko! Vol. 38 - Premium',
      // "New Edition" alone proves nothing: Orange's is a 1:1 reprint (5 -> 5).
      'Orange 01 - New Edition',
      // Regular volume numbering, no Indonesian bind-up exists.
      'Level Comic: Jojo`s Bizarre Adventure 19 - Part 4 Diamond Is Unbreakable',
      // Sequel anthology series (Fuan no Tane+), not a combined edition.
      'Seeds of Anxiety Plus 01',
      'The Art of Junji Ito - Twisted Visions',
      'Akasha : Ito Junji - Best of Best',
      'Akasha : Fragments of Horror',
      'Akasha : Ito Junji Compilation 09 - Town of Tombstones',
      'Naruto 72',
      'Jujutsu Kaisen 24',
    ];
    for (const title of falsePositives) {
      expect(detectBindUp(title), `false positive: ${title}`).toBeNull();
      expect(isBindUpTitle(title)).toBe(false);
    }
  });
});

describe('Bind-up series grouping', () => {
  const mkBook = (over: Partial<Book>): Book =>
    ({
      id: 'x',
      slug: 'x',
      title: 'x',
      authors: [],
      category: 'Manga',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      publisherShortName: 'Elex Media',
      status: 'PUBLISHED',
      isWednesdayRelease: false,
      currentPrice: 50000,
      genres: [],
      isBindUp: true,
      ...over,
    } as Book);

  it('merges store title variants of the same bind-up line into one group', () => {
    const books = [
      mkBook({ id: 'a', title: 'Shaman King Complete Edition 01', seriesName: 'Shaman King Complete', volume: 1, bindUpKind: 'COMPLETE_EDITION', bindUpLabel: 'Complete Edition' }),
      mkBook({ id: 'b', title: 'Shaman King Complete Edition 02', seriesName: 'Shaman King Complete Edition', volume: 2, bindUpKind: 'COMPLETE_EDITION', bindUpLabel: 'Complete Edition' }),
    ];
    const groups = groupBindUpBooks(books, []);
    expect(groups).toHaveLength(1);
    expect(groups[0].displayName).toBe('Shaman King');
    expect(groups[0].volumeCount).toBe(2);
    expect(groups[0].label).toBe('Complete Edition');
  });

  it('keeps regular and bind-up editions of the same franchise separate', () => {
    const books = [
      mkBook({ id: 'a', title: 'Naruto 72', seriesName: 'Naruto', volume: 72, isBindUp: false }),
      mkBook({ id: 'b', title: 'Naruto Bind Up Edition 01', seriesName: 'Naruto Bind Up', volume: 1, bindUpKind: 'BIND_UP', bindUpLabel: 'Bind Up' }),
    ];
    const groups = groupBindUpBooks(books, []);
    expect(groups).toHaveLength(1);
    expect(groups[0].displayName).toBe('Naruto');
    expect(groups[0].books.map((b) => b.id)).toEqual(['b']);
  });

  it('sorts books by volume and derives price range', () => {
    const books = [
      mkBook({ id: 'b', title: 'Vagabond Bind Up Vol. 03', seriesName: 'Vagabond Bind Up', volume: 3, currentPrice: 90000, bindUpLabel: 'Bind Up' }),
      mkBook({ id: 'a', title: 'Vagabond Bind Up Vol. 01', seriesName: 'Vagabond Bind Up', volume: 1, currentPrice: 85000, bindUpLabel: 'Bind Up' }),
    ];
    const groups = groupBindUpBooks(books, []);
    expect(groups[0].books.map((b) => b.volume)).toEqual([1, 3]);
    expect(groups[0].minPrice).toBe(85000);
    expect(groups[0].maxPrice).toBe(90000);
  });
});

describe('Catalog bind-up coverage (anti-miss regression)', () => {
  const catalogPath = join(__dirname, '..', 'src', 'data', 'catalog.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
  const books: Book[] = catalog.books || [];
  const flagged = books.filter((b) => b.isBindUp);

  it('every flagged book is re-detectable by the pattern engine (no silent drift)', () => {
    const missed = flagged.filter(
      (b) => detectBindUp(b.title, { seriesName: b.seriesName, publisherId: b.publisherId }) === null
    );
    expect(missed.map((b) => b.title)).toEqual([]);
  });

  it('covers all researched Indonesian bind-up series', () => {
    const groups = groupBindUpBooks(books, catalog.series || []);
    const names = groups.map((g) => g.displayName.toLowerCase());
    const expected = [
      'naruto',
      'shaman king',
      'attack on titan',
      'dragon ball',
      '20th century boys',
      'black jack',
      'vagabond',
      'gyo',
      'koloni h2o reborn',
      'uzumaki',
      'namaku miiko',
      'death note',
      'evangelion',
      'monster',
      'slam dunk',
      'alice in borderland',
      'orb',
    ];
    for (const name of expected) {
      expect(names.some((n) => n.includes(name)), `missing bind-up series: ${name}`).toBe(true);
    }
    // City Hunter was removed 2026-10-12: its "Complete Edition" is a 1:1
    // kanzenban reprint (35 -> 32 vols), not a bind-up.
    expect(names.some((n) => n.includes('city hunter'))).toBe(false);
  });

  it('flags a meaningful share of the catalog without over-flagging', () => {
    // 135 of 2902 as of 2026-10-12 (was 169; City Hunter 31 removed as
    // 1:1 reprint, 3 Shaman King dup books removed); guard against both
    // collapse and explosion.
    expect(flagged.length).toBeGreaterThan(50);
    expect(flagged.length).toBeLessThan(400);
  });

  it('has no duplicate series (bind-up splits merged)', () => {
    // Regression: Black Jack and Shaman King were split across two series
    // each (2026-10-12 audit).
    const ids = (catalog.series || []).map((s: Series) => s.id);
    expect(ids).not.toContain('ser_black-jack');
    expect(ids).not.toContain('ser_shaman-king-complete');
    expect(ids).toContain('ser_black-jack-bind-up');
    expect(ids).toContain('ser_shaman-king-complete-edition');

    // Black Jack bind-up series holds all 6 volumes in one place.
    const bjBooks = books.filter((b: Book) => b.seriesId === 'ser_black-jack-bind-up');
    expect(bjBooks.map((b: Book) => b.volume).sort((a, b) => (a ?? 0) - (b ?? 0)))
      .toEqual([1, 2, 3, 4, 5, 6]);

    // Shaman King complete edition holds vols 1-16 with no dup books.
    const skBooks = books.filter((b: Book) => b.seriesId === 'ser_shaman-king-complete-edition');
    expect(skBooks).toHaveLength(16);
    const skVols = skBooks.map((b: Book) => b.volume).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(skVols).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  it('has no duplicate books (same series + volume + title)', () => {
    // Only flags true dupes: same series, same volume, same normalized title.
    // Different editions (Special Set, Cetak Ulang, Premium Package, ...) are
    // legitimately separate products and must NOT be flagged.
    const norm = (t: string) =>
      t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const b of books) {
      if (!b.seriesId || b.volume == null) continue;
      const key = `${b.seriesId}__${b.volume}__${norm(b.title)}`;
      if (seen.has(key)) dups.push(`${b.title} (${b.id})`);
      seen.add(key);
    }
    expect(dups).toEqual([]);
  });

  it('has no stale isSetVariant flags (all 17 were false positives)', () => {
    // Regression 2026-10-12: isSetVariant was set on 17 regular volumes
    // (Overlord 1-5, Doraemon Petualangan 4-7/15, Gokushufudo 12, ...),
    // hiding them from the release feed and misplacing them in "Edisi Khusus".
    const flagged = books.filter((b: Book) => b.isSetVariant);
    expect(flagged.map((b: Book) => b.title)).toEqual([]);
  });
});

describe('Bind-up regression guards (deep-8 mutation testing)', () => {
  it('detects the trilogi marker (N15)', () => {
    expect(detectBindUp('Naruto Trilogi')).toEqual({ kind: 'TRILOGY', label: 'Trilogi' });
  });
});
