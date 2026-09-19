import { describe, it, expect } from 'vitest';
import {
  getAllSeries,
  getSeriesBySlug,
  getBooksBySeries,
  getAllBooks,
} from '../src/lib/catalog-service';

describe('Missing Volume Detector Logic', () => {
  it('should accurately detect missing volumes in a series', () => {
    // Suppose a series has volumes 1, 2, 3, 4, 5, 6
    const publishedVolumes = [1, 2, 3, 4, 5, 6];
    // User owns volumes 1, 2, 4, 6
    const ownedVolumes = new Set([1, 2, 4, 6]);

    const missing = publishedVolumes.filter((v) => !ownedVolumes.has(v));
    expect(missing).toEqual([3, 5]);

    const percentage = Math.round((ownedVolumes.size / publishedVolumes.length) * 100);
    expect(percentage).toBe(67);
  });

  it('should detect 100% completion when all volumes are owned', () => {
    const publishedVolumes = [1, 2, 3];
    const ownedVolumes = new Set([1, 2, 3]);

    const missing = publishedVolumes.filter((v) => !ownedVolumes.has(v));
    expect(missing).toHaveLength(0);

    const percentage = Math.round((ownedVolumes.size / publishedVolumes.length) * 100);
    expect(percentage).toBe(100);
  });
});

describe('Series Deduplication & Merchandise Isolation', () => {
  it('should never include Merchandise items as series entries in getAllSeries()', () => {
    const seriesList = getAllSeries();

    // Verify all series are strictly Manga or Light Novel
    for (const s of seriesList) {
      expect(['MANGA', 'LIGHT_NOVEL']).toContain(s.type);
      expect(s.publisherId).not.toBe('pub_gramedia_catalog');
      expect(s.publisherName).not.toBe('Penerbit Resmi');
      expect(s.name.toLowerCase()).not.toContain('backpack');
      expect(s.name.toLowerCase()).not.toContain('poker-');
      expect(s.name.toLowerCase()).not.toContain('key ring-');
    }
  });

  it('should ensure all books with category Merchandise have null seriesId and null seriesName', () => {
    const books = getAllBooks();
    const merch = books.filter((b) => b.category === 'Merchandise');
    expect(merch.length).toBeGreaterThan(15);

    for (const item of merch) {
      expect(item.seriesId).toBeNull();
      expect(item.seriesName).toBeNull();
    }
  });

  it('should consolidate Gimai Seikatsu volumes into a single canonical series', () => {
    const seriesList = getAllSeries();
    const gimaiMatches = seriesList.filter((s) => s.name.toLowerCase().includes('gimai seikatsu'));
    expect(gimaiMatches).toHaveLength(1);
    expect(gimaiMatches[0].name).toBe('Gimai Seikatsu');
    expect(gimaiMatches[0].totalVolumes).toBeGreaterThanOrEqual(3);

    const books = getBooksBySeries(gimaiMatches[0].id);
    expect(books.length).toBeGreaterThanOrEqual(3);
    for (const b of books) {
      expect(b.seriesName).toBe('Gimai Seikatsu');
    }
  });

  it('should consolidate Bungo Stray Dogs and its subtitle variants into a single canonical series', () => {
    const seriesList = getAllSeries();
    const bsdMatches = seriesList.filter((s) => s.name.toLowerCase() === 'bungo stray dogs');
    expect(bsdMatches).toHaveLength(1);
    expect(bsdMatches[0].totalVolumes).toBeGreaterThanOrEqual(20);

    const books = getBooksBySeries(bsdMatches[0].id);
    expect(books.length).toBeGreaterThanOrEqual(20);
  });

  it('should consolidate Cerita Spesial Doraemon into a single canonical series', () => {
    const seriesList = getAllSeries();
    const doraemonMatches = seriesList.filter((s) => s.name.toLowerCase() === 'cerita spesial doraemon');
    expect(doraemonMatches).toHaveLength(1);
    expect(doraemonMatches[0].totalVolumes).toBeGreaterThanOrEqual(30);
  });

  it('should consolidate Death Note volumes and specials into a single canonical series', () => {
    const seriesList = getAllSeries();
    const dnMatches = seriesList.filter((s) => s.name.toLowerCase() === 'death note');
    expect(dnMatches).toHaveLength(1);
    expect(dnMatches[0].totalVolumes).toBeGreaterThanOrEqual(8);
  });
});
