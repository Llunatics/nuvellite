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
  it('should contain official publishers and Gramedia as merchandise provider', () => {
    const publishers = getPublishers();
    expect(publishers).toHaveLength(4);

    const ids = publishers.map((p) => p.id);
    expect(ids).toContain('pub_elex');
    expect(ids).toContain('pub_mnc');
    expect(ids).toContain('pub_pgi');
    expect(ids).toContain('pub_gramedia');
  });

  it('should only contain books with category Manga, Light Novel, or Merchandise', () => {
    const books = getAllBooks();
    expect(books.length).toBeGreaterThan(2000);

    for (const book of books) {
      expect(['Manga', 'Light Novel', 'Merchandise']).toContain(book.category);
      expect(['pub_elex', 'pub_mnc', 'pub_pgi', 'pub_gramedia']).toContain(book.publisherId);
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

  it('should strictly isolate Merchandise with Gramedia provider and null volume', () => {
    const books = getAllBooks();
    const merchItems = books.filter((b) => b.category === 'Merchandise');
    expect(merchItems.length).toBeGreaterThan(15);

    for (const item of merchItems) {
      expect(item.category).toBe('Merchandise');
      expect(item.publisherId).toBe('pub_gramedia');
      expect(item.publisherShortName).toBe('Gramedia');
      expect(item.volume).toBeNull();
      expect(item.gramediaUrl).toBeTruthy();
    }
  });

  it('should correctly calculate catalog stats including merchandise', () => {
    const stats = getStats();
    expect(stats.totalBooks).toBeGreaterThan(2000);
    expect(stats.mangaCount).toBeGreaterThan(1500);
    expect(stats.lnCount).toBeGreaterThan(200);
    expect(stats.merchCount).toBeGreaterThan(15);
    expect(stats.totalSeries).toBeGreaterThan(300);
    expect(stats.publishers.gramedia).toBe(stats.merchCount);
  });

  it('should search books and merchandise by title, author, or category', () => {
    const frierenRes = searchCatalog('frieren');
    expect(frierenRes.length).toBeGreaterThan(0);
    expect(frierenRes[0].title.toLowerCase()).toContain('frieren');

    const merchRes = searchCatalog('merchandise');
    expect(merchRes.length).toBeGreaterThan(0);
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
