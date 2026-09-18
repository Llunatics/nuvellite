import Link from 'next/link';
import { getPublishers, getAllBooks } from '@/lib/catalog-service';
import { Compass, Sparkles, ShoppingBag } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Penerbit & Penyedia Resmi — nuvellite',
  description: 'Profil penerbit manga dan light novel resmi di Indonesia (Elex Media, m&c!, PGI) serta merchandise resmi oleh Gramedia.',
};

export default function PublishersDirectoryPage() {
  const publishers = getPublishers();
  const allBooks = getAllBooks();

  const mainPublishers = publishers.filter((p) => p.id !== 'pub_gramedia');
  const gramediaProvider = publishers.find((p) => p.id === 'pub_gramedia');
  const merchBooks = allBooks.filter((b) => b.category === 'Merchandise');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-mono font-semibold">
          <Compass className="w-3.5 h-3.5" />
          <span>Penerbit &amp; Penyedia Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          Tiga Penerbit Utama &amp; Penyedia Resmi di Indonesia
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl">
          Nuvellite secara eksklusif berfokus pada rilisan komik dan light novel berlisensi resmi dari tiga penerbit terkemuka, serta official merchandise anime &amp; manga yang disediakan oleh Gramedia.
        </p>
      </div>

      {/* Main Publishers (Elex, m&c!, PGI) */}
      <div className="space-y-4">
        <h2 className="text-sm font-mono uppercase tracking-wider text-editorial-faint font-bold px-1">
          Penerbit Komik &amp; Light Novel
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mainPublishers.map((pub) => {
            const pubBooks = allBooks.filter((b) => b.publisherId === pub.id);
            const mangaCount = pubBooks.filter((b) => b.category === 'Manga').length;
            const lnCount = pubBooks.filter((b) => b.category === 'Light Novel').length;

            return (
              <div
                key={pub.id}
                className="p-6 rounded-3xl bg-surface border border-border-subtle hover:border-border-medium transition-all flex flex-col justify-between space-y-6 shadow-xs"
              >
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-raised border border-border-subtle text-xs font-mono font-bold text-accent">
                    {pub.shortName}
                  </div>

                  <h3 className="text-xl font-bold font-editorial text-editorial-title">
                    {pub.name}
                  </h3>

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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface-raised hover:bg-surface border border-border-subtle hover:border-accent/30 text-xs font-semibold text-editorial-title hover:text-accent transition-all"
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

      {/* Official Merchandise Provider (Gramedia) */}
      {gramediaProvider && (
        <div className="space-y-4">
          <h2 className="text-sm font-mono uppercase tracking-wider text-editorial-faint font-bold px-1">
            Penyedia Resmi Merchandise
          </h2>
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-surface via-surface-raised/70 to-surface border border-purple-500/20 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-xs font-mono font-bold text-purple-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Disediakan oleh Gramedia</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-editorial text-editorial-title">
                Gramedia Official Store — Anime &amp; Manga Merchandise
              </h3>
              <p className="text-xs sm:text-sm text-editorial-muted leading-relaxed">
                Koleksi pernak-pernik resmi berlisensi langsung dari Muse Communication dan mitra resmi, meliputi postcard, poker card, gantungan kunci, pelindung mata, hingga aksesoris eksklusif.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
              <div className="p-3.5 px-5 rounded-2xl bg-surface-sunken border border-border-subtle text-center">
                <span className="text-[10px] font-mono text-editorial-faint block uppercase">Total Item</span>
                <span className="text-xl font-mono font-bold text-purple-300">{merchBooks.length} merch</span>
              </div>

              <Link
                href="/publishers/gramedia"
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Lihat Semua Merchandise</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
