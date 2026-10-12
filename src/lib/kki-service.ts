import enrichmentData from '@/data/kki-enrichment.json';
import archiveData from '@/data/kki-archive.json';
import type { KkiEnrichment, KkiArchiveEntry, Series } from './types';
import { getAllSeries } from './catalog-service';

const enrichment = enrichmentData as unknown as Record<string, KkiEnrichment>;
const archive = archiveData as unknown as KkiArchiveEntry[];

/** KKI enrichment for a Nuvellite series, if matched. */
export function getKkiEnrichment(seriesId: string): KkiEnrichment | undefined {
  return enrichment[seriesId];
}

/** How many Nuvellite series carry KKI enrichment. */
export function getKkiEnrichmentCount(): number {
  return Object.keys(enrichment).length;
}

export interface ArchiveFilters {
  query?: string;
  medium?: 'MANGA' | 'LIGHT_NOVEL' | 'ALL';
  publisher?: string;
  hasMu?: boolean;
}

/** Full archive list (series-level, sorted by title). */
export function getArchiveEntries(filters: ArchiveFilters = {}): KkiArchiveEntry[] {
  const q = (filters.query || '').toLowerCase().trim();
  return archive.filter((e) => {
    if (filters.medium && filters.medium !== 'ALL' && e.medium !== filters.medium) return false;
    if (filters.publisher && e.publisherId !== filters.publisher) return false;
    if (filters.hasMu && e.mu?.status !== 'ok') return false;
    if (q) {
      const hay = `${e.title} ${e.author || ''} ${e.publisherId || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getArchiveEntryBySlug(slug: string): KkiArchiveEntry | undefined {
  const clean = slug.toLowerCase();
  return archive.find((e) => e.slug.toLowerCase() === clean || e.id.toLowerCase() === clean);
}

export function getArchiveCount(): number {
  return archive.length;
}

/** Distinct publishers in the archive (for filter dropdown). */
export function getArchivePublishers(): string[] {
  const set = new Set<string>();
  for (const e of archive) {
    if (e.publisherId) set.add(e.publisherId);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Adapt a KKI archive entry to the Series shape for the unified catalog.
 * Archive entries are series-level (no per-volume books on Gramedia).
 */
export function archiveEntryToSeries(e: KkiArchiveEntry): Series {
  const vols = parseInt(e.volumesId || '', 10);
  return {
    id: `arc_${e.id}`,
    slug: e.slug,
    name: e.title,
    publisherId: `arc_${(e.publisherId || 'kki').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    publisherName: e.publisherId || 'Arsip KKI',
    author: e.author || undefined,
    illustrator: e.illustrator || undefined,
    type: e.medium,
    status: e.statusId && /end|tamat|complete/i.test(e.statusId) ? 'COMPLETED' : 'ONGOING',
    totalVolumes: Number.isFinite(vols) ? vols : 0,
    latestVolume: 0,
    availableVolumes: [],
    coverImage: e.mu?.status === 'ok' ? e.mu.cover : undefined,
    description: e.mu?.descriptionId || e.mu?.descriptionEn || undefined,
    isArchive: true,
    archiveEntry: e,
  };
}

/**
 * Unified catalog: regular Gramedia series + KKI archive entries as one list.
 * Regular series win on slug collision (canonical entries take precedence).
 */
export function getUnifiedSeries(): Series[] {
  const regular = getAllSeries();
  const regularSlugs = new Set(regular.map((s) => s.slug.toLowerCase()));
  const archiveSeries = archive
    .filter((e) => !regularSlugs.has(e.slug.toLowerCase()))
    .map(archiveEntryToSeries);
  return [...regular, ...archiveSeries];
}

/** Find an archive entry adapted as Series by slug (undefined if not an archive slug). */
export function getArchiveSeriesBySlug(slug: string): Series | undefined {
  const entry = getArchiveEntryBySlug(slug);
  return entry ? archiveEntryToSeries(entry) : undefined;
}
