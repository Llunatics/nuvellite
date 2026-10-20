import { describe, it, expect } from 'vitest';
import { consolidateCatalog } from '../src/lib/data/deduplicator';
import {
  resolveBaseAlias,
  resolveMediumAlias,
  SERIES_BASE_ALIASES,
  SERIES_MEDIUM_ALIASES,
} from '../src/lib/series-consistency';
import type { Book } from '../src/lib/types';

/**
 * Regression tests for the canonical franchise aliases
 * (2026-10-20 audit).
 *
 * Background: the 2026-10-12 consistency audit merged several split series
 * as one-time DATA edits. Later auto-syncs silently re-split them because
 * the pipeline had no memory of the merges. The aliases below are the
 * durable, code-level encoding of those merges — applied on every sync by
 * both the Python pipeline and this TS consolidator.
 */
describe('canonical franchise aliases', () => {
  it('resolves known base aliases', () => {
    expect(resolveBaseAlias('bungo-stray-dogs-beast')).toEqual([
      'bungo-stray-dogs',
      'Bungo Stray Dogs',
    ]);
    expect(resolveBaseAlias('naruto')).toEqual(['naruto', null]);
  });

  it('resolves known medium aliases', () => {
    expect(resolveMediumAlias('detektif-conan', 'MOVIE')).toEqual([
      'detektif-conan-the',
      'Detektif Conan The Movie',
    ]);
    expect(resolveMediumAlias('detektif-conan', 'MANGA')).toEqual([
      'detektif-conan',
      null,
    ]);
  });

  it("resolves the Re:Zero LN vendor-drift alias (deep-6, 2026-10-20)", () => {
    // Older feed: 'Re:Zero : Starting Life in Another World NN' (colon);
    // newer feed: 'Light Novel: Re:Zero - Starting Life in Another World - NN'.
    expect(
      resolveMediumAlias('rezero-starting-life-in-another-world', 'LIGHT_NOVEL')
    ).toEqual([
      'rezero---starting-life-in-another-world',
      'Re:Zero - Starting Life in Another World',
    ]);
    // The canonical dash form is idempotent (resolves to itself)...
    expect(
      resolveMediumAlias('rezero---starting-life-in-another-world', 'LIGHT_NOVEL')
    ).toEqual([
      'rezero---starting-life-in-another-world',
      'Re:Zero - Starting Life in Another World',
    ]);
    // ...and the alias is medium-scoped (a hypothetical Re:Zero manga base
    // with the colon form must NOT be folded into the LN series).
    expect(
      resolveMediumAlias('rezero-starting-life-in-another-world', 'MANGA')
    ).toEqual(['rezero-starting-life-in-another-world', null]);
  });

  it("resolves the Sasuke's Story vendor-typo alias (deep-6, 2026-10-20)", () => {
    expect(
      resolveBaseAlias(
        'naruto---sasukess-story---the-uchiha-and-the-heavenly-stardust'
      )
    ).toEqual([
      'naruto---sasukes-story---the-uchiha-and-the-heavenly-stardust',
      "Naruto - Sasuke's Story - The Uchiha and the Heavenly Stardust",
    ]);
  });

  it('keeps the Python and TS alias tables non-empty and documented', () => {
    // If you add an entry to scripts/catalog_consistency.py, add it here too.
    expect(Object.keys(SERIES_BASE_ALIASES).length).toBeGreaterThan(0);
    expect(Object.keys(SERIES_MEDIUM_ALIASES).length).toBeGreaterThan(0);
  });
});

const baseBook: Omit<Book, 'id' | 'slug' | 'title'> = {
  category: 'Manga',
  format: 'MANGA',
  publisherId: 'pub_elex',
  publisherName: 'Elex Media Komputindo',
  publisherShortName: 'Elex Media',
  authors: ['Test Author'],
  genres: ['Manga'],
  isWednesdayRelease: false,
  currentPrice: 45000,
  originalPrice: 45000,
  status: 'PUBLISHED',
};

function mkBook(
  id: string,
  title: string,
  seriesName: string,
  volume: number | null = null
): Book {
  return {
    ...baseBook,
    id,
    slug: id,
    title,
    seriesName,
    volume,
  };
}

describe('alias-driven consolidation (consolidateCatalog)', () => {
  it("merges 'Detektif Conan Movie' and 'Detektif Conan The Movie' into ser_detektif-conan-the", () => {
    const books = [
      mkBook('c1', 'Detektif Conan Movie: The Fist of Blue Sapphire', 'Detektif Conan Movie'),
      mkBook('c2', 'Detektif Conan The Movie: Zero the Enforcer 1', 'Detektif Conan The Movie', 1),
      mkBook('c3', 'Detektif Conan 1', 'Detektif Conan', 1),
    ];
    const { canonicalBooks, seriesList } = consolidateCatalog({ books });

    const movieSeries = seriesList.find((s) => s.id === 'ser_detektif-conan-the');
    expect(movieSeries).toBeDefined();
    expect(movieSeries?.name).toBe('Detektif Conan The Movie');
    expect(movieSeries?.type).toBe('MANGA');

    // No stray ser_detektif-conan-movie series may remain.
    expect(seriesList.some((s) => s.id === 'ser_detektif-conan-movie')).toBe(false);

    // The manga volume stays in its own medium-separated series.
    const mangaBooks = canonicalBooks.filter((b) => b.id === 'c3');
    expect(mangaBooks[0].seriesId).toBe('ser_detektif-conan-manga');
  });

  it('keeps the Movie suffix on a movie-only franchise display name', () => {
    const books = [
      mkBook('m1', 'Detektif Conan The Movie: The Time Bomb Skyscraper', 'Detektif Conan The Movie'),
    ];
    const { seriesList } = consolidateCatalog({ books });
    // Regression: the single-medium branch used to strip 'Movie' and render
    // the decayed name 'Detektif Conan The'.
    expect(seriesList).toHaveLength(1);
    expect(seriesList[0].name).toBe('Detektif Conan The Movie');
    expect(seriesList[0].name).not.toBe('Detektif Conan The');
  });

  it("merges 'Bungo Stray Dogs BEAST' into the canonical 'Bungo Stray Dogs' series", () => {
    const books = [
      mkBook('b1', 'Bungo Stray Dogs 1', 'Bungo Stray Dogs', 1),
      mkBook('b2', 'Bungo Stray Dogs - Beast 1', 'Bungo Stray Dogs BEAST', 1),
      mkBook('b3', 'Bungo Stray Dogs BEAST 2 – Special Set', 'Bungo Stray Dogs BEAST', 2),
    ];
    const { seriesList } = consolidateCatalog({ books });
    const matches = seriesList.filter((s) => s.name.toLowerCase() === 'bungo stray dogs');
    expect(matches).toHaveLength(1);
    expect(seriesList.some((s) => s.id === 'ser_bungo-stray-dogs-beast')).toBe(false);
  });

  it("folds 'Cerita Spesial Doraemon Edisi <subtitle>' into the canonical series", () => {
    const books = [
      mkBook(
        'd1',
        'Cerita Spesial Doraemon Edisi Musik yang Bergema Dungtek',
        'Cerita Spesial Doraemon Edisi Musik yang Bergema Dungtek'
      ),
    ];
    const { seriesList } = consolidateCatalog({ books });
    expect(seriesList).toHaveLength(1);
    expect(seriesList[0].id).toBe('ser_cerita-spesial-doraemon');
    expect(seriesList[0].name).toBe('Cerita Spesial Doraemon');
  });

  it('merges the Re:Zero LN vendor-drift series into one canonical series (deep-6)', () => {
    const lnBook = (
      id: string,
      title: string,
      seriesName: string,
      volume: number
    ): Book => ({
      ...baseBook,
      id,
      slug: id,
      title,
      seriesName,
      volume,
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      publisherShortName: 'PGI',
      category: 'Light Novel',
      format: 'LIGHT_NOVEL',
      genres: ['Light Novel', 'Isekai & Fantasi'],
    });
    const books = [
      lnBook(
        'r1',
        'Re:Zero : Starting Life in Another World 01',
        'Re:Zero : Starting Life in Another World',
        1
      ),
      lnBook(
        'r2',
        'Light Novel: Re:Zero - Starting Life in Another World - 21',
        'Light Novel: Re:Zero - Starting Life in Another World',
        21
      ),
    ];
    const { seriesList, canonicalBooks } = consolidateCatalog({ books });
    expect(seriesList).toHaveLength(1);
    expect(seriesList[0].id).toBe('ser_rezero---starting-life-in-another-world');
    expect(seriesList[0].name).toBe('Re:Zero - Starting Life in Another World');
    expect(seriesList[0].type).toBe('LIGHT_NOVEL');
    expect(
      canonicalBooks.every(
        (b) => b.seriesId === 'ser_rezero---starting-life-in-another-world'
      )
    ).toBe(true);
  });

  it("merges the 'Sasukess Story' typo series into Sasuke's Story (deep-6)", () => {
    const books = [
      mkBook(
        's1',
        "Naruto - Sasuke's Story - The Uchiha and the Heavenly Stardust 01",
        "Naruto - Sasuke's Story - The Uchiha and the Heavenly Stardust",
        1
      ),
      mkBook(
        's2',
        'Naruto - Sasukess Story - The Uchiha and the Heavenly Stardust 02',
        'Naruto - Sasukess Story - The Uchiha and the Heavenly Stardust',
        2
      ),
    ];
    const { seriesList, canonicalBooks } = consolidateCatalog({ books });
    expect(seriesList).toHaveLength(1);
    // NOTE: the TS cleanSlug() collapses repeated dashes, so the TS-side
    // canonical id is the single-dash form; the Python pipeline (production)
    // produces the triple-dash form 'ser_naruto---sasukes-story---...'.
    expect(seriesList[0].id).toBe(
      'ser_naruto-sasukes-story-the-uchiha-and-the-heavenly-stardust'
    );
    expect(seriesList[0].name).toBe(
      "Naruto - Sasuke's Story - The Uchiha and the Heavenly Stardust"
    );
    expect(canonicalBooks).toHaveLength(2);
  });
});
