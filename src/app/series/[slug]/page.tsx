import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSeriesBySlug, getBooksBySeries, getBindUpGroupForSeriesSlug, getAllSeries } from '@/lib/catalog-service';
import { normalizeBindUpSeriesName } from '@/lib/data/bind-up';
import { SeriesDetail, SeriesDetailSkeleton } from '@/components/series/series-detail';
import { ArchiveSeriesDetail } from '@/components/series/archive-series-detail';
import { getKkiEnrichment, getArchiveSeriesBySlug } from '@/lib/kki-service';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);
  if (series) {
    return {
      title: `${series.name} — Pelacak Volume nuvellite`,
      description: `Kelengkapan volume dan pelacak koleksi seri ${series.name} terbitan ${series.publisherName}.`,
    };
  }
  const archiveSeries = getArchiveSeriesBySlug(slug);
  if (archiveSeries) {
    return {
      title: `${archiveSeries.name} (Arsip) — nuvellite`,
      description: `Arsip seri ${archiveSeries.name} terbitan ${archiveSeries.publisherName} — tidak tersedia di Gramedia.`,
    };
  }
  return { title: 'Seri Tidak Ditemukan — nuvellite' };
}

export default async function SeriesDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);

  if (series) {
    const books = getBooksBySeries(series.id);
    const kkiEnrichment = getKkiEnrichment(series.id);

    // Bidirectional regular <-> bind-up cross-link (Round 2, Block 6):
    // a bind-up series links back to its regular edition, never to itself.
    const isBindUpSeries =
      series.id.toLowerCase().includes('bind-up') ||
      series.slug.toLowerCase().includes('bind-up') ||
      (books.length > 0 && books.every((b) => b.isBindUp));

    let crossLink: { href: string; label: string } | null = null;
    if (isBindUpSeries) {
      const base = normalizeBindUpSeriesName(series.name);
      const all = getAllSeries();
      const regular =
        all.find(
          (s) =>
            s.id !== series.id &&
            s.publisherId === series.publisherId &&
            normalizeBindUpSeriesName(s.name) === base &&
            !s.id.toLowerCase().includes('bind-up')
        ) ||
        all.find(
          (s) =>
            s.id !== series.id &&
            normalizeBindUpSeriesName(s.name) === base &&
            !s.id.toLowerCase().includes('bind-up')
        );
      crossLink = regular
        ? { href: `/series/${regular.slug}`, label: 'Lihat Edisi Reguler →' }
        : { href: '/bind-up', label: 'Direktori Bind-Up →' };
    } else {
      const bindUpGroup = getBindUpGroupForSeriesSlug(series.slug);
      if (bindUpGroup?.seriesSlug) {
        crossLink = {
          href: `/series/${bindUpGroup.seriesSlug}`,
          label: `Lihat Edisi Bind-Up (${bindUpGroup.volumeCount} vol) →`,
        };
      } else if (bindUpGroup) {
        crossLink = { href: '/bind-up', label: 'Lihat Edisi Bind-Up →' };
      }
    }

    return (
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 nuv-view-enter">
        <Suspense fallback={<SeriesDetailSkeleton />}>
          <SeriesDetail
            series={series}
            books={books}
            kkiEnrichment={kkiEnrichment}
            crossLink={crossLink}
          />
        </Suspense>
      </div>
    );
  }

  const archiveSeries = getArchiveSeriesBySlug(slug);
  if (archiveSeries) {
    return (
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 nuv-view-enter">
        <ArchiveSeriesDetail series={archiveSeries} />
      </div>
    );
  }

  notFound();
}
