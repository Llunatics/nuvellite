import domainRules from '@/data/domain-rules.json';
import { BookCategory, BookFormat, ClassificationResult } from '../types';
import { detectJunkTitle } from '../series-consistency';

const MERCHANDISE_REGEX =
  /\b(acrylic|akrilik|standee|keychain|key\s*ring|gantungan\s*kunci|tote\s*bag|totebag|sling\s*bag|backpack|tas|pouch|dompet|tumbler|mug|gelas|cushion|bantal|mousepad|desk\s*mat|tapestry|stickers?|stikers?|poker-|amulet|eye\s*mask|figures?|figurine|plush|boneka|monopoly|pin\s*badge|badge|lanyard|washi\s*tape|postcards?|poster|art\s*print|clear\s*file|clear\s*folder|5-layer\s*folder|folder|card\s*pack|booster\s*pack|kartu\s*koleksi|tarot|flash\s*card|reflection\s*card|t-?shirt|kaos|stationary|stationery|binder|notebook|buku\s*tulis|memo\s*pad|pencil\s*case|kotak\s*pensil|canvas|kanvas|merchandise|merch|origami)\b/i;

const CRAFT_SUPPLY_REGEX =
  /\b(balon|balloon|confetti|benang|rajut|hakpen|kawat|foil|payet|manik|flanel|jarum|artificial|lilin|tali|goni|rami|krep|karton|paperbag|washi|terompet|kancing|kokot|peniti|pinset|gunting|rantai|mote|serbuk|miniatur|polaroid|scrapbook|scrapbooking|newspaper|masking|flower\s*tape|sticky|snow\s*spray|wood|jump\s*ring|fancy\s*banner|memo|deco\s*paper|putik|pita|bunga|daun|wol|jeruk|but+ons?|bot+ons?|wooden)\b/i;

const NON_BOOK_NON_MANGA_REGEX =
  /\b(ensiklopedia|encyclopedia|atlas|kamus|dictionary|puzzles?|games?|teka-teki|paint\s*by\s*number|coloring\s*book|coloring|mewarnai|ilustrasi|buku\s*aktivitas|board\s*book|pop-up|lift\s*the\s*flap|funtastic|saintis\s*cilik|seek\s*&\s*find|buku\s*interaktif|buku\s*pintar|aku\s*jadi\s*pintar|siap\s*sekolah|top\s*paud|paud|my\s*first\s*book|pinkfong|bebefinn|uwa\s*and\s*friends|cocomelon|dr\.\s*robot\s*teo|alphabet\s*writing|menulis\s*alfabet|cepat\s*membaca|metode\s*bapatja|pandai\s*membaca|buku\s*anak|cerita\s*sains|koding\s*pertamaku|parenting|fiqih|hadits|sholat|khotbah|doa\s*harian|doa\b|hijrah|buku\s*resep|resep\b|resep\s+masakan?|resep\s+kue|buku\s*masak|diet|kesehatan|kedokteran|medis|hukum\s*pidana|hukum\s*perdata|hukum\s*dan\s*keadilan|kuhp|kuhap|investasi|saham|reksadana|crypto|keuangan|finansial|akuntansi|perpajakan|bisnis|manajemen|marketing|leadership|kepemimpinan|barakah|mindset|strategi|strategic|psikologi|psikolog|self\s*improvement|self-help|self[-\s]?healing|self[-\s]?love|therapy|terapi|journaling|motivasi|motivation|sukses|kesuksesan|filsafat|filosofi|sejarah\s*indonesia|soal\s*utbk|cpns|toefl|ielts|matematika|fisika|kimia|biologi|biografi|memoar|autobiografi|geronimo\s*stilton|thea\s*stilton|catstronauts|story\s*orchestra|start\s*with\s*why|ego\s*is\s*the\s*enemy|daring\s*greatly|dare\s*to\s*lead|burnout|the\s*idiot|the\s*four\s*agreements|the\s*patriarchs|principles:\s*your\s*guided\s*journal|memoirs\s*from\s*the\s*women|teenlit|romance\s*novel|international\s*classics?|penguin\s*books?)\b/i;

const DISALLOWED_PUBLISHERS = domainRules.classification.disallowedPublishers;
const DISALLOWED_CATEGORIES = domainRules.classification.disallowedCategorySegments;
const EXPLICIT_FORMAT_TOKENS = domainRules.classification.explicitFormatTokens;
const COMIC_CATEGORY_SEGMENTS = domainRules.classification.comicCategorySegments;
const KNOWN_NON_MANGA_SERIES = domainRules.classification.knownNonMangaFragments;
const VERIFIED_LIGHT_NOVEL_FRAGMENTS = domainRules.classification.verifiedLightNovelFragments;
const PGI_PROSE_NOVEL_FRAGMENTS = domainRules.classification.pgiProseNovelFragments;

export function isPgiProseNovelTitle(title: string): boolean {
  const t = (title || '').trim().toLowerCase();
  if (t.startsWith('novel:')) return true;
  return PGI_PROSE_NOVEL_FRAGMENTS.some(
    (f) => t.includes(f) && !/\bvol\.?\s*\d/.test(t) && !/\s\d{1,2}$/.test(t)
  );
}

export function isPgiReZeroLn(title: string, pubId?: string): boolean {
  if ((pubId || '').toLowerCase() !== 'pub_pgi') return false;
  const t = (title || '').toLowerCase();
  if (!t.includes('re:zero') && !t.includes('rezero') && !t.includes('re zero')) return false;
  if (['frozen bond', 'chapter', 'komik', 'manga', 'truth of zero'].some((k) => t.includes(k))) {
    return false;
  }
  return true;
}

function categorySegments(raw: string | undefined): string[] {
  return (raw || '')
    .toLowerCase()
    .replace(/_/g, '-')
    .split(/[/,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ClassificationInput {
  title: string;
  publisherId?: string;
  publisherName?: string;
  categorySlugs?: string;
  rawCategory?: string;
  price?: number;
  specs?: Record<string, string>;
  synopsis?: string;
  author?: string;
}

export function classifyProduct(input: ClassificationInput): ClassificationResult {
  const title = (input.title || '').trim();
  const tLower = title.toLowerCase();
  const pubId = (input.publisherId || '').toLowerCase();
  const pubName = (input.publisherName || '').toLowerCase();
  const catSlugs = (input.categorySlugs || '').toLowerCase();

  const positiveSignals: string[] = [];
  const negativeSignals: string[] = [];

  const catSegs = categorySegments(input.categorySlugs);
  const hasExplicitFormatToken = EXPLICIT_FORMAT_TOKENS.some((tok) => tLower.includes(tok));
  const hasComicCategory = catSegs.some(
    (s) =>
      COMIC_CATEGORY_SEGMENTS.includes(s) ||
      s.startsWith('komik-') ||
      s.startsWith('manga-') ||
      s.startsWith('light-novel')
  );

  if (MERCHANDISE_REGEX.test(title)) {
    negativeSignals.push(`Judul mengandung istilah merchandise: ${title.match(MERCHANDISE_REGEX)?.[0]}`);
  }
  const authorLower = (input.author || '').toLowerCase();
  if (authorLower.includes('merchandise')) {
    negativeSignals.push('Kredit author adalah merchandise (produk non-buku)');
  }
  const junkReason = detectJunkTitle(title);
  if (junkReason) {
    negativeSignals.push(`Produk non-buku / bundle SKU: ${junkReason}`);
  }
  if (!hasComicCategory && NON_BOOK_NON_MANGA_REGEX.test(title)) {
    negativeSignals.push(`Judul terdeteksi non-manga/non-LN: ${title.match(NON_BOOK_NON_MANGA_REGEX)?.[0]}`);
  }
  if (tLower.startsWith('qanza')) {
    negativeSignals.push('Imprint Qanza (buku anak non-manga/non-LN)');
  }
  for (const known of KNOWN_NON_MANGA_SERIES) {
    if (tLower.includes(known)) {
      negativeSignals.push(`Seri terverifikasi non-manga/non-LN: ${known}`);
      break;
    }
  }
  if (tLower.startsWith('clover ') && CRAFT_SUPPLY_REGEX.test(title)) {
    negativeSignals.push('Produk kerajinan Clover (bukan buku)');
  } else if (CRAFT_SUPPLY_REGEX.test(title) && catSlugs && !hasComicCategory) {
    negativeSignals.push('Produk kerajinan (kategori toko non-komik)');
  }

  for (const dp of DISALLOWED_PUBLISHERS) {
    if (pubName.includes(dp)) {
      negativeSignals.push(`Penerbit bukan penerbit manga/LN resmi (${dp})`);
      break;
    }
  }

  const isPgi = pubId === 'pub_pgi' || pubName.includes('phoenix gramedia');
  const isPgiProseShelf = isPgi && catSegs.includes('fiksi-sastra');
  if (!hasExplicitFormatToken && !hasComicCategory) {
    for (const dc of DISALLOWED_CATEGORIES) {
      if (dc === 'fiksi-sastra' && isPgiProseShelf) continue;
      if (catSegs.includes(dc)) {
        negativeSignals.push(`Kategori toko termasuk kategori terlarang: ${dc}`);
        break;
      }
    }
  }

  if (negativeSignals.length > 0) {
    return {
      status: 'REJECTED',
      confidence: 0.98,
      reason: negativeSignals.join('; '),
      signals: { positive: positiveSignals, negative: negativeSignals },
    };
  }

  let isLN = false;
  let isManga = false;

  const specs = input.specs || {};
  const imprint = (specs['Imprint'] || specs['imprint'] || specs['Penerbit'] || '').toLowerCase();

  if (pubId === 'pub_elex' || pubName.includes('elex')) {
    if (tLower.includes('level comic') || tLower.includes('lc:') || tLower.includes('lc :') || imprint.includes('level')) {
      positiveSignals.push('Imprint resmi Level Comics (Elex)');
      isManga = true;
    }
    if (tLower.includes('komik') || tLower.includes('manga') || catSlugs.includes('komik') || catSlugs.includes('manga')) {
      positiveSignals.push('Kategori/token komik Elex Media');
      isManga = true;
    }
  }

  if (pubId === 'pub_mnc' || pubName.includes('m&c')) {
    if (tLower.includes('akasha') || imprint.includes('akasha')) {
      positiveSignals.push('Imprint resmi Akasha (m&c!)');
      isManga = true;
    }
    if (tLower.includes('koloni') || imprint.includes('koloni')) {
      positiveSignals.push('Imprint resmi Koloni (m&c!)');
      isManga = true;
    }
    if (tLower.startsWith('clover') || imprint.includes('clover') || catSlugs.includes('novel-6')) {
      positiveSignals.push('Imprint resmi Clover (m&c!)');
      isLN = true;
    }
    if (tLower.includes('komik') || tLower.includes('manga') || catSlugs.includes('komik') || catSlugs.includes('manga')) {
      positiveSignals.push('Kategori komik m&c!');
      isManga = true;
    }
  }

  const hasVolumeNumbering =
    /(?:\b(?:vol\.?|volume|jilid|ep\.?|episode)|#)\s*\d+/i.test(title) || /\s+\d{1,3}$/.test(title);

  if (isPgi || pubName.includes('pgi')) {
    if (isPgiReZeroLn(title, 'pub_pgi')) {
      positiveSignals.push('Re:Zero PGI adalah Light Novel (verifikasi 2026-10-12)');
      isLN = true;
    } else if (
      tLower.includes('light novel') ||
      tLower.includes('light-novel') ||
      catSlugs.includes('light-novel') ||
      tLower.includes('(novel)') ||
      tLower.includes('the novel')
    ) {
      positiveSignals.push('Rilisan resmi Light Novel PGI / KADOKAWA');
      isLN = true;
    } else if (tLower.includes('manga') || tLower.includes('komik') || catSlugs.includes('manga') || catSlugs.includes('komik')) {
      positiveSignals.push('Rilisan resmi Manga PGI / KADOKAWA');
      isManga = true;
    } else if (isPgiProseShelf || isPgiProseNovelTitle(title)) {
      positiveSignals.push('Novel prosa resmi PGI (rak fiksi-sastra / judul terverifikasi)');
      isLN = true;
    } else if (hasVolumeNumbering) {
      positiveSignals.push('Rilisan resmi berlisensi PGI / KADOKAWA');
      isManga = true;
    }
  }

  if (
    tLower.includes('light novel') ||
    tLower.includes('(novel)') ||
    tLower.includes('the novel') ||
    catSlugs.includes('light-novel') ||
    (isLN && !isManga)
  ) {
    positiveSignals.push('Token format Light Novel dalam judul/kategori');
    isLN = true;
    isManga = false;
  }

  if (!isLN && VERIFIED_LIGHT_NOVEL_FRAGMENTS.some((f) => tLower.includes(f))) {
    positiveSignals.push('Judul novel terverifikasi (tanpa token Light Novel)');
    isLN = true;
    isManga = false;
  }

  if (catSlugs.includes('manga') || catSlugs.includes('komik') || tLower.includes('komik') || tLower.includes('manga')) {
    if (!isLN) {
      positiveSignals.push('Token/kategori komik terkonfirmasi');
      isManga = true;
    }
  }

  if (hasVolumeNumbering) {
    positiveSignals.push('Struktur penomoran volume resmi terdeteksi');
  }

  const category: BookCategory = isLN ? 'Light Novel' : 'Manga';
  const format: BookFormat = isLN ? 'LIGHT_NOVEL' : 'MANGA';

  let confidence = 0.5;
  if (positiveSignals.length >= 2) {
    confidence = 0.95;
  } else if (positiveSignals.length === 1) {
    confidence = 0.85;
  } else {
    confidence = 0.4;
  }

  if (confidence >= 0.8) {
    return {
      status: 'ACCEPTED',
      confidence,
      category,
      format,
      reason: positiveSignals.join('; '),
      signals: { positive: positiveSignals, negative: negativeSignals },
    };
  }

  return {
    status: 'REVIEW_REQUIRED',
    confidence,
    category,
    format,
    reason: 'Bukti positif belum mencukupi untuk masuk katalog publik (karantina otomatis)',
    signals: { positive: positiveSignals, negative: negativeSignals },
  };
}