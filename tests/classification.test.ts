import { describe, it, expect } from 'vitest';
import { classifyProduct } from '../src/lib/data/classifier';

describe('Multi-Signal Classification Engine', () => {
  it('should accept valid manga from official publishers', () => {
    const elexManga = classifyProduct({
      title: 'Level Comic: Jujutsu Kaisen 24',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'komik,manga',
    });
    expect(elexManga.status).toBe('ACCEPTED');
    expect(elexManga.category).toBe('Manga');
    expect(elexManga.format).toBe('MANGA');
    expect(elexManga.confidence).toBeGreaterThanOrEqual(0.85);

    const mncAkasha = classifyProduct({
      title: 'Akasha : Chainsaw Man 15',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'komik,manga',
    });
    expect(mncAkasha.status).toBe('ACCEPTED');
    expect(mncAkasha.category).toBe('Manga');

    const pgiManga = classifyProduct({
      title: 'Komik: The Summer Hikaru Died 3',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      categorySlugs: 'manga,komik',
    });
    expect(pgiManga.status).toBe('ACCEPTED');
    expect(pgiManga.category).toBe('Manga');
  });

  it('should accept valid light novels with high confidence', () => {
    const pgiLN = classifyProduct({
      title: 'Light Novel: Alya Sometimes Hides Her Feelings in Russian 5',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      categorySlugs: 'light-novel',
      price: 98000,
    });
    expect(pgiLN.status).toBe('ACCEPTED');
    expect(pgiLN.category).toBe('Light Novel');
    expect(pgiLN.format).toBe('LIGHT_NOVEL');

    const elexLN = classifyProduct({
      title: 'Light Novel Detektif Conan: Strategy Above The Depths',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
    });
    expect(elexLN.status).toBe('ACCEPTED');
    expect(elexLN.category).toBe('Light Novel');

    const mncLN = classifyProduct({
      title: 'Light Novel: The Apothecary Diaries Vol. 02',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
    });
    expect(mncLN.status).toBe('ACCEPTED');
    expect(mncLN.category).toBe('Light Novel');
  });

  it('should strictly reject merchandise and non-book items', () => {
    const standee = classifyProduct({
      title: 'Acrylic Standee Frieren beyond journey\'s end',
      publisherId: 'pub_pgi',
    });
    expect(standee.status).toBe('REJECTED');
    expect(standee.signals.negative.length).toBeGreaterThan(0);

    const keychain = classifyProduct({
      title: 'Gantungan Kunci Conan & Kid Key Ring',
      publisherId: 'pub_elex',
    });
    expect(keychain.status).toBe('REJECTED');

    const totebag = classifyProduct({
      title: 'Tote Bag Kanvas Akasha Exclusive',
      publisherId: 'pub_mnc',
    });
    expect(totebag.status).toBe('REJECTED');

    const folder = classifyProduct({
      title: '5-Layer Folder Blue Lock',
      publisherId: 'pub_mnc',
    });
    expect(folder.status).toBe('REJECTED');
  });

  it('should strictly reject non-manga/non-LN books (educational, games, puzzles, self-improvement, law)', () => {
    const puzzle = classifyProduct({
      title: 'Horse Games & Puzzles',
      publisherId: 'pub_pgi',
      price: 222000,
    });
    expect(puzzle.status).toBe('REJECTED');

    const paintByNumber = classifyProduct({
      title: 'Estudee Canvas Paint by Number 20 cm x 20 cm Mount P',
      publisherId: 'pub_pgi',
      price: 89000,
    });
    expect(paintByNumber.status).toBe('REJECTED');

    const geronimo = classifyProduct({
      title: 'Geronimo Stilton #06: Paws Off, Cheddarface!',
      publisherId: 'pub_pgi',
      price: 176000,
    });
    expect(geronimo.status).toBe('REJECTED');

    const selfHelp = classifyProduct({
      title: 'Start with Why: How Great Leaders Inspire Everyone to Take Action',
      publisherId: 'pub_pgi',
      price: 238000,
    });
    expect(selfHelp.status).toBe('REJECTED');

    const law = classifyProduct({
      title: 'Hukum dan Keadilan: Memahami KUHP 2023 dan KUHAP 2025',
      publisherId: 'pub_pgi',
      price: 159000,
    });
    expect(law.status).toBe('REJECTED');

    const popup = classifyProduct({
      title: 'Pop-Up Edukatif: Dinosaurus',
      publisherId: 'pub_pgi',
      price: 149000,
    });
    expect(popup.status).toBe('REJECTED');
  });

  it('should quarantine ambiguous items into REVIEW_REQUIRED without positive evidence', () => {
    const ambiguous = classifyProduct({
      title: 'Buku Catatan Misterius 2026',
      publisherId: 'pub_pgi',
      price: 75000,
    });
    expect(ambiguous.status).toBe('REVIEW_REQUIRED');
  });

  it('should automatically handle completely unseen future titles without hardcoded title branching', () => {
    // Fictional / future unseen Elex Manga
    const futureElexManga = classifyProduct({
      title: 'Level Comic: Cyber Samurai 01',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'komik,manga',
    });
    expect(futureElexManga.status).toBe('ACCEPTED');
    expect(futureElexManga.category).toBe('Manga');
    expect(futureElexManga.format).toBe('MANGA');

    // Fictional / future unseen m&c! Manga
    const futureMncManga = classifyProduct({
      title: 'Akasha : Nebula Horizon Vol. 01',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'komik,manga',
    });
    expect(futureMncManga.status).toBe('ACCEPTED');
    expect(futureMncManga.category).toBe('Manga');

    // Fictional / future unseen PGI Light Novel
    const futurePgiLN = classifyProduct({
      title: 'Light Novel: Starlight Odyssey 1',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      categorySlugs: 'light-novel',
      price: 110000,
    });
    expect(futurePgiLN.status).toBe('ACCEPTED');
    expect(futurePgiLN.category).toBe('Light Novel');
    expect(futurePgiLN.format).toBe('LIGHT_NOVEL');

    // Fictional / future unseen PGI Manga
    const futurePgiManga = classifyProduct({
      title: 'Galaxy Wanderer Vol. 01',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
    });
    expect(futurePgiManga.status).toBe('ACCEPTED');
    expect(futurePgiManga.category).toBe('Manga');
  });
});

