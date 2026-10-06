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

  it('should accurately differentiate Manga vs Light Novel for the same franchise (e.g. The Eminence in Shadow)', () => {
    const pgiManga = classifyProduct({
      title: 'The Eminence in Shadow 14',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      price: 58500,
    });
    expect(pgiManga.status).toBe('ACCEPTED');
    expect(pgiManga.category).toBe('Manga');
    expect(pgiManga.format).toBe('MANGA');

    const pgiLN = classifyProduct({
      title: 'Light Novel The Eminence in Shadow 6',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      price: 103500,
    });
    expect(pgiLN.status).toBe('ACCEPTED');
    expect(pgiLN.category).toBe('Light Novel');
    expect(pgiLN.format).toBe('LIGHT_NOVEL');
  });

  it('should correctly classify Clover (m&c!) releases as Light Novels', () => {
    const eightySix1 = classifyProduct({
      title: 'Eighty Six Ep. 1: Eighty Six',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'novel-6',
      specs: { Imprint: 'Clover', Penerbit: 'm&c!' },
      price: 81000,
    });
    expect(eightySix1.status).toBe('ACCEPTED');
    expect(eightySix1.category).toBe('Light Novel');
    expect(eightySix1.format).toBe('LIGHT_NOVEL');

    const eightySix2 = classifyProduct({
      title: 'Eighty Six Ep. 2 : Run Trough the Battlefront',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      specs: { Imprint: 'Clover', Penerbit: 'm&c!' },
      price: 73500,
    });
    expect(eightySix2.status).toBe('ACCEPTED');
    expect(eightySix2.category).toBe('Light Novel');
    expect(eightySix2.format).toBe('LIGHT_NOVEL');
  });

  it('should reject non-manga books from general vendor feeds even without obvious title signals', () => {
    // Regression: these slipped into the catalog because the old gate only
    // looked at title patterns. The store category now convicts them.
    const barakah = classifyProduct({
      title: 'The Barakah Effect: Keberlimpahan dalam Kecukupan',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/agama/islam/ritual--praktik',
    });
    expect(barakah.status).toBe('REJECTED');

    const unleadership = classifyProduct({
      title: 'Unleadership: Memimpin Melalui Relasi',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/bisnis-ekonomi/kepemimpinan-1',
    });
    expect(unleadership.status).toBe('REJECTED');

    const coloring = classifyProduct({
      title: 'Coloring & Journaling Therapy: Self-Love',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/pengembangan-diri-1/jurnal-diari',
    });
    expect(coloring.status).toBe('REJECTED');

    const mindset = classifyProduct({
      title: 'Strategic Mindset - Rencana 7 Hari Menentukan Prioritas',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/pengembangan-diri-1/motivasi',
    });
    expect(mindset.status).toBe('REJECTED');
  });

  it('should not treat the buku-anak store shelf as a reject signal (real manga live there)', () => {
    // Gramedia files real manga/LN under "buku-anak" — category alone
    // must never convict them.
    for (const title of [
      'One Piece 98',
      'Doraemon 34 (Terbit Ulang)',
      'The Promised Neverland 10',
      'Shaman King Complete Edition 08',
    ]) {
      const r = classifyProduct({
        title,
        publisherId: 'pub_elex',
        publisherName: 'Elex Media Komputindo',
        categorySlugs: 'buku/buku-anak/novel-pemula',
      });
      // Must never be hard-REJECTED (quarantine for review is the
      // engine's fail-safe for ambiguous items, rejection is not).
      expect(r.status).not.toBe('REJECTED');
    }

    const rezero = classifyProduct({
      title: 'Re:Zero : Starting Life in Another World 04',
      publisherId: 'pub_pgi',
      publisherName: 'Phoenix Gramedia Indonesia',
      categorySlugs: 'buku/buku-anak/novel-pemula',
    });
    expect(rezero.status).toBe('ACCEPTED');

    // ...but genuinely non-comic kids shelves still reject.
    const robocar = classifyProduct({
      title: 'Robocar Poli - Belajar Membaca, Yuk!',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/buku-anak/permainan-aktivitas',
    });
    expect(robocar.status).toBe('REJECTED');

    // Qanza = m&c! Islamic children imprint, never manga/LN.
    const qanza = classifyProduct({
      title: "Qanza: Kisah Teladan Nabi Nuh a.s.",
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/buku-anak/agama/islam-1',
    });
    expect(qanza.status).toBe('REJECTED');
  });

  it('should reject merchandise/stationery/teenlit and known miscategorized novel series', () => {
    const jordyMerch = classifyProduct({
      title: 'Jordy Kano + Merchandise',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/fiksi-teenlit',
    });
    expect(jordyMerch.status).toBe('REJECTED');

    const jordy = classifyProduct({
      title: 'Jordy Kano',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/fiksi-teenlit',
    });
    expect(jordy.status).toBe('REJECTED');

    const origami = classifyProduct({
      title: 'Clover Origami Polos 2 Sisi 12X12 Cm',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'stationery-sekolah-kantor',
    });
    expect(origami.status).toBe('REJECTED');

    // Clover craft supplies (Japanese craft brand, not books).
    const cloverCraft = classifyProduct({
      title: 'Clover Balon Foil Happy Birthday',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/kerajinan',
    });
    expect(cloverCraft.status).toBe('REJECTED');

    // ...but a manga title containing a craft word with comic category survives.
    const demonWood = classifyProduct({
      title: 'KOLONI Rajasa - Demon of the Wood',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/komik/manga',
    });
    expect(demonWood.status).toBe('ACCEPTED');

    // Verified Indonesian fantasy NOVEL series (store files it as komik).
    const therMelian = classifyProduct({
      title: 'Ther Melian: Derelict',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/komik/fantasi-fiksi-ilmiah',
    });
    expect(therMelian.status).toBe('REJECTED');
  });

  it('should keep real releases filed under odd store categories when the title proves the format', () => {
    // The store files this LN under "buku-anak" — the title token overrides.
    const apothecary = classifyProduct({
      title: 'Light Novel: The Apothecary Diaries Vol. 02',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/buku-anak/novel-pemula',
    });
    expect(apothecary.status).toBe('ACCEPTED');
    expect(apothecary.category).toBe('Light Novel');

    // "Clover" as a bare substring must not flip an Akasha manga into LN.
    const fourLeaf = classifyProduct({
      title: 'Akasha : You are a Four Leaf Clover 01',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/komik/manga/romance-2',
    });
    expect(fourLeaf.status).toBe('ACCEPTED');
    expect(fourLeaf.category).toBe('Manga');

    // "The Novel" without parentheses is still a light-novel signal.
    const haikyuNovel = classifyProduct({
      title: 'Haikyu!! The Novel 4',
      publisherId: 'pub_mnc',
      publisherName: 'm&c! Publishing',
      categorySlugs: 'buku/komik/manga/olahraga-1',
    });
    expect(haikyuNovel.status).toBe('ACCEPTED');
    expect(haikyuNovel.category).toBe('Light Novel');

    // A comic store category overrides a suspicious-looking title:
    // "Teka-Teki Rumah Aneh - Hen Na Ie" is a real manga (misteri).
    const henNaIe = classifyProduct({
      title: 'Teka-Teki Rumah Aneh - Hen Na Ie 01',
      publisherId: 'pub_elex',
      publisherName: 'Elex Media Komputindo',
      categorySlugs: 'buku/komik/manga/misteri',
    });
    expect(henNaIe.status).toBe('ACCEPTED');
    expect(henNaIe.category).toBe('Manga');
  });
});

