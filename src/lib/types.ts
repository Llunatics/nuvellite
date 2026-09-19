export interface BookEdition {
  name: string;
  price?: number;
  gramediaUrl?: string;
}

export type BookCategory = 'Manga' | 'Light Novel' | 'Merchandise';

export interface Publisher {
  id: string;
  name: string;
  slug: string;
  shortName: string;
  country: string;
  description: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  seriesId?: string;
  seriesName?: string;
  volume?: number | null;
  category: BookCategory;
  publisherId: string;
  publisherName: string;
  publisherShortName: string;
  coverImage?: string;
  status: string;
  releaseDate?: string;
  isWednesdayRelease: boolean;
  currentPrice: number;
  authors: string[];
  genres: string[];
  isbn13?: string;
  synopsis?: string;
  availableEditions?: BookEdition[];
  isSetVariant?: boolean;
  gramediaUrl?: string;
}

export interface Series {
  id: string;
  slug: string;
  name: string;
  originalTitle?: string;
  publisherId: string;
  publisherName: string;
  author?: string;
  type: 'MANGA' | 'LIGHT_NOVEL';
  status: 'ONGOING' | 'COMPLETED';
  totalVolumes: number;
  latestVolume: number;
  availableVolumes: number[];
  coverImage?: string;
  description?: string;
}

export interface CollectionItem {
  bookId: string;
  seriesId?: string;
  status: 'OWNED' | 'WISHLIST';
  addedAt: string;
}

export interface CatalogData {
  version: string;
  lastUpdated: string;
  publishers: Publisher[];
  books: Book[];
  series: Series[];
}
