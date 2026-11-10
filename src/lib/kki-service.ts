import enrichmentData from '@/data/kki-enrichment.json';
import archiveData from '@/data/kki-archive.json';
import type { KkiEnrichment, KkiArchiveEntry, Series } from './types';
import { getAllSeries } from './catalog-service';
import { normalizeSeriesName } from './series-consistency';

const enrichment = enrichmentData as unknown as Record<string, KkiEnrichment>;
const archive = archiveData as unknown as KkiArchiveEntry[];

export function getKkiEnrichment(seriesId: string): KkiEnrichment | undefined {
  return enrichment[seriesId];
}

export function getKkiEnrichmentCount(): number {
  return Object.keys(enrichment).length;
}

export interface ArchiveFilters {
  query?: string;
  medium?: 'MANGA' | 'LIGHT_NOVEL' | 'ALL';
  publisher?: string;
  hasMu?: boolean;
}

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

export function getArchivePublishers(): string[] {
  const set = new Set<string>();
  for (const e of archive) {
    if (e.publisherId) set.add(e.publisherId);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function archiveEntryToSeries(e: KkiArchiveEntry): Series {
  const vols = parseInt(e.volumesId || '', 10);
  const muCover = e.mu?.status === 'ok' && e.mu.cover?.trim() ? e.mu.cover.trim() : undefined;
  const pranalaCover = e.pranalaCover?.trim() || undefined;
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
    coverImage: muCover || pranalaCover,
    description: e.mu?.descriptionId || e.mu?.descriptionEn || undefined,
    isArchive: true,
    archiveEntry: e,
  };
}

export function getUnifiedSeries(): Series[] {
  const regular = getAllSeries();
  const regularSlugs = new Set<string>();
  const regularMedTitleKeys = new Set<string>();

  for (const s of regular) {
    const sl = s.slug.toLowerCase();
    regularSlugs.add(sl);
    regularSlugs.add(sl.replace(/-(manga|ln|movie)$/, ''));
    regularMedTitleKeys.add(`${s.type}::${normalizeSeriesName(s.name)}`);
    const enr = enrichment[s.id];
    if (enr?.kkiTitle) {
      regularMedTitleKeys.add(`${s.type}::${normalizeSeriesName(enr.kkiTitle)}`);
    }
  }

  const archiveSeries = archive
    .filter((e) => {
      if (regularSlugs.has(e.slug.toLowerCase())) return false;
      const key = `${e.medium}::${normalizeSeriesName(e.title)}`;
      if (regularMedTitleKeys.has(key)) return false;
      return true;
    })
    .map(archiveEntryToSeries);

  return [...regular, ...archiveSeries].sort((a, b) => a.name.localeCompare(b.name));
}

export function getArchiveSeriesBySlug(slug: string): Series | undefined {
  const entry = getArchiveEntryBySlug(slug);
  return entry ? archiveEntryToSeries(entry) : undefined;
}