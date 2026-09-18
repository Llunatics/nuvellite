import { notFound } from 'next/navigation';
import { getPublisherBySlug, getBooksByPublisher } from '@/lib/catalog-service';
import { ReleaseFeed } from '@/components/feed/release-feed';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pub = getPublisherBySlug(slug);
  if (!pub) return { title: 'Penerbit Tidak Ditemukan — nuvellite' };

  return {
    title: `Katalog ${pub.name} — nuvellite`,
    description: `Daftar seluruh rilisan komik dan light novel resmi terbitan ${pub.name}.`,
  };
}

export default async function PublisherDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const pub = getPublisherBySlug(slug);

  if (!pub) {
    notFound();
  }

  const pubBooks = getBooksByPublisher(pub.id);
  const mangaCount = pubBooks.filter((b) => b.category === 'Manga').length;
  const lnCount = pubBooks.filter((b) => b.category === 'Light Novel').length;
  const seriesCount = new Set(pubBooks.map((b) => b.seriesId).filter(Boolean)).size;

  const stats = {
    totalBooks: pubBooks.length,
    totalSeries: seriesCount,
    mangaCount,
    lnCount,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/publishers"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Daftar Penerbit</span>
        </Link>
      </div>

      {/* Publisher Hero */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono font-semibold">
          <Compass className="w-3.5 h-3.5" />
          <span>Penerbit Resmi Berlisensi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          {pub.name}
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
          {pub.description}
        </p>
      </div>

      {/* Feed for this Publisher */}
      <ReleaseFeed initialBooks={pubBooks} publishers={[pub]} stats={stats} />
    </div>
  );
}
