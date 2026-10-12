import { notFound } from 'next/navigation';
import { getSeriesBySlug, getBooksBySeries, getBindUpGroupForSeriesSlug } from '@/lib/catalog-service';
import { SeriesDetail } from '@/components/series/series-detail';
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
    const bindUpGroup = getBindUpGroupForSeriesSlug(series.slug);
    return (
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
        <SeriesDetail
          series={series}
          books={books}
          kkiEnrichment={kkiEnrichment}
          hasBindUp={!!bindUpGroup}
        />
      </div>
    );
  }

  const archiveSeries = getArchiveSeriesBySlug(slug);
  if (archiveSeries) {
    return (
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
        <ArchiveSeriesDetail series={archiveSeries} />
      </div>
    );
  }

  notFound();
}
