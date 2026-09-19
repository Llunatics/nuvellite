import catalogData from '@/data/catalog.json';
import { Book, Series, Publisher, CatalogData } from './types';

const data = catalogData as unknown as CatalogData;

export function getAllBooks(): Book[] {
  return data.books;
}

export function getBookBySlug(slug: string): Book | undefined {
  return data.books.find((b) => b.slug === slug || b.id === slug);
}

export function getBooksBySeries(seriesId: string): Book[] {
  const cleanId = seriesId.startsWith('ser_') ? seriesId : `ser_${seriesId}`;
  return data.books
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
  return data.books.filter(
    (b) =>
      b.publisherId === pubSlugOrId ||
      b.publisherShortName.toLowerCase() === pubSlugOrId.toLowerCase()
  );
}

export function getAllSeries(): Series[] {
  return data.series
    .filter((s) => s.type === 'MANGA' || s.type === 'LIGHT_NOVEL')
    .filter((s) => s.publisherId !== 'pub_gramedia_catalog' && s.publisherName !== 'Penerbit Resmi')
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSeriesBySlug(slug: string): Series | undefined {
  const cleanSlug = slug.toLowerCase().replace(/^ser_/, '');
  return data.series.find(
    (s) =>
      s.slug.toLowerCase() === cleanSlug ||
      s.id.toLowerCase() === slug.toLowerCase() ||
      s.id.toLowerCase() === `ser_${cleanSlug}`
  );
}

export function getPublishers(): Publisher[] {
  return data.publishers;
}

export function getPublisherBySlug(slug: string): Publisher | undefined {
  return data.publishers.find(
    (p) => p.slug === slug || p.id === slug || p.shortName.toLowerCase() === slug.toLowerCase()
  );
}

export function getWednesdayReleases(limit = 24): Book[] {
  return data.books
    .filter((b) => b.isWednesdayRelease)
    .sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function getRecentReleases(limit = 36): Book[] {
  return [...data.books]
    .sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);
}

export function getUpcomingReleases(limit = 24): Book[] {
  return data.books
    .filter((b) => b.status === 'PREORDER' || b.status === 'UPCOMING')
    .slice(0, limit);
}

export function getStats() {
  const mangaCount = data.books.filter((b) => b.category === 'Manga').length;
  const lnCount = data.books.filter((b) => b.category === 'Light Novel').length;
  const merchCount = data.books.filter((b) => b.category === 'Merchandise').length;
  const elexCount = data.books.filter((b) => b.publisherId === 'pub_elex').length;
  const mncCount = data.books.filter((b) => b.publisherId === 'pub_mnc').length;
  const pgiCount = data.books.filter((b) => b.publisherId === 'pub_pgi').length;
  const gramediaCount = data.books.filter((b) => b.publisherId === 'pub_gramedia').length;

  return {
    totalBooks: data.books.length,
    totalSeries: data.series.length,
    mangaCount,
    lnCount,
    merchCount,
    publishers: {
      elex: elexCount,
      mnc: mncCount,
      pgi: pgiCount,
      gramedia: gramediaCount,
    },
    lastUpdated: data.lastUpdated,
  };
}

export function searchCatalog(query: string, limit?: number): Book[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  const results = data.books.filter((b) => {
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
