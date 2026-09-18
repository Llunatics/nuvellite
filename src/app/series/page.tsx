import { getAllSeries, getPublishers } from '@/lib/catalog-service';
import Link from 'next/link';
import { Layers, BookOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Direktori Seri Manga & Light Novel — nuvellite',
  description: 'Daftar lengkap seri komik dan light novel resmi dari Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia.',
};

export default function SeriesDirectoryPage() {
  const allSeries = getAllSeries();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono font-semibold">
          <Layers className="w-3.5 h-3.5" />
          <span>Pelacak Seri Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          Direktori Seri Manga &amp; Light Novel
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted">
          Pantau kelengkapan volume koleksi Anda untuk {allSeries.length} judul seri resmi di Indonesia.
        </p>
      </div>

      {/* Series Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {allSeries.map((series) => (
          <Link
            key={series.id}
            href={`/series/${series.slug}`}
            className="group flex flex-col bg-surface rounded-2xl border border-border-subtle hover:border-border-medium overflow-hidden transition-all duration-200 shadow-xs hover:shadow-md p-3"
          >
            {/* Cover Thumbnail */}
            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-surface-sunken mb-3">
              {series.coverImage ? (
                <img
                  src={series.coverImage}
                  alt={series.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-raised/40">
                  <BookOpen className="w-6 h-6 text-editorial-faint mb-1" />
                  <span className="text-[10px] text-editorial-muted line-clamp-2">{series.name}</span>
                </div>
              )}

              {/* Format Badge */}
              <div className="absolute top-1.5 left-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase backdrop-blur-md border ${
                    series.type === 'LIGHT_NOVEL'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                >
                  {series.type === 'LIGHT_NOVEL' ? 'LN' : 'Manga'}
                </span>
              </div>
            </div>

            {/* Series Info */}
            <div className="flex-1 flex flex-col justify-between space-y-1">
              <div>
                <div className="text-[10px] font-mono text-editorial-faint truncate">{series.publisherName}</div>
                <h3 className="text-xs sm:text-[13px] font-semibold text-editorial-title group-hover:text-gold transition-colors line-clamp-2 leading-tight">
                  {series.name}
                </h3>
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-editorial-muted">
                <span>Total Volume:</span>
                <span className="font-bold text-editorial-title">{series.totalVolumes} vol</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
