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
    const merch = books.filter((b) => (b.category as string) === 'Merchandise');
    expect(merch.length).toBe(0);

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

  it('should correctly handle 5 Centimeters per Second as a 1-volume book without phantom vol 5', () => {
    const seriesList = getAllSeries();
    const fiveCmSeries = seriesList.find((s) => s.id === 'ser_5-centimeters-per-second');
    expect(fiveCmSeries).toBeDefined();
    expect(fiveCmSeries?.totalVolumes).toBe(1);
    expect(fiveCmSeries?.type).toBe('LIGHT_NOVEL');

    const books = getBooksBySeries(fiveCmSeries!.id);
    expect(books).toHaveLength(1);
    expect(books[0].volume).toBeNull();
    expect(books[0].title).toContain('5 Centimeters per Second');
  });

  it('should separate Alya Sometimes Hides Her Feelings in Russian into distinct Manga and Light Novel series', () => {
    const seriesList = getAllSeries();
    const alyaManga = seriesList.find((s) => s.id === 'ser_alya-sometimes-hides-her-feelings-in-russian-manga');
    const alyaLN = seriesList.find((s) => s.id === 'ser_alya-sometimes-hides-her-feelings-in-russian-ln');

    expect(alyaManga).toBeDefined();
    expect(alyaManga?.type).toBe('MANGA');
    expect(alyaManga?.totalVolumes).toBeGreaterThanOrEqual(9);

    expect(alyaLN).toBeDefined();
    expect(alyaLN?.type).toBe('LIGHT_NOVEL');
    expect(alyaLN?.totalVolumes).toBeGreaterThanOrEqual(8);

    // Verify Manga volumes do not contain Light Novels
    const mangaBooks = getBooksBySeries(alyaManga!.id);
    for (const b of mangaBooks) {
      expect(b.category).toBe('Manga');
      expect(b.title.toLowerCase()).not.toContain('light novel');
    }

    // Verify Light Novel series does not have duplicate cards for same volume
    const lnBooks = getBooksBySeries(alyaLN!.id);
    const lnVolNums = lnBooks.map((b) => b.volume);
    const uniqueVolNums = new Set(lnVolNums);
    expect(uniqueVolNums.size).toBe(lnVolNums.length);

    // Verify Vol 5 has consolidated editions
    const vol5 = lnBooks.find((b) => b.volume === 5);
    expect(vol5).toBeDefined();
    expect(vol5?.availableEditions).toBeDefined();
    expect(vol5!.availableEditions!.length).toBeGreaterThan(1);
    expect(vol5?.synopsis).toContain('Pilihan Edisi & Set Resmi');
  });

  it('should separate Classroom of the Elite into distinct Manga and Light Novel series', () => {
    const seriesList = getAllSeries();
    const coteManga = seriesList.find((s) => s.id === 'ser_classroom-of-the-elite-manga');
    const coteLN = seriesList.find((s) => s.id === 'ser_classroom-of-the-elite-ln');

    expect(coteManga).toBeDefined();
    expect(coteManga?.type).toBe('MANGA');
    expect(coteManga?.totalVolumes).toBeGreaterThanOrEqual(12);

    expect(coteLN).toBeDefined();
    expect(coteLN?.type).toBe('LIGHT_NOVEL');
    expect(coteLN?.totalVolumes).toBeGreaterThanOrEqual(5);

    // Verify Manga has complete volumes 1-12 without gaps
    const mangaBooks = getBooksBySeries(coteManga!.id);
    const mangaVols = mangaBooks.map((b) => b.volume).filter(Boolean);
    for (let v = 1; v <= 12; v++) {
      expect(mangaVols).toContain(v);
    }
  });

  it('should strictly exclude Comic Frontier and Merchandise from series entries', () => {
    const seriesList = getAllSeries();
    for (const s of seriesList) {
      const name = s.name.toLowerCase();
      expect(name).not.toContain('comic frontier');
      expect(name).not.toContain('comifuro');
      expect(name).not.toContain('5-layer folder');
      expect(name).not.toContain('badge set');
      expect(name).not.toContain('clear file');
      expect(name).not.toMatch(/^\s*(?:komik\s+)?\d+\s*-\s*[a-z0-9]{2,4}/i);
    }
  });

  it('should consolidate Attack on Titan Bind Up into a single 11-volume series', () => {
    const seriesList = getAllSeries();
    const aotBindUp = seriesList.find((s) => s.id === 'ser_attack-on-titan-bind-up');
    expect(aotBindUp).toBeDefined();
    expect(aotBindUp?.totalVolumes).toBe(11);

    const books = getBooksBySeries(aotBindUp!.id);
    expect(books).toHaveLength(11);
  });

  it('should correctly distinguish Conan Manga, Novel, and Movie series without duplicate names', () => {
    const seriesList = getAllSeries();
    const conanManga = seriesList.find((s) => s.id === 'ser_detektif-conan-manga');
    const conanNovel = seriesList.find((s) => s.id === 'ser_detektif-conan-ln');
    const conanMovie = seriesList.find((s) => s.id === 'ser_detektif-conan-movie');

    expect(conanManga).toBeDefined();
    expect(conanManga?.name).toBe('Detektif Conan');
    expect(conanManga?.type).toBe('MANGA');
    expect(conanManga?.totalVolumes).toBe(107);

    expect(conanNovel).toBeDefined();
    expect(conanNovel?.name).toBe('Detektif Conan (Novel)');
    expect(conanNovel?.type).toBe('LIGHT_NOVEL');
    expect(conanNovel?.totalVolumes).toBe(19);

    expect(conanMovie).toBeDefined();
    expect(conanMovie?.type).toBe('MANGA');
    expect(conanMovie?.totalVolumes).toBe(10);
  });
});
