import { describe, it, expect } from 'vitest';
import { parseTitleSmart } from '../src/lib/data/volume-parser';
import { classifyProduct } from '../src/lib/data/classifier';
import { consolidateCatalog, cleanBaseFranchise } from '../src/lib/data/deduplicator';
import { detectBindUp } from '../src/lib/data/edition-detector';
import type { Book } from '../src/lib/types';

describe('Overhaul Regression Suite (Audit 2026-11-07)', () => {
  it('V-01: does NOT truncate titles containing the word "End" mid-title', () => {
    const frieren = parseTitleSmart("Frieren: Beyond Journey's End Vol. 11");
    expect(frieren.volume).toBe(11);
    expect(frieren.seriesName).toBe("Frieren: Beyond Journey's End");

    const loveGame = parseTitleSmart('I Want to End This Love Game 01');
    expect(loveGame.volume).toBe(1);
    expect(loveGame.seriesName).toBe('I Want to End This Love Game');

    const platinum = parseTitleSmart('Platinum End 14');
    expect(platinum.volume).toBe(14);
    expect(platinum.seriesName).toBe('Platinum End');
    expect(cleanBaseFranchise('Platinum End').canonicalName).toBe('Platinum End');
  });

  it('V-02 & V-03: parses #N volumes and preserves single-letter prefixes', () => {
    const parry1 = parseTitleSmart('I "Parry" Everything #1');
    expect(parry1.volume).toBe(1);
    expect(parry1.seriesName).toBe('I "Parry" Everything');

    const vendetta = parseTitleSmart('V - Vendetta 01');
    expect(vendetta.volume).toBe(1);
    expect(vendetta.seriesName).toBe('V - Vendetta');
  });

  it('V-04 & V-05: handles "X of Y", "N in 1", and preserves spin-off subtitles', () => {
    const mukai = parseTitleSmart('Jurnal Mukai Usagido 6 of 8');
    expect(mukai.volume).toBe(6);
    expect(mukai.seriesName).toBe('Jurnal Mukai Usagido');

    const sold = parseTitleSmart('I Sold My Life for Ten Thousand Yen Per Year 01 of 3');
    expect(sold.volume).toBe(1);
    expect(sold.seriesName).toBe('I Sold My Life for Ten Thousand Yen Per Year');

    const miiko = parseTitleSmart('Namaku Miiko 4 in 1');
    expect(miiko.volume).toBeNull();
    expect(miiko.seriesName).toBe('Namaku Miiko');

    const saoProg = parseTitleSmart('Sword Art Online: Progressive 01');
    expect(saoProg.volume).toBe(1);
    expect(saoProg.seriesName).toBe('Sword Art Online: Progressive');
  });

  it('B-01: preserves (Bind Up Edition) in seriesName so Black Jack bind-up never splits', () => {
    const bj6 = parseTitleSmart('Black Jack 06 (Bind Up Edition)');
    expect(bj6.volume).toBe(6);
    expect(bj6.seriesName).toBe('Black Jack Bind Up');

    const sk1 = parseTitleSmart('Shaman King Complete 01');
    expect(sk1.volume).toBe(1);
    expect(sk1.seriesName).toBe('Shaman King Complete Edition');
  });

  it('C-01 & C-05: rejects flash-sale computer/hacking/statistics books and Paket bundles', () => {
    for (const junk of [
      'FS-Pemrograman Scratch untuk Pemula',
      'FS-Semua Bisa Menjadi Programmer Node.js Basic',
      'FS-52 Hoaks Gizi, Fakta di Balik Mitos Makanan Sehari-hari',
      'Menguasai Statistik di Era Digital dengan SPSS',
      'Paket Naruto',
      'Paket One Piece',
      'The Bad Guys #17',
    ]) {
      const res = classifyProduct({
        title: junk,
        publisherId: 'pub_elex',
        publisherName: 'Elex Media Komputindo',
      });
      expect(res.status, `should reject: ${junk}`).toBe('REJECTED');
    }
  });

  it('C-02 & C-03: preserves PGI fiksi-sastra prose novels and Clover imprint LNs during consolidation', () => {
    const mockBooks: Book[] = [
      {
        id: 'pgi_future_prose',
        slug: 'novel-prosa-baru-pgi',
        title: 'Kisah Misteri di Kuil Tua',
        category: 'Light Novel',
        format: 'LIGHT_NOVEL',
        publisherId: 'pub_pgi',
        publisherName: 'Phoenix Gramedia Indonesia',
        publisherShortName: 'PGI',
        currentPrice: 95000,
        authors: ['Penulis Jepang'],
        genres: ['Light Novel'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        ...( { categorySlugs: 'buku/fiksi-sastra/horor' } as any ),
      },
      {
        id: 'clover_bleach',
        slug: 'bleach-cfyow-1',
        title: 'BLEACH – Can’t Fear Your Own World 1',
        category: 'Light Novel',
        format: 'LIGHT_NOVEL',
        publisherId: 'pub_mnc',
        publisherName: 'm&c! Publishing',
        publisherShortName: 'm&c!',
        imprint: 'Clover',
        currentPrice: 108000,
        authors: ['Ryohgo Narita'],
        genres: ['Light Novel'],
        isWednesdayRelease: true,
        status: 'PUBLISHED',
        volume: 1,
      },
    ];

    const { canonicalBooks, seriesList } = consolidateCatalog({ books: mockBooks });
    expect(canonicalBooks.every((b) => b.category === 'Light Novel')).toBe(true);
    expect(seriesList.every((s) => s.type === 'LIGHT_NOVEL')).toBe(true);
  });

  it('FS: flash-sale prefix alone is not junk — FS- manga parses clean, FS- non-manga still rejected', () => {
    const lofty = parseTitleSmart('FS-Lofty Flower, Fall For Me!! 03 of 04 Bind Up Edition');
    expect(lofty.volume).toBe(3);
    expect(lofty.seriesName).not.toContain('FS');

    const loftyRes = classifyProduct({
      title: 'FS-Lofty Flower, Fall For Me!! 03',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
    });
    expect(loftyRes.status).not.toBe('REJECTED');

    const progRes = classifyProduct({
      title: 'FS-Pemrograman Scratch untuk Pemula',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
    });
    expect(progRes.status).toBe('REJECTED');
  });

  it('B-02: does not false-positive "Ultimate" mid-title when not an edition marker', () => {
    expect(detectBindUp('Ultimate Otaku Teacher Vol. 1')).toBeNull();
    expect(detectBindUp('Dragon Ball Ultimate 06')?.kind).toBe('ULTIMATE_EDITION');
  });
});