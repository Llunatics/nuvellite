import type { Book, Series } from '../types';

/**
 * Bind-up series aggregation for the /bind-up directory.
 *
 * Books flagged `isBindUp` (see edition-detector.ts + the sync pipeline) are
 * grouped into series cards. Series that the store lists under slightly
 * different names ("Shaman King Complete" vs "Shaman King Complete Edition")
 * are merged by a normalized key: series name with bind-up markers stripped,
 * scoped per publisher.
 */

export interface BindUpSeriesGroup {
  /** Normalized merge key (marker-stripped name + publisher). */
  key: string;
  /** Clean display name, e.g. "Shaman King". */
  displayName: string;
  /** Most common bind-up label in the group, e.g. "Complete Edition". */
  label: string;
  kind: string;
  publisherId: string;
  publisherName: string;
  publisherShortName: string;
  books: Book[];
  volumeCount: number;
  coverImage?: string;
  /** Link target: the canonical series page when the catalog has one. */
  seriesSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  latestReleaseDate?: string;
}

const MARKER_STRIP_REGEX =
  /\s*\(\s*omnibus\s*\)\s*|\s*\bbind[\s-]?up\b|\s*\bomnibus\b|\s*\bcomplete\s+edition\b|\s*\bultimate\b|\s*\bdeluxe\b|\s*\btrilog[yi]\b|\s*\bedisi\s+koleksi\b|\s*\b[2-9]\s*(?:[-–])?\s*in\s*(?:[-–])?\s*1\b|\s*\bedition\b/gi;

function stripMarkers(name: string): string {
  return name
    .replace(MARKER_STRIP_REGEX, ' ')
    .replace(/\s*\bcomplete\s*$/i, ' ') // trailing bare "Complete" ("Shaman King Complete")
    .replace(/\s*\bthe\s*$/i, ' ') // trailing "The" left behind ("20th Century Boys The")
    .replace(/\s*\b[2-9]\s+in\s*$/i, ' ') // leftover "4 in" when the "1" was parsed as volume
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Shaman King Complete Edition" -> "shaman king" */
export function normalizeBindUpSeriesName(seriesName: string): string {
  return stripMarkers(seriesName).toLowerCase();
}

/** "Shaman King Complete Edition" -> "Shaman King" (display form). */
export function cleanBindUpDisplayName(seriesName: string): string {
  const cleaned = stripMarkers(seriesName);
  return cleaned || seriesName;
}

export function groupBindUpBooks(books: Book[], allSeries: Series[]): BindUpSeriesGroup[] {
  const bindUpBooks = books.filter((b) => b.isBindUp);
  const seriesById = new Map(allSeries.map((s) => [s.id, s]));

  const groups = new Map<string, BindUpSeriesGroup>();

  for (const book of bindUpBooks) {
    const baseName = normalizeBindUpSeriesName(book.seriesName || book.title);
    const key = `${book.publisherId}__${baseName}`;

    let group = groups.get(key);
    if (!group) {
      const series = book.seriesId ? seriesById.get(book.seriesId) : undefined;
      group = {
        key,
        displayName: cleanBindUpDisplayName(book.seriesName || book.title),
        label: book.bindUpLabel || 'Bind Up',
        kind: book.bindUpKind || 'BIND_UP',
        publisherId: book.publisherId,
        publisherName: book.publisherName,
        publisherShortName: book.publisherShortName,
        books: [],
        volumeCount: 0,
        coverImage: undefined,
        seriesSlug: series?.slug,
        minPrice: undefined,
        maxPrice: undefined,
        latestReleaseDate: undefined,
      };
      groups.set(key, group);
    }

    group.books.push(book);

    // Prefer the longest (most descriptive) display name in the group.
    const candidate = cleanBindUpDisplayName(book.seriesName || book.title);
    if (candidate.length > group.displayName.length) {
      group.displayName = candidate;
    }
  }

  const result: BindUpSeriesGroup[] = [];
  for (const group of groups.values()) {
    // Sort books by volume, then title.
    group.books.sort((a, b) => (a.volume ?? 9999) - (b.volume ?? 9999) || a.title.localeCompare(b.title));

    // Most common label wins.
    const labelCounts = new Map<string, number>();
    for (const b of group.books) {
      const l = b.bindUpLabel || 'Bind Up';
      labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
    }
    const topLabel = [...labelCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topLabel) {
      group.label = topLabel[0];
      const topBook = group.books.find((b) => (b.bindUpLabel || 'Bind Up') === topLabel[0]);
      if (topBook?.bindUpKind) group.kind = topBook.bindUpKind;
    }

    group.volumeCount = group.books.length;
    const latest = group.books[group.books.length - 1];
    group.coverImage = latest?.coverImage || group.books[0]?.coverImage;

    const prices = group.books.map((b) => b.currentPrice).filter((p) => typeof p === 'number' && p > 0) as number[];
    if (prices.length > 0) {
      group.minPrice = Math.min(...prices);
      group.maxPrice = Math.max(...prices);
    }

    const dates = group.books.map((b) => b.releaseDate).filter(Boolean) as string[];
    if (dates.length > 0) {
      group.latestReleaseDate = dates.sort().reverse()[0];
    }

    result.push(group);
  }

  return result.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
