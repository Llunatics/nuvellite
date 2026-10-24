import listingData from '@/data/catalog-listing.json';
import fullCatalogData from '@/data/catalog.json';
import { Book, Series, Publisher, CatalogData } from './types';
import { getPriceSummary as getPriceSummaryInternal, initializePriceSnapshots } from './data/price-service';
import { getRelatedReleases as getRelatedReleasesInternal, getYouMayAlsoLike as getYouMayAlsoLikeInternal } from './data/recommendation-service';
import { groupBindUpBooks, BindUpSeriesGroup, normalizeBindUpSeriesName } from './data/bind-up';

// Listing data (lightweight, no synopsis/heavy fields) — used for grids, cards, search
const listing = listingData as unknown as CatalogData;

// Full data — used only for single book detail pages (server-side)
const full = fullCatalogData as unknown as CatalogData;

// Lazy singleton: seed the price snapshot registry from listing data once,
// before any getPriceSummary() call. Without this the registry stays empty
// and every book reports "Stabil (0%)" with fabricated data.
let priceSnapshotsInitialized = false;
function ensurePriceSnapshotsInitialized(): void {
  if (priceSnapshotsInitialized) return;
  priceSnapshotsInitialized = true;
  const snapshots = (listing as CatalogData).priceSnapshots || [];
  if (snapshots.length > 0) {
    initializePriceSnapshots(snapshots);
  }
}

// Verified non-manga/non-LN fragments (mirrors KNOWN_NON_MANGA_SERIES in
// scripts/auto-sync-catalog.py and src/lib/data/classifier.ts). Last line
// of defence at render time: even if a bad entry is reintroduced into the
// data files by an old script, it can never reach the public catalog again.
const KNOWN_NON_MANGA_FRAGMENTS = [
  'ther melian',
  'capcut',
  'chip war',
  'excel survival kit',
  'hack the human',
  'kebijakan publik',
  'letters from gaza',
  'lintas sejarah',
  'memahami jepang',
  'republik rakyat china',
  'tip & trik content creator',
  'pemrograman web',
  'sebuah kota, sebuah umpama',
  'para perasuk',
  'jalan kehormatan',
  'miaow',
];

// Filter out any quarantined or non-manga/non-LN items from public catalog
const publicBooks: Book[] = (listing.books || []).filter((b) => {
  const cat = b.category;
  if (cat !== 'Manga' && cat !== 'Light Novel') return false;
  if (!['pub_elex', 'pub_mnc', 'pub_pgi'].includes(b.publisherId)) return false;
  if (b.classificationStatus === 'REJECTED' || b.classificationStatus === 'REVIEW_REQUIRED') return false;
  const titleLower = (b.title || '').toLowerCase();
  if (KNOWN_NON_MANGA_FRAGMENTS.some((frag) => titleLower.includes(frag))) return false;
  return true;
});

const publicSeries: Series[] = (listing.series || []).filter((s) => {
  if (s.type !== 'MANGA' && s.type !== 'LIGHT_NOVEL') return false;
  if (s.publisherId === 'pub_gramedia_catalog' || s.publisherName === 'Penerbit Resmi') return false;
  return true;
});

export function getAllBooks(): Book[] {
  return publicBooks;
}

/**
 * Get full book detail by slug — reads from the FULL catalog (with synopsis, editions, etc.)
 * Only use this for single book detail pages, not for listings.
 */
export function getBookDetailBySlug(slug: string): Book | undefined {
  const clean = slug.toLowerCase();
  const fullBooks = (full.books || []).filter((b) => {
    const cat = b.category;
    if (cat !== 'Manga' && cat !== 'Light Novel') return false;
    if (!['pub_elex', 'pub_mnc', 'pub_pgi'].includes(b.publisherId)) return false;
    if (b.classificationStatus === 'REJECTED' || b.classificationStatus === 'REVIEW_REQUIRED') return false;
    const titleLower = (b.title || '').toLowerCase();
    if (KNOWN_NON_MANGA_FRAGMENTS.some((frag) => titleLower.includes(frag))) return false;
    return true;
  });
  return fullBooks.find((b) => b.slug.toLowerCase() === clean || b.id.toLowerCase() === clean);
}

/**
 * Get book by slug from listing data — used for metadata generation and lightweight lookups.
 */
export function getBookBySlug(slug: string): Book | undefined {
  const clean = slug.toLowerCase();
  return publicBooks.find((b) => b.slug.toLowerCase() === clean || b.id.toLowerCase() === clean);
}

export function getBooksBySeries(seriesId: string): Book[] {
  const cleanId = seriesId.startsWith('ser_') ? seriesId : `ser_${seriesId}`;
  return publicBooks
    .filter((b) => b.seriesId === seriesId || b.seriesId === cleanId)
    .sort((a, b) => {
      const volA = a.volume ?? 9999;
      const volB = b.volume ?? 9999;
      if (volA !== volB) return volA - volB;
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    });
}

export function getBooksByPublisher(pubSlugOrId: string): Book[] {
  const clean = pubSlugOrId.toLowerCase();
  return publicBooks.filter(
    (b) =>
      b.publisherId.toLowerCase() === clean ||
      b.publisherShortName.toLowerCase() === clean ||
      b.publisherName.toLowerCase().includes(clean)
  );
}

export function getAllSeries(): Series[] {
  return publicSeries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Bind-up / omnibus series directory data.
 * Books are flagged `isBindUp` at sync time (auto-sync-catalog.py) and
 * backfilled into the catalog; grouping here is purely presentational.
 */
export function getBindUpSeries(): BindUpSeriesGroup[] {
  return groupBindUpBooks(publicBooks, publicSeries);
}

/**
 * Find the bind-up group linked to a canonical series slug, if any.
 * Used to show a "Lihat Edisi Bind-Up" button on series detail pages.
 *
 * Besides the direct match (bind-up books shelved under the canonical
 * series, e.g. Slam Dunk), this also matches when the bind-up books live
 * under a dedicated "<Series> Bind Up" series (e.g. ser_naruto-bind-up, 29
 * books) while the user is on the canonical series page (ser_naruto-manga).
 * Matching is done on the marker-stripped base name — the same merge key
 * the /bind-up directory uses — preferring the same publisher, then any
 * publisher (e.g. Elex's Attack on Titan bind-up from m&c!'s series page).
 * Medium stays separated: "Naruto (Novel)" normalizes to "naruto (novel)",
 * never to "naruto", so the LN page never advertises the manga bind-up.
 */
export function getBindUpGroupForSeriesSlug(slug: string): BindUpSeriesGroup | undefined {
  const clean = slug.toLowerCase();
  const groups = getBindUpSeries();
  const direct = groups.find((g) => g.seriesSlug?.toLowerCase() === clean);
  if (direct) return direct;

  const series = getSeriesBySlug(slug);
  if (!series) return undefined;
  const base = normalizeBindUpSeriesName(series.name);
  if (!base) return undefined;
  const groupBase = (g: BindUpSeriesGroup): string => {
    const idx = g.key.indexOf('__');
    return idx >= 0 ? g.key.slice(idx + 2) : g.key;
  };

  // Prefer the same publisher's bind-up edition...
  const samePublisher = groups.find(
    (g) => g.publisherId === series.publisherId && groupBase(g) === base
  );
  if (samePublisher) return samePublisher;

  // ...then any publisher's edition of the same franchise.
  return groups.find((g) => groupBase(g) === base);
}

export function getSeriesBySlug(slug: string): Series | undefined {
  const cleanSlug = slug.toLowerCase().replace(/^ser_/, '');
  return publicSeries.find(
    (s) =>
      s.slug.toLowerCase() === cleanSlug ||
      s.id.toLowerCase() === slug.toLowerCase() ||
      s.id.toLowerCase() === `ser_${cleanSlug}`
  );
}

export function getPublishers(): Publisher[] {
  return (listing.publishers || []).filter(
    (p) => p.id !== 'pub_gramedia' && ['pub_elex', 'pub_mnc', 'pub_pgi'].includes(p.id)
  );
}

export function getPublisherBySlug(slug: string): Publisher | undefined {
  const clean = slug.toLowerCase();
  return getPublishers().find(
    (p) => p.slug.toLowerCase() === clean || p.id.toLowerCase() === clean || p.shortName.toLowerCase() === clean
  );
}

export function getWednesdayReleases(limit = 24): Book[] {
  return publicBooks
    .filter((b) => b.isWednesdayRelease)
    .sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function getRecentReleases(limit = 36): Book[] {
  return [...publicBooks]
    .sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function getUpcomingReleases(limit = 24): Book[] {
  return publicBooks
    .filter((b) => b.status === 'PREORDER' || b.status === 'UPCOMING')
    .slice(0, limit);
}

export function getStats() {
  const mangaCount = publicBooks.filter((b) => b.category === 'Manga').length;
  const lnCount = publicBooks.filter((b) => b.category === 'Light Novel').length;
  const elexCount = publicBooks.filter((b) => b.publisherId === 'pub_elex').length;
  const mncCount = publicBooks.filter((b) => b.publisherId === 'pub_mnc').length;
  const pgiCount = publicBooks.filter((b) => b.publisherId === 'pub_pgi').length;

  return {
    totalBooks: publicBooks.length,
    totalSeries: publicSeries.length,
    mangaCount,
    lnCount,
    merchCount: 0,
    publishers: {
      elex: elexCount,
      mnc: mncCount,
      pgi: pgiCount,
    },
    lastUpdated: listing.lastUpdated,
  };
}

export function searchCatalog(query: string, limit?: number): Book[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results = publicBooks.filter((b) => {
    const titleMatch = b.title && b.title.toLowerCase().includes(q);
    const seriesMatch = b.seriesName && b.seriesName.toLowerCase().includes(q);
    const origTitleMatch = b.originalTitle && b.originalTitle.toLowerCase().includes(q);
    const isbnMatch = b.isbn13 && b.isbn13.includes(q);
    const categoryMatch = b.category && b.category.toLowerCase().includes(q);
    const authorMatch = Array.isArray(b.authors) && b.authors.some((a) => {
      if (typeof a === 'string') return a.toLowerCase().includes(q);
      if (typeof a === 'object' && a && 'name' in a) return String((a as any).name).toLowerCase().includes(q);
      return false;
    });

    return Boolean(titleMatch || seriesMatch || origTitleMatch || isbnMatch || categoryMatch || authorMatch);
  });

  return limit && limit > 0 ? results.slice(0, limit) : results;
}

export function getPriceSummary(book: Book) {
  ensurePriceSnapshotsInitialized();
  return getPriceSummaryInternal(book.id, book.currentPrice, book.releaseDate, book.originalPrice);
}

export function getRelatedReleases(book: Book, limit = 6) {
  return getRelatedReleasesInternal(book, publicBooks, limit);
}

export function getYouMayAlsoLike(book: Book, limit = 6) {
  return getYouMayAlsoLikeInternal(book, publicBooks, limit);
}
