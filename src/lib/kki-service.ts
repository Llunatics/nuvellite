import enrichmentData from '@/data/kki-enrichment.json';
import archiveData from '@/data/kki-archive.json';
import type { KkiEnrichment, KkiArchiveEntry } from './types';

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
