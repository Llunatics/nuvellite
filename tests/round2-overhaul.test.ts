import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fullCatalogData from '../src/data/catalog.json';
import listingCatalogData from '../src/data/catalog-listing.json';
import announcementsData from '../src/data/announcements.json';
import { archiveEntryToSeries } from '../src/lib/kki-service';
import {
  buildClusterKey,
  effectiveState,
  isSafeSeriesLink,
} from '../src/lib/announcement-service';
import type { KkiArchiveEntry, PublisherAnnouncement } from '../src/lib/types';

/**
 * Round 2 Block 10 — regression guards.
 *
 * Pins the bind-up / dual-medium groupings that lossy catalog re-grouping
 * damaged in the past (Naruto, Classroom of the Elite, Detective Conan,
 * Bungo Stray Dogs), the KKI archive cover fallback fixed in Pass B, and
 * the Radar Lisensi invariants from S5. Counts were measured from the
 * catalog on 2026-11-10 (after the 2026-11-10 KKI sync merged in); if a
 * legitimate sync changes them, update the pins deliberately — never let
 * a re-grouping script change them silently.
 */

interface CatalogShape {
  series: { id: string }[];
  books: { seriesId: string }[];
}

const catalogs: [string, CatalogShape][] = [
  ['catalog.json', fullCatalogData as unknown as CatalogShape],
  ['catalog-listing.json', listingCatalogData as unknown as CatalogShape],
];

function bookCount(catalog: CatalogShape, seriesId: string): number {
  return catalog.books.filter((b) => b.seriesId === seriesId).length;
}

function seriesExists(catalog: CatalogShape, seriesId: string): boolean {
  return catalog.series.some((s) => s.id === seriesId);
}

/** Protected groupings: seriesId -> exact book count (measured 2026-11-10). */
const PROTECTED_SERIES: Record<string, number> = {
  'ser_naruto-bind-up': 30,
  'ser_naruto': 1,
  'ser_classroom-of-the-elite-ln': 5,
  'ser_classroom-of-the-elite-manga': 8,
  'ser_classroom-of-the-elite-2nd-year-ln': 4,
  'ser_classroom-of-the-elite-2nd-year-manga': 4,
  'ser_detektif-conan': 9,
  'ser_detektif-conan-premium': 27,
  'ser_detektif-conan-zero-the-enforcer': 2,
  'ser_bungo-stray-dogs': 22,
};

describe('Block 10: protected catalog groupings stay intact', () => {
  for (const [name, catalog] of catalogs) {
    describe(name, () => {
      for (const [seriesId, expected] of Object.entries(PROTECTED_SERIES)) {
        it(`${seriesId} exists with ${expected} books`, () => {
          expect(seriesExists(catalog, seriesId)).toBe(true);
          expect(bookCount(catalog, seriesId)).toBe(expected);
        });
      }

      it('Naruto bind-up books never leak into the regular series', () => {
        const bindUpBooks = new Set(
          catalog.books
            .filter((b) => b.seriesId === 'ser_naruto-bind-up')
            .map((b) => b.seriesId),
        );
        expect(bindUpBooks.size).toBe(1);
        expect(bookCount(catalog, 'ser_naruto-bind-up')).toBeGreaterThan(
          bookCount(catalog, 'ser_naruto'),
        );
      });

      it('Classroom of the Elite manga and LN stay separate series', () => {
        expect(
          bookCount(catalog, 'ser_classroom-of-the-elite-ln'),
        ).not.toBe(bookCount(catalog, 'ser_classroom-of-the-elite-manga'));
      });
    });
  }
});

describe('Block 10: archiveEntryToSeries cover fallback (Pass B)', () => {
  const base: KkiArchiveEntry = {
    id: 'test-entry',
    slug: 'test-entry',
    title: 'Test Entry',
    medium: 'MANGA',
  };

  it('falls back to pranalaCover when MU cover is empty', () => {
    const series = archiveEntryToSeries({
      ...base,
      mu: { status: 'ok', cover: '   ' },
      pranalaCover: 'https://example.com/pranala.jpg',
    });
    expect(series.coverImage).toBe('https://example.com/pranala.jpg');
  });

  it('falls back to pranalaCover when MU status is not ok', () => {
    const series = archiveEntryToSeries({
      ...base,
      mu: { status: 'blocked', cover: 'https://example.com/mu.jpg' },
      pranalaCover: 'https://example.com/pranala.jpg',
    });
    expect(series.coverImage).toBe('https://example.com/pranala.jpg');
  });

  it('prefers the MU cover when present', () => {
    const series = archiveEntryToSeries({
      ...base,
      mu: { status: 'ok', cover: 'https://example.com/mu.jpg' },
      pranalaCover: 'https://example.com/pranala.jpg',
    });
    expect(series.coverImage).toBe('https://example.com/mu.jpg');
  });
});

describe('Block 10: repair-catalog.py runtime guard (S6.2)', () => {
  it('exits with the FORBIDDEN message before doing any work', () => {
    const source = readFileSync(
      join(__dirname, '..', 'scripts', 'repair-catalog.py'),
      'utf-8',
    );
    expect(source).toContain(
      'FORBIDDEN: repair-catalog.py is disabled to protect bind-up groupings',
    );
    // The guard must sit above main() so no invocation path reaches it.
    expect(source.indexOf('FORBIDDEN')).toBeLessThan(source.indexOf('def main'));
  });
});

describe('Block 10: Radar Lisensi invariants (S5)', () => {
  const announcements = announcementsData as PublisherAnnouncement[];

  it('seed data is non-empty and every record carries verified source URLs', () => {
    expect(announcements.length).toBeGreaterThan(0);
    for (const a of announcements) {
      expect(a.sources.length).toBeGreaterThan(0);
      for (const s of a.sources) {
        expect(s.url).toMatch(/^https:\/\//);
      }
      expect(a.confidence).toBeGreaterThan(0);
      expect(a.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('cluster keys are unique across the seed (no duplicate cards)', () => {
    const keys = announcements.map((a) =>
      buildClusterKey({
        publisherId: a.publisherId,
        medium: a.category === 'Light Novel' ? 'LIGHT_NOVEL' : 'MANGA',
        editionType: a.editionKind,
        canonicalTitle: a.title,
      }),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('release windows are verbatim strings, never fabricated ISO dates', () => {
    for (const a of announcements) {
      if (a.expectedReleaseWindow) {
        expect(a.expectedReleaseWindow).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('bind-up-safe linking refuses cross-edition and cross-medium links', () => {
    const regularManga = {
      editionKind: 'REGULAR' as const,
      category: 'Manga' as const,
      title: 'Naruto',
    };
    expect(isSafeSeriesLink(regularManga, 'ser_naruto-bind-up')).toBe(false);
    expect(isSafeSeriesLink(regularManga, 'ser_naruto')).toBe(true);
    const bindUp = { ...regularManga, editionKind: 'BIND_UP' as const, title: 'Naruto Bind Up' };
    expect(isSafeSeriesLink(bindUp, 'ser_naruto-bind-up')).toBe(true);
    const ln = {
      editionKind: 'REGULAR' as const,
      category: 'Light Novel' as const,
      title: 'Classroom of the Elite',
    };
    expect(isSafeSeriesLink(ln, 'ser_classroom-of-the-elite-ln')).toBe(true);
    expect(isSafeSeriesLink(ln, 'ser_classroom-of-the-elite-manga')).toBe(false);
  });

  it('a stale SPOTTED record collapses to STALE_HOLD after 540 days', () => {
    const old: PublisherAnnouncement = {
      ...announcements[0],
      state: 'SPOTTED',
      firstSeenAt: '2024-01-01',
    };
    expect(effectiveState(old, new Date('2026-11-10T00:00:00Z'))).toBe('STALE_HOLD');
    const fresh: PublisherAnnouncement = {
      ...announcements[0],
      state: 'SPOTTED',
      firstSeenAt: '2026-11-01',
    };
    expect(effectiveState(fresh, new Date('2026-11-10T00:00:00Z'))).toBe('SPOTTED');
  });
});
