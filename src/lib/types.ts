export type BookCategory = 'Manga' | 'Light Novel';
export type BookFormat = 'MANGA' | 'LIGHT_NOVEL';
export type AvailabilityStatus = 'AVAILABLE' | 'PREORDER' | 'OUT_OF_STOCK' | 'UNKNOWN';
export type ClassificationStatus = 'ACCEPTED' | 'REJECTED' | 'REVIEW_REQUIRED';

export interface BookEdition {
  id?: string;
  name: string;
  editionType?: 'REGULAR' | 'LIMITED' | 'SPECIAL_SET' | 'BUNDLE';
  price?: number;
  gramediaUrl?: string;
  isAvailable?: boolean;
}

export interface Imprint {
  id: string;
  name: string;
  slug: string;
  publisherId: string;
  description?: string;
  format: BookFormat;
}

export interface Publisher {
  id: string;
  name: string;
  slug: string;
  shortName: string;
  country: string;
  description: string;
  imprints?: Imprint[];
}

export interface PriceSnapshot {
  id: string;
  bookId: string;
  price: number;
  currentPrice?: number;
  originalPrice?: number;
  isDiscounted?: boolean;
  previousPrice?: number;
  availability: AvailabilityStatus;
  observedAt: string;
  source: string;
  note?: string;
}

export interface Book {
  id: string;
  slug: string;
  source?: string;
  sourceProductId?: string;
  sourceUrl?: string;
  isbn13?: string;
  title: string;
  originalTitle?: string;
  normalizedTitle?: string;
  seriesId?: string | null;
  seriesName?: string | null;
  volume?: number | null;
  volumeNumber?: number | null;
  format?: BookFormat;
  category: BookCategory;
  publisherId: string;
  publisherName: string;
  publisherShortName: string;
  imprint?: string;
  author?: string;
  authors: string[];
  illustrator?: string;
  coverImage?: string;
  coverUrl?: string;
  status: string;
  availability?: AvailabilityStatus;
  releaseDate?: string;
  isWednesdayRelease: boolean;
  currentPrice: number;
  originalPrice?: number;
  discountPrice?: number;
  price?: number;
  genres: string[];
  synopsis?: string;
  language?: string;
  editionType?: string;
  availableEditions?: BookEdition[];
  isSetVariant?: boolean;
  gramediaUrl?: string;
  classificationStatus?: ClassificationStatus;
  classificationReason?: string;
  classificationConfidence?: number;
  createdAt?: string;
  updatedAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface Series {
  id: string;
  slug: string;
  name: string;
  originalTitle?: string;
  publisherId: string;
  publisherName: string;
  author?: string;
  illustrator?: string;
  type: 'MANGA' | 'LIGHT_NOVEL';
  status: 'ONGOING' | 'COMPLETED';
  totalVolumes: number;
  latestVolume: number;
  availableVolumes: number[];
  missingVolumes?: number[];
  coverImage?: string;
  description?: string;
  genres?: string[];
  firstReleaseDate?: string;
  latestReleaseDate?: string;
}

export interface CollectionItem {
  bookId: string;
  seriesId?: string;
  status: 'OWNED' | 'WISHLIST';
  addedAt: string;
}

export interface SyncRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  sources: string[];
  pagesFetched: number;
  productsFetched: number;
  productsAccepted: number;
  productsRejected: number;
  productsUpdated: number;
  productsInserted: number;
  duplicatesResolved: number;
  errors: string[];
  durationMs: number;
  success: boolean;
}

export interface CatalogData {
  version: string;
  lastUpdated: string;
  publishers: Publisher[];
  books: Book[];
  series: Series[];
  priceSnapshots?: PriceSnapshot[];
  syncRuns?: SyncRun[];
}

export interface ClassificationResult {
  status: ClassificationStatus;
  confidence: number;
  category?: BookCategory;
  format?: BookFormat;
  reason: string;
  signals: {
    positive: string[];
    negative: string[];
  };
}

export interface RecommendationItem {
  book: Book;
  score: number;
  explanation: string;
}
