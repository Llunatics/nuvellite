import { describe, it, expect } from 'vitest';
import {
  getAllBooks,
  getAllSeries,
  getPublishers,
  searchCatalog,
  getStats,
  getBookBySlug,
  getSeriesBySlug,
} from '../src/lib/catalog-service';
import { formatRupiah, formatDateWIB } from '../src/lib/formatters';

describe('Nuvellite Catalog Integrity', () => {
  it('should contain strictly 3 official publishers: Elex, m&c!, and PGI', () => {
    const publishers = getPublishers();
    expect(publishers).toHaveLength(3);

    const ids = publishers.map((p) => p.id);
    expect(ids).toContain('pub_elex');
    expect(ids).toContain('pub_mnc');
    expect(ids).toContain('pub_pgi');
  });

  it('should only contain books with category Manga or Light Novel', () => {
    const books = getAllBooks();
    expect(books.length).toBeGreaterThan(2000);

    for (const book of books) {
      expect(['Manga', 'Light Novel']).toContain(book.category);
      expect(['pub_elex', 'pub_mnc', 'pub_pgi']).toContain(book.publisherId);
      expect(book.title).toBeTruthy();
      expect(book.slug).toBeTruthy();
    }
  });

  it('should correctly calculate catalog stats', () => {
    const stats = getStats();
    expect(stats.totalBooks).toBeGreaterThan(2000);
    expect(stats.mangaCount).toBeGreaterThan(1500);
    expect(stats.lnCount).toBeGreaterThan(200);
    expect(stats.totalSeries).toBeGreaterThan(300);
  });

  it('should search books by title or author', () => {
    const res = searchCatalog('frieren');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].title.toLowerCase()).toContain('frieren');
  });

  it('should find book and series by slug', () => {
    const books = getAllBooks();
    const firstBook = books[0];
    const found = getBookBySlug(firstBook.slug);
    expect(found).toBeDefined();
    expect(found?.id).toBe(firstBook.id);

    const seriesList = getAllSeries();
    const firstSeries = seriesList[0];
    const foundSeries = getSeriesBySlug(firstSeries.slug);
    expect(foundSeries).toBeDefined();
    expect(foundSeries?.id).toBe(firstSeries.id);
  });
});

describe('Formatters', () => {
  it('should format Rupiah currency accurately', () => {
    expect(formatRupiah(45000)).toMatch(/Rp\s*45\.000/);
    expect(formatRupiah(120000)).toMatch(/Rp\s*120\.000/);
  });

  it('should format date to WIB text', () => {
    const formatted = formatDateWIB('2026-09-18T00:00:00Z');
    expect(formatted).toContain('Sep');
    expect(formatted).toContain('2026');
  });
});
