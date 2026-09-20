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
  it('should contain official Indonesian manga and light novel publishers', () => {
    const publishers = getPublishers();
    expect(publishers).toHaveLength(3);

    const ids = publishers.map((p) => p.id);
    expect(ids).toContain('pub_elex');
    expect(ids).toContain('pub_mnc');
    expect(ids).toContain('pub_pgi');
    expect(ids).not.toContain('pub_gramedia');
  });

  it('should only contain books with category Manga or Light Novel', () => {
    const books = getAllBooks();
    expect(books.length).toBeGreaterThan(2000);

    for (const book of books) {
      expect(['Manga', 'Light Novel']).toContain(book.category);
      expect(['pub_elex', 'pub_mnc', 'pub_pgi']).toContain(book.publisherId);
      expect(book.title).toBeTruthy();
      expect(book.slug).toBeTruthy();
      // Verify gramediaUrl is always present for external store button
      expect(book.gramediaUrl).toBeTruthy();
      expect(book.gramediaUrl).toMatch(/^https:\/\/www\.gramedia\.com\/products\//);
      // Verify authors are clean strings (no raw object or [object Object])
      for (const author of book.authors) {
        expect(typeof author).toBe('string');
        expect(author).not.toContain('[object Object]');
      }
    }
  });

  it('should strictly exclude Merchandise to focus 100% on Manga and Light Novel', () => {
    const books = getAllBooks();
    const merchItems = books.filter((b) => (b.category as string) === 'Merchandise');
    expect(merchItems).toHaveLength(0);
  });

  it('should correctly calculate catalog stats', () => {
    const stats = getStats();
    expect(stats.totalBooks).toBeGreaterThan(2000);
    expect(stats.mangaCount).toBeGreaterThan(1500);
    expect(stats.lnCount).toBeGreaterThan(200);
    expect(stats.merchCount).toBe(0);
    expect(stats.totalSeries).toBeGreaterThan(300);
  });

  it('should search books by title, author, or category', () => {
    const frierenRes = searchCatalog('frieren');
    expect(frierenRes.length).toBeGreaterThan(0);
    expect(frierenRes[0].title.toLowerCase()).toContain('frieren');
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
