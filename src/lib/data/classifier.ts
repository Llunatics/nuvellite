import { BookCategory, BookFormat, ClassificationResult, ClassificationStatus } from '../types';

// Negative signals: Items that MUST BE REJECTED unconditionally
const MERCHANDISE_REGEX = /\b(acrylic|akrilik|standee|keychain|key\s*ring|gantungan\s*kunci|tote\s*bag|totebag|sling\s*bag|backpack|tas|pouch|dompet|tumbler|mug|gelas|cushion|bantal|mousepad|desk\s*mat|tapestry|stickers?|stikers?|poker-|amulet|eye\s*mask|figures?|figurine|plush|boneka|monopoly|pin\s*badge|badge|lanyard|washi\s*tape|postcards?|poster|art\s*print|clear\s*file|clear\s*folder|5-layer\s*folder|folder|card\s*pack|booster\s*pack|kartu\s*koleksi|tarot|flash\s*card|reflection\s*card|t-?shirt|kaos|stationary|stationery|binder|notebook|buku\s*tulis|memo\s*pad|pencil\s*case|kotak\s*pensil|canvas|kanvas|merchandise|merch|origami)\b/i;

// Craft supplies (not books). Absolute when the title starts with the "Clover" craft brand; otherwise only on non-comic store category.
const CRAFT_SUPPLY_REGEX = /\b(balon|balloon|confetti|benang|rajut|hakpen|kawat|foil|payet|manik|flanel|jarum|artificial|lilin|tali|goni|rami|krep|karton|paperbag|washi|terompet|kancing|kokot|peniti|pinset|gunting|rantai|mote|serbuk|miniatur|polaroid|scrapbook|newspaper|masking|flower\s*tape|sticky|snow\s*spray|wood|jump\s*ring|fancy\s*banner|memo|deco\s*paper|putik|pita|bunga|daun|wol)\b/i;

const NON_BOOK_NON_MANGA_REGEX = /\b(ensiklopedia|encyclopedia|atlas|kamus|dictionary|puzzles?|games?|teka-teki|paint\s*by\s*number|coloring\s*book|coloring|mewarnai|ilustrasi|buku\s*aktivitas|board\s*book|pop-up|lift\s*the\s*flap|funtastic|saintis\s*cilik|seek\s*&\s*find|buku\s*interaktif|buku\s*pintar|aku\s*jadi\s*pintar|siap\s*sekolah|top\s*paud|paud|my\s*first\s*book|pinkfong|bebefinn|uwa\s*and\s*friends|cocomelon|dr\.\s*robot\s*teo|alphabet\s*writing|menulis\s*alfabet|cepat\s*membaca|metode\s*bapatja|pandai\s*membaca|buku\s*anak|cerita\s*sains|koding\s*pertamaku|parenting|fiqih|hadits|sholat|khotbah|doa\s*harian|doa\b|hijrah|buku\s*resep|resep\b|resep\s+masakan?|resep\s+kue|buku\s*masak|diet|kesehatan|kedokteran|medis|hukum\s*pidana|hukum\s*perdata|hukum\s*dan\s*keadilan|kuhp|kuhap|investasi|saham|reksadana|crypto|keuangan|finansial|akuntansi|perpajakan|bisnis|manajemen|marketing|leadership|kepemimpinan|barakah|mindset|strategi|strategic|psikologi|psikolog|self\s*improvement|self-help|self[-\s]?healing|self[-\s]?love|therapy|terapi|journaling|motivasi|motivation|sukses|kesuksesan|filsafat|filosofi|sejarah\s*indonesia|soal\s*utbk|cpns|toefl|ielts|matematika|fisika|kimia|biologi|biografi|memoar|autobiografi|geronimo\s*stilton|thea\s*stilton|catstronauts|story\s*orchestra|start\s*with\s*why|ego\s*is\s*the\s*enemy|daring\s*greatly|dare\s*to\s*lead|burnout|the\s*idiot|the\s*four\s*agreements|the\s*patriarchs|principles:\s*your\s*guided\s*journal|memoirs\s*from\s*the\s*women|teenlit|romance\s*novel|international\s*classics?|penguin\s*books?)\b/i;

const DISALLOWED_PUBLISHERS = [
  'water lily literary', 'penguin', 'bentang', 'puffin', 'harpercollins',
  'knopf', 'vintage', 'simon & schuster', 'hachette', 'scholastic',
  'oxford', 'cambridge', 'gpu', 'gramedia pustaka utama', 'mizan', 'republika',
  'wordsworth', 'little, brown'
];

const DISALLOWED_CATEGORIES = [
  'self-improvement', 'pengembangan-diri', 'pengembangan-diri-1',
  'bisnis', 'bisnis-ekonomi', 'manajemen', 'marketing',
  'kepemimpinan', 'kepemimpinan-1',
  'keuangan', 'investasi', 'saham', 'akuntansi', 'perbankan',
  'agama', 'islam', 'kristen', 'katolik', 'hindu', 'buddha', 'ritual--praktik',
  'parenting', 'keluarga',
  'kesehatan', 'kedokteran', 'medis', 'diet', 'kebugaran',
  'hukum', 'politik', 'sejarah',
  'resep', 'masakan', 'kuliner', 'kue',
  'masak', 'kamus',
  'psikologi', 'filsafat',
  'pendidikan', 'pelajaran', 'utbk', 'cpns',
  'novel-15', 'teenlit', 'fiksi-remaja',
  'jurnal-diari', 'mewarnai', 'permainan-aktivitas',
  'kepercayaan-diri', 'motivasi',
  'cerita-anak', 'dongeng',
  'novel-terjemahan', 'sastra',
  'fiksi-teenlit', 'fiksi-sastra',
  'stationery', 'stationery-sekolah-kantor', 'alat-tulis',
  'hobi', 'desain', 'arsitektur',
  'travel', 'perjalanan',
  'biografi', 'memoar',
  'arsitektur', 'komputer-teknologi', 'nonfiksi-anak-remaja',
  'fiksi-sastra', 'pengembangan-diri-karir', 'international-books',
];

// Explicit format tokens in the TITLE that prove manga/LN even when the
// store category is odd or missing (the store miscategorizes real releases,
// e.g. a light novel filed under "buku-anak").
const EXPLICIT_FORMAT_TOKENS = [
  'light novel', 'light-novel', '(novel)', 'the novel',
  'komik', 'manga', 'manhwa', 'manhua',
  'level comic', 'lc:', 'lc :',
  'akasha', 'koloni', 'movie story',
];

const COMIC_CATEGORY_SEGMENTS = ['komik', 'manga', 'light-novel'];

// Verified non-manga / non-LN series that the store miscategorizes as comic.
const KNOWN_NON_MANGA_SERIES = [
  'ther melian', // Indonesian fantasy NOVEL tetralogy by Shienny M.S. (Elex)
];

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

  // Store category segments (computed first: they can override title signals —
  // the store files real manga under odd titles/categories).
  const catSegs = categorySegments(input.categorySlugs);
  const hasExplicitFormatToken = EXPLICIT_FORMAT_TOKENS.some((tok) => tLower.includes(tok));
  const hasComicCategory = catSegs.some(
    (s) => COMIC_CATEGORY_SEGMENTS.includes(s) || s.startsWith('komik-') || s.startsWith('manga-') || s.startsWith('light-novel')
  );

  // 1. NEGATIVE SIGNALS (Highest Priority)
  // Merchandise is an absolute reject. Other non-manga/non-LN title patterns
  // are skipped when the store category proves comic.
  if (MERCHANDISE_REGEX.test(title)) {
    negativeSignals.push(`Judul mengandung istilah merchandise: ${title.match(MERCHANDISE_REGEX)?.[0]}`);
  }
  if (!hasComicCategory && NON_BOOK_NON_MANGA_REGEX.test(title)) {
    negativeSignals.push(`Judul terdeteksi non-manga/non-LN: ${title.match(NON_BOOK_NON_MANGA_REGEX)?.[0]}`);
  }
  // Qanza is m&c!'s Islamic children-book imprint (never manga / light novel).
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

  // Disallowed STORE category gate (Gramedia `category_slugs`, e.g.
  // "buku/agama/islam/..."). Skipped when the title itself proves manga/LN
  // format, or when the category itself carries a comic segment — the store
  // miscategorizes real releases often enough that category alone must not
  // convict when format evidence contradicts it.
  if (!hasExplicitFormatToken && !hasComicCategory) {
    for (const dc of DISALLOWED_CATEGORIES) {
      if (catSegs.includes(dc)) {
        negativeSignals.push(`Kategori toko termasuk kategori terlarang: ${dc}`);
        break;
      }
    }
  }

  // If negative signals are present, reject immediately
  if (negativeSignals.length > 0) {
    return {
      status: 'REJECTED',
      confidence: 0.98,
      reason: negativeSignals.join('; '),
      signals: { positive: positiveSignals, negative: negativeSignals },
    };
  }

  // 2. POSITIVE SIGNALS - Generic, data-driven rules (No hardcoded titles!)
  let isLN = false;
  let isManga = false;

  const specs = input.specs || {};
  const imprint = (specs['Imprint'] || specs['Penerbit'] || '').toLowerCase();

  // Imprint and publisher signals
  if (pubId === 'pub_elex' || pubName.includes('elex')) {
    if (tLower.includes('level comic') || tLower.includes('lc:') || tLower.includes('lc :')) {
      positiveSignals.push('Imprint resmi Level Comics (Elex)');
      isManga = true;
    }
    if (tLower.includes('komik') || tLower.includes('manga') || catSlugs.includes('komik') || catSlugs.includes('manga')) {
      positiveSignals.push('Kategori/token komik Elex Media');
      isManga = true;
    }
  }

  if (pubId === 'pub_mnc' || pubName.includes('m&c')) {
    if (tLower.includes('akasha')) {
      positiveSignals.push('Imprint resmi Akasha (m&c!)');
      isManga = true;
    }
    if (tLower.includes('koloni')) {
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

  const hasVolumeNumbering = /\b(?:vol\.?|volume|jilid|ep\.?|episode|#)\s*\d+/i.test(title) || /\s+\d{1,3}$/.test(title);

  if (pubId === 'pub_pgi' || pubName.includes('phoenix gramedia') || pubName.includes('pgi')) {
    if (tLower.includes('light novel') || tLower.includes('light-novel') || catSlugs.includes('light-novel') || tLower.includes('(novel)') || tLower.includes('the novel')) {
      positiveSignals.push('Rilisan resmi Light Novel PGI / KADOKAWA');
      isLN = true;
    } else if (tLower.includes('manga') || tLower.includes('komik') || catSlugs.includes('manga') || catSlugs.includes('komik')) {
      positiveSignals.push('Rilisan resmi Manga PGI / KADOKAWA');
      isManga = true;
    } else if (hasVolumeNumbering) {
      // PGI release with volume structure is Manga if no Light Novel token is present
      positiveSignals.push('Rilisan resmi berlisensi PGI / KADOKAWA');
      isManga = true;
    }
  }

  // Format tokens
  if (tLower.includes('light novel') || tLower.includes('(novel)') || tLower.includes('the novel') || catSlugs.includes('light-novel') || (isLN && !isManga)) {
    positiveSignals.push('Token format Light Novel dalam judul/kategori');
    isLN = true;
    isManga = false;
  }

  if (catSlugs.includes('manga') || catSlugs.includes('komik') || tLower.includes('komik') || tLower.includes('manga')) {
    if (!isLN) {
      positiveSignals.push('Token/kategori komik terkonfirmasi');
      isManga = true;
    }
  }

  // Volume or series structure
  if (hasVolumeNumbering) {
    positiveSignals.push('Struktur penomoran volume resmi terdeteksi');
  }

  // Determine classification and confidence
  const category: BookCategory = isLN ? 'Light Novel' : 'Manga';
  const format: BookFormat = isLN ? 'LIGHT_NOVEL' : 'MANGA';

  // Calculate confidence score
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

  // Fail-safe quarantine: False Positive > False Negative
  return {
    status: 'REVIEW_REQUIRED',
    confidence,
    category,
    format,
    reason: 'Bukti positif belum mencukupi untuk masuk katalog publik (karantina otomatis)',
    signals: { positive: positiveSignals, negative: negativeSignals },
  };
}
