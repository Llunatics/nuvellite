import { getAllBooks } from '@/lib/catalog-service';
import { getUnifiedSeries } from '@/lib/kki-service';
import { SeriesDirectoryView } from '@/components/series/series-directory-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Direktori Seri Manga & Light Novel — nuvellite',
  description: 'Daftar lengkap seri komik dan light novel dari Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia, termasuk arsip terbitan lama dari Database Komunitas Kolektor Komik Indonesia.',
};

export default function SeriesDirectoryPage() {
  const allSeries = getUnifiedSeries().map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    publisherId: s.publisherId,
    publisherName: s.publisherName,
    author: s.author,
    type: s.type,
    status: s.status,
    totalVolumes: s.totalVolumes,
    coverImage: s.coverImage,
    isArchive: s.isArchive,
    archiveYearFirstVol: s.archiveEntry?.yearFirstVol ?? null,
  }));
  // The directory only needs to know WHICH series have bind-up editions;
  // shipping all ~2,900 book records to the client for that one flag
  // added megabytes to this page's payload.
  const bindUpSeriesIds = Array.from(
    new Set(
      getAllBooks()
        .filter((b) => b.isBindUp && b.seriesId)
        .map((b) => b.seriesId as string),
    ),
  );

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 nuv-view-enter">
      <SeriesDirectoryView allSeries={allSeries} bindUpSeriesIds={bindUpSeriesIds} />
    </div>
  );
}
