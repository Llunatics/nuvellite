import listingData from '@/data/catalog-listing.json';
import fullCatalogData from '@/data/catalog.json';
import { Book, Series, Publisher, CatalogData } from './types';
import { getPriceSummary as getPriceSummaryInternal } from './data/price-service';
import { getRelatedReleases as getRelatedReleasesInternal, getYouMayAlsoLike as getYouMayAlsoLikeInternal } from './data/recommendation-service';

// Listing data (lightweight, no synopsis/heavy fields) — used for grids, cards, search
const listing = listingData as unknown as CatalogData;

// Full data — used only for single book detail pages (server-side)
const full = fullCatalogData as unknown as CatalogData;

// Filter out any quarantined or non-manga/non-LN items from public catalog
const publicBooks: Book[] = (listing.books || []).filter((b) => {
  const cat = b.category;
  if (cat !== 'Manga' && cat !== 'Light Novel') return false;
  if (!['pub_elex', 'pub_mnc', 'pub_pgi'].includes(b.publisherId)) return false;
  if (b.classificationStatus === 'REJECTED' || b.classificationStatus === 'REVIEW_REQUIRED') return false;
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
  return getPriceSummaryInternal(book.id, book.currentPrice, book.releaseDate, book.originalPrice);
}

export function getRelatedReleases(book: Book, limit = 6) {
  return getRelatedReleasesInternal(book, publicBooks, limit);
}

export function getYouMayAlsoLike(book: Book, limit = 6) {
  return getYouMayAlsoLikeInternal(book, publicBooks, limit);
}
