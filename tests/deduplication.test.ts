import { describe, it, expect } from 'vitest';
import { consolidateCatalog } from '../src/lib/data/deduplicator';
import { Book } from '../src/lib/types';

describe('Deduplication & Entity Resolution Engine', () => {
  it('should separate same franchise into distinct Manga and Light Novel series', () => {
    const mockBooks: Book[] = [
      {
        id: 'book_alya_manga_1',
        slug: 'alya-manga-1',
        title: 'Komik: Alya Sometimes Hides Her Feelings in Russian 1',
        category: 'Manga',
        publisherId: 'pub_pgi',
        publisherName: 'Phoenix Gramedia Indonesia',
        publisherShortName: 'PGI',
        currentPrice: 45000,
        authors: ['Sunsunsun', 'Saho Tenamachi'],
        genres: ['Manga'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        seriesName: 'Alya Sometimes Hides Her Feelings in Russian',
        volume: 1,
      },
      {
        id: 'book_alya_ln_1',
        slug: 'alya-ln-1',
        title: 'Light Novel: Alya Sometimes Hides Her Feelings in Russian 1',
        category: 'Light Novel',
        publisherId: 'pub_pgi',
        publisherName: 'Phoenix Gramedia Indonesia',
        publisherShortName: 'PGI',
        currentPrice: 88000,
        authors: ['Sunsunsun', 'Momoco'],
        genres: ['Light Novel'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        seriesName: 'Alya Sometimes Hides Her Feelings in Russian',
        volume: 1,
      },
    ];

    const result = consolidateCatalog({ books: mockBooks });
    expect(result.canonicalBooks).toHaveLength(2);
    expect(result.seriesList).toHaveLength(2);

    const mangaSeries = result.seriesList.find((s) => s.type === 'MANGA');
    const lnSeries = result.seriesList.find((s) => s.type === 'LIGHT_NOVEL');

    expect(mangaSeries).toBeDefined();
    expect(mangaSeries?.id).toContain('manga');
    expect(lnSeries).toBeDefined();
    expect(lnSeries?.id).toContain('ln');
  });

  it('should consolidate special sets and limited editions into availableEditions of canonical volume', () => {
    const mockBooks: Book[] = [
      {
        id: 'book_cote_reg',
        slug: 'cote-vol-5-reg',
        title: 'Classroom of the Elite Vol. 5',
        category: 'Light Novel',
        publisherId: 'pub_pgi',
        publisherName: 'PGI',
        publisherShortName: 'PGI',
        currentPrice: 98000,
        authors: ['Syougo Kinugasa'],
        genres: ['Light Novel'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        seriesName: 'Classroom of the Elite',
        volume: 5,
      },
      {
        id: 'book_cote_special',
        slug: 'cote-vol-5-special',
        title: 'Classroom of the Elite Vol. 5 - Special Set',
        category: 'Light Novel',
        publisherId: 'pub_pgi',
        publisherName: 'PGI',
        publisherShortName: 'PGI',
        currentPrice: 225000,
        authors: ['Syougo Kinugasa'],
        genres: ['Light Novel'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        seriesName: 'Classroom of the Elite',
        volume: 5,
      },
    ];

    const result = consolidateCatalog({ books: mockBooks });
    expect(result.canonicalBooks).toHaveLength(1);
    const canonical = result.canonicalBooks[0];
    expect(canonical.availableEditions).toBeDefined();
    expect(canonical.availableEditions).toHaveLength(2);
    expect(canonical.availableEditions?.map((e) => e.name)).toContain('Special Set');
  });

  it('should prioritize regular edition as canonical book even when special set appears first', () => {
    const mockBooks: Book[] = [
      {
        id: 'book_oshi_special',
        slug: 'oshi-no-ko-1-special',
        title: 'Oshi no Ko 1 Special Set',
        category: 'Manga',
        publisherId: 'pub_mc',
        publisherName: 'm&c!',
        publisherShortName: 'm&c!',
        currentPrice: 150000,
        authors: ['Aka Akasaka'],
        genres: ['Manga'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        seriesName: 'Oshi no Ko',
        volume: 1,
      },
      {
        id: 'book_oshi_reg',
        slug: 'oshi-no-ko-1-reg',
        title: 'Oshi no Ko 1',
        category: 'Manga',
        publisherId: 'pub_mc',
        publisherName: 'm&c!',
        publisherShortName: 'm&c!',
        currentPrice: 48000,
        authors: ['Aka Akasaka'],
        genres: ['Manga'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        seriesName: 'Oshi no Ko',
        volume: 1,
      },
    ];

    const result = consolidateCatalog({ books: mockBooks });
    expect(result.canonicalBooks).toHaveLength(1);
    const canonical = result.canonicalBooks[0];
    expect(canonical.title).toBe('Oshi no Ko 1');
    expect(canonical.currentPrice).toBe(48000);
    expect(canonical.availableEditions).toHaveLength(2);
  });
});
