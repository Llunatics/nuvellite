import { notFound } from 'next/navigation';
import { getPublisherBySlug, getBooksByPublisher, getPublishers } from '@/lib/catalog-service';
import { ReleaseFeed } from '@/components/feed/release-feed';
import Link from 'next/link';
import { ArrowLeft, Compass, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pub = getPublisherBySlug(slug);
  if (!pub) return { title: 'Penerbit Tidak Ditemukan — nuvellite' };

  if (pub.id === 'pub_gramedia') {
    return {
      title: 'Merchandise Resmi Anime & Manga — Gramedia | nuvellite',
      description: 'Daftar official merchandise anime dan manga berlisensi resmi yang disediakan oleh Gramedia.',
    };
  }

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
  const allPublishers = getPublishers();
  const isMerchProvider = pub.id === 'pub_gramedia';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/publishers"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Daftar Penerbit &amp; Penyedia</span>
        </Link>
      </div>

      {/* Publisher / Provider Hero */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xs space-y-3 ${
        isMerchProvider
          ? 'bg-gradient-to-br from-surface via-surface-raised to-surface border-purple-500/25'
          : 'bg-surface border-border-subtle'
      }`}>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold tracking-wider shadow-xs ${
          isMerchProvider
            ? 'bg-purple-900/30 border border-purple-500/30 text-purple-200'
            : 'bg-slate-800/80 border border-slate-700/60 text-slate-200'
        }`}>
          {isMerchProvider ? (
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <Compass className="w-3.5 h-3.5 text-accent" />
          )}
          <span>{isMerchProvider ? 'Penyedia Resmi Merchandise' : 'Penerbit Resmi Berlisensi'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          {pub.name}
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
          {pub.description}
        </p>
      </div>

      {/* Feed for this Publisher / Provider */}
      <ReleaseFeed initialBooks={pubBooks} publishers={allPublishers} />
    </div>
  );
}
