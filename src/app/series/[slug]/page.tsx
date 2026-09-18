import { notFound } from 'next/navigation';
import { getSeriesBySlug, getBooksBySeries } from '@/lib/catalog-service';
import { SeriesDetail } from '@/components/series/series-detail';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) return { title: 'Seri Tidak Ditemukan — nuvellite' };

  return {
    title: `${series.name} — Pelacak Volume nuvellite`,
    description: `Kelengkapan volume dan pelacak koleksi seri ${series.name} terbitan ${series.publisherName}.`,
  };
}

export default async function SeriesDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const series = getSeriesBySlug(slug);

  if (!series) {
    notFound();
  }

  const books = getBooksBySeries(series.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SeriesDetail series={series} books={books} />
    </div>
  );
}
