import domainRules from '@/data/domain-rules.json';
import fullCatalogData from '@/data/catalog.json';
import { Book, CatalogData } from './types';
import { cleanStorySynopsis } from './data/synopsis-cleaner';
import {
  getPriceSummary as getPriceSummaryInternal,
  initializePriceSnapshots,
} from './data/price-service';

/**
 * Server-only book detail loader (Round 2, Block 5).
 *
 * The full catalog (src/data/catalog.json, ~17 MB with synopses, editions
 * and price snapshots) lives ONLY in this module, which is imported solely
 * by Server Components (src/app/books/[slug]/page.tsx). Keeping it out of
 * catalog-service.ts means the full data graph never enters the client
 * bundle pulled in by Header → SearchDialog.
 */

const full = fullCatalogData as unknown as CatalogData;

const KNOWN_NON_MANGA_FRAGMENTS = domainRules.classification.knownNonMangaFragments;

function isPublicBook(b: Book): boolean {
  const cat = b.category;
  if (cat !== 'Manga' && cat !== 'Light Novel') return false;
  if (!['pub_elex', 'pub_mnc', 'pub_pgi'].includes(b.publisherId)) return false;
  if (b.classificationStatus === 'REJECTED' || b.classificationStatus === 'REVIEW_REQUIRED') return false;
  const titleLower = (b.title || '').toLowerCase();
  if (KNOWN_NON_MANGA_FRAGMENTS.some((frag) => titleLower.includes(frag))) return false;
  return true;
}

// Lazy O(1) index over the filtered full catalog, keyed by slug and id.
let detailIndex: Map<string, Book> | null = null;
function getDetailIndex(): Map<string, Book> {
  if (detailIndex) return detailIndex;
  detailIndex = new Map<string, Book>();
  for (const b of full.books || []) {
    if (!isPublicBook(b)) continue;
    detailIndex.set(b.slug.toLowerCase(), b);
    detailIndex.set(b.id.toLowerCase(), b);
  }
  return detailIndex;
}

/**
 * Get full book detail by slug — reads from the FULL catalog (with synopsis,
 * editions, etc.). Server-side only; use for single book detail pages.
 */
export function getBookDetailBySlug(slug: string): Book | undefined {
  const clean = slug.toLowerCase();
  const book = getDetailIndex().get(clean);
  if (!book) return undefined;
  // Stored synopses carry build-time trailers (edition markers, selling
  // points, spec blocks) that the UI strips at render; strip them here too
  // so every consumer of detail data gets the clean story text.
  return { ...book, synopsis: cleanStorySynopsis(book.synopsis) };
}

// Lazy singleton: seed the price snapshot registry from the FULL catalog
// once, before any getPriceSummary() call. Without this the registry stays
// empty and every book reports "Stabil (0%)" with fabricated data. This
// lives here (server-only) since Round 2 F-02: catalog-listing.json no
// longer carries priceSnapshots into the client graph.
let priceSnapshotsInitialized = false;
function ensurePriceSnapshotsInitialized(): void {
  if (priceSnapshotsInitialized) return;
  priceSnapshotsInitialized = true;
  const snapshots = full.priceSnapshots || [];
  if (snapshots.length > 0) {
    initializePriceSnapshots(snapshots);
  }
}

/**
 * Price history summary for the book detail page — server-side only
 * (its only caller is src/app/books/[slug]/page.tsx).
 */
export function getPriceSummary(book: Book) {
  ensurePriceSnapshotsInitialized();
  return getPriceSummaryInternal(
    book.id,
    book.currentPrice,
    book.releaseDate,
    book.originalPrice,
  );
}
