import Link from 'next/link';
import { getPublishers, getAllBooks, getStats } from '@/lib/catalog-service';
import { Compass, BookOpen, Layers, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Penerbit Resmi Manga & Light Novel — nuvellite',
  description: 'Profil penerbit manga dan light novel resmi di Indonesia: Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia.',
};

export default function PublishersDirectoryPage() {
  const publishers = getPublishers();
  const allBooks = getAllBooks();
  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono font-semibold">
          <Compass className="w-3.5 h-3.5" />
          <span>Penerbit Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          Tiga Penerbit Utama Manga &amp; Light Novel di Indonesia
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl">
          Nuvellite secara eksklusif berfokus pada kurasi rilisan berlisensi resmi dari tiga pilar penerbitan komik dan novel Jepang terkemuka di tanah air.
        </p>
      </div>

      {/* Publisher Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {publishers.map((pub) => {
          const pubBooks = allBooks.filter((b) => b.publisherId === pub.id);
          const mangaCount = pubBooks.filter((b) => b.category === 'Manga').length;
          const lnCount = pubBooks.filter((b) => b.category === 'Light Novel').length;

          return (
            <div
              key={pub.id}
              className="p-6 rounded-3xl bg-surface border border-border-subtle hover:border-border-medium transition-all flex flex-col justify-between space-y-6 shadow-xs"
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-border-subtle text-xs font-mono font-bold text-gold">
                  {pub.shortName}
                </div>

                <h2 className="text-xl font-bold font-editorial text-editorial-title">
                  {pub.name}
                </h2>

                <p className="text-xs text-editorial-muted leading-relaxed">
                  {pub.description}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-subtle">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-surface-raised/50 border border-border-subtle">
                    <span className="text-[10px] text-editorial-faint block">Manga / Komik</span>
                    <span className="text-lg font-bold text-editorial-title">{mangaCount} judul</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-raised/50 border border-border-subtle">
                    <span className="text-[10px] text-editorial-faint block">Light Novel</span>
                    <span className="text-lg font-bold text-editorial-title">{lnCount} judul</span>
                  </div>
                </div>

                <Link
                  href={`/publishers/${pub.slug}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-raised hover:bg-surface border border-border-subtle hover:border-gold/30 text-xs font-semibold text-editorial-title hover:text-gold transition-all"
                >
                  <span>Jelajahi Katalog {pub.shortName}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
