import { describe, it, expect } from 'vitest';
import { consolidateCatalog } from '../src/lib/data/deduplicator';
import { Book, Series } from '../src/lib/types';

describe('Out of Stock, Gap Recovery & Catalog Reconciliation', () => {
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

  it('should retain out-of-stock books in the canonical catalog and include them in series volume count', () => {
    const books: Book[] = [
      {
        ...baseBook,
        id: 'b_vol1',
        slug: 'test-manga-vol-01',
        title: 'Test Manga Vol. 01',
        seriesId: 'ser_test_manga',
        seriesName: 'Test Manga',
        volume: 1,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol2',
        slug: 'test-manga-vol-02',
        title: 'Test Manga Vol. 02',
        seriesId: 'ser_test_manga',
        seriesName: 'Test Manga',
        volume: 2,
        availability: 'OUT_OF_STOCK', // Out of stock!
      },
      {
        ...baseBook,
        id: 'b_vol3',
        slug: 'test-manga-vol-03',
        title: 'Test Manga Vol. 03',
        seriesId: 'ser_test_manga',
        seriesName: 'Test Manga',
        volume: 3,
        availability: 'AVAILABLE',
      },
    ];

    const { canonicalBooks, seriesList } = consolidateCatalog({ books });

    // All 3 volumes must remain in canonical catalog
    expect(canonicalBooks.length).toBe(3);
    const vol2 = canonicalBooks.find((b) => b.volume === 2);
    expect(vol2).toBeDefined();
    expect(vol2?.availability).toBe('OUT_OF_STOCK');

    // Series must recognize all 3 volumes, NOT just the 2 in-stock ones
    expect(seriesList.length).toBe(1);
    const series = seriesList[0];
    expect(series.totalVolumes).toBe(3);
    expect(series.availableVolumes).toEqual([1, 2, 3]);
    expect(series.missingVolumes).toEqual([]);
  });

  it('should detect sequence gaps when a volume is missing from known releases', () => {
    // Sequence has Vol 1, 2, 4, 5 (Vol 3 is missing)
    const books: Book[] = [
      {
        ...baseBook,
        id: 'b_vol1',
        slug: 'gap-manga-vol-01',
        title: 'Gap Manga Vol. 01',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 1,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol2',
        slug: 'gap-manga-vol-02',
        title: 'Gap Manga Vol. 02',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 2,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol4',
        slug: 'gap-manga-vol-04',
        title: 'Gap Manga Vol. 04',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 4,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol5',
        slug: 'gap-manga-vol-05',
        title: 'Gap Manga Vol. 05',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 5,
        availability: 'AVAILABLE',
      },
    ];

    const { seriesList } = consolidateCatalog({ books });
    expect(seriesList.length).toBe(1);
    const series = seriesList[0];
    expect(series.latestVolume).toBe(5);
    // Vol 3 is detected as missing from known sequence
    expect(series.missingVolumes).toEqual([3]);
  });

  it('should resolve sequence gap when the missing volume is recovered as OUT_OF_STOCK', () => {
    const books: Book[] = [
      {
        ...baseBook,
        id: 'b_vol1',
        slug: 'gap-manga-vol-01',
        title: 'Gap Manga Vol. 01',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 1,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol2',
        slug: 'gap-manga-vol-02',
        title: 'Gap Manga Vol. 02',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 2,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol3',
        slug: 'gap-manga-vol-03',
        title: 'Gap Manga Vol. 03',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 3,
        availability: 'OUT_OF_STOCK', // Discovered as OOS
      },
      {
        ...baseBook,
        id: 'b_vol4',
        slug: 'gap-manga-vol-04',
        title: 'Gap Manga Vol. 04',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 4,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_vol5',
        slug: 'gap-manga-vol-05',
        title: 'Gap Manga Vol. 05',
        seriesId: 'ser_gap_manga',
        seriesName: 'Gap Manga',
        volume: 5,
        availability: 'AVAILABLE',
      },
    ];

    const { seriesList, canonicalBooks } = consolidateCatalog({ books });
    expect(canonicalBooks.length).toBe(5);
    const series = seriesList[0];
    // Gap resolved: missingVolumes is now empty, Vol 3 is recognized as known catalog item
    expect(series.missingVolumes).toEqual([]);
    expect(series.availableVolumes).toEqual([1, 2, 3, 4, 5]);
  });

  it('should prioritize Regular edition as canonical even when Special Set is available and Regular is OUT_OF_STOCK', () => {
    const books: Book[] = [
      {
        ...baseBook,
        id: 'b_reg',
        slug: 'manga-vol-05',
        title: 'Hero Manga Vol. 05',
        seriesId: 'ser_hero_manga',
        seriesName: 'Hero Manga',
        volume: 5,
        editionType: 'REGULAR',
        isSetVariant: false,
        currentPrice: 45000,
        availability: 'OUT_OF_STOCK', // Regular is OOS
      },
      {
        ...baseBook,
        id: 'b_special',
        slug: 'manga-vol-05-special-set',
        title: 'Hero Manga Vol. 05 - Special Set',
        seriesId: 'ser_hero_manga',
        seriesName: 'Hero Manga',
        volume: 5,
        editionType: 'SPECIAL_SET',
        isSetVariant: true,
        currentPrice: 125000,
        availability: 'AVAILABLE', // Special Set is in stock
      },
    ];

    const { canonicalBooks } = consolidateCatalog({ books });
    expect(canonicalBooks.length).toBe(1);
    const canonical = canonicalBooks[0];

    // Canonical representation must be the Regular edition
    expect(canonical.editionType).toBe('REGULAR');
    expect(canonical.currentPrice).toBe(45000);
    expect(canonical.availability).toBe('OUT_OF_STOCK');

    // Special edition is attached as an available edition option
    expect(canonical.availableEditions?.length).toBe(2);
    const specialOpt = canonical.availableEditions?.find((e) => e.editionType === 'SPECIAL_SET');
    expect(specialOpt).toBeDefined();
    expect(specialOpt?.isAvailable).toBe(true);
    expect(specialOpt?.price).toBe(125000);
  });

  it('should cleanly split Manga and Light Novel from the same franchise into separate series', () => {
    const books: Book[] = [
      {
        ...baseBook,
        id: 'b_ln1',
        slug: 'light-novel-the-eminence-in-shadow-1',
        title: 'Light Novel The Eminence in Shadow 1',
        seriesName: 'The Eminence in Shadow',
        volume: 1,
        category: 'Light Novel',
        format: 'LIGHT_NOVEL',
        publisherId: 'pub_pgi',
        currentPrice: 103500,
        originalPrice: 103500,
        availability: 'AVAILABLE',
      },
      {
        ...baseBook,
        id: 'b_manga14',
        slug: 'the-eminence-in-shadow-14',
        title: 'The Eminence in Shadow 14',
        seriesName: 'The Eminence in Shadow',
        volume: 14,
        category: 'Manga',
        format: 'MANGA',
        publisherId: 'pub_pgi',
        currentPrice: 58500,
        originalPrice: 58500,
        availability: 'AVAILABLE',
      },
    ];

    const { canonicalBooks, seriesList } = consolidateCatalog({ books });
    expect(seriesList.length).toBe(2);

    const mangaSeries = seriesList.find((s) => s.id === 'ser_the-eminence-in-shadow-manga');
    const lnSeries = seriesList.find((s) => s.id === 'ser_the-eminence-in-shadow-ln');

    expect(mangaSeries).toBeDefined();
    expect(mangaSeries?.type).toBe('MANGA');
    expect(mangaSeries?.name).toBe('The Eminence in Shadow');

    expect(lnSeries).toBeDefined();
    expect(lnSeries?.type).toBe('LIGHT_NOVEL');
    expect(lnSeries?.name).toBe('The Eminence in Shadow (Novel)');

    const mangaBook = canonicalBooks.find((b) => b.id === 'b_manga14');
    const lnBook = canonicalBooks.find((b) => b.id === 'b_ln1');

    expect(mangaBook?.seriesId).toBe('ser_the-eminence-in-shadow-manga');
    expect(mangaBook?.category).toBe('Manga');
    expect(mangaBook?.format).toBe('MANGA');

    expect(lnBook?.seriesId).toBe('ser_the-eminence-in-shadow-ln');
    expect(lnBook?.category).toBe('Light Novel');
    expect(lnBook?.format).toBe('LIGHT_NOVEL');
  });
});
