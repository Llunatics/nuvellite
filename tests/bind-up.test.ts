import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { detectBindUp, isBindUpTitle } from '../src/lib/data/edition-detector';
import { groupBindUpBooks } from '../src/lib/data/bind-up';
import type { Book } from '../src/lib/types';

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
    expect(detectBindUp('Akasha : City Hunter - Complete Edition 30')).toEqual({
      kind: 'COMPLETE_EDITION',
      label: 'Complete Edition',
    });
    expect(detectBindUp('Dragon Ball Ultimate 06')).toEqual({
      kind: 'ULTIMATE_EDITION',
      label: 'Ultimate Edition',
    });
    expect(detectBindUp('Shaman King Complete Edition 16')?.kind).toBe('COMPLETE_EDITION');
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
      'Alice in Borderland Vol. 09',
      'Alice in Borderland - Retry 02',
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
      'city hunter',
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
    ];
    for (const name of expected) {
      expect(names.some((n) => n.includes(name)), `missing bind-up series: ${name}`).toBe(true);
    }
  });

  it('flags a meaningful share of the catalog without over-flagging', () => {
    // 115 of 2908 as of 2026-10-11; guard against both collapse and explosion.
    expect(flagged.length).toBeGreaterThan(50);
    expect(flagged.length).toBeLessThan(400);
  });
});
