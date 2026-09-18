'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Book, Series } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { ReleaseCard } from '@/components/books/release-card';
import {
  BookMarked,
  Bookmark,
  Layers,
  Download,
  Upload,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface LibraryViewProps {
  allBooks: Book[];
  allSeries: Series[];
}

export function LibraryView({ allBooks, allSeries }: LibraryViewProps) {
  const {
    items,
    ownedItems,
    wishlistItems,
    isLoaded,
    exportJSON,
    importJSON,
    clearAll,
  } = useCollection();

  const [activeTab, setActiveTab] = useState<'OWNED' | 'WISHLIST' | 'SERIES'>('OWNED');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Map book IDs to Book objects
  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of allBooks) {
      map.set(b.id, b);
    }
    return map;
  }, [allBooks]);

  const ownedBooks = useMemo(() => {
    return ownedItems.map((i) => bookMap.get(i.bookId)).filter((b): b is Book => Boolean(b));
  }, [ownedItems, bookMap]);

  const wishlistBooks = useMemo(() => {
    return wishlistItems.map((i) => bookMap.get(i.bookId)).filter((b): b is Book => Boolean(b));
  }, [wishlistItems, bookMap]);

  // Series where user owns at least 1 book
  const trackedSeries = useMemo(() => {
    const ownedSeriesIds = new Set(
      ownedItems.map((i) => i.seriesId).filter((s): s is string => Boolean(s))
    );
    return allSeries.filter((s) => ownedSeriesIds.has(s.id));
  }, [ownedItems, allSeries]);

  const handleExport = () => {
    const dataStr = exportJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuvellite-koleksi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importJSON(content)) {
        setImportStatus('Koleksi berhasil diimpor!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Gagal mengimpor file format tidak valid.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono font-semibold">
              <BookMarked className="w-3.5 h-3.5" />
              <span>Koleksi Pribadi Local-First</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
              Perpustakaan &amp; Pelacak Koleksi Saya
            </h1>
            <p className="text-xs sm:text-sm text-editorial-muted">
              Tersimpan langsung di perangkat Anda tanpa perlu registrasi akun. Dilengkapi detektor volume hilang.
            </p>
          </div>

          {/* Backup & Restore Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-border-subtle hover:border-gold/40 text-editorial-muted hover:text-editorial-title text-xs transition-all"
              title="Cadangkan koleksi ke file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-border-subtle hover:border-gold/40 text-editorial-muted hover:text-editorial-title text-xs transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Impor</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Yakin ingin mengosongkan seluruh koleksi?')) {
                    clearAll();
                  }
                }}
                className="p-2 rounded-xl bg-surface-raised border border-border-subtle hover:border-rose-500/40 text-editorial-muted hover:text-rose-400 transition-all text-xs"
                title="Kosongkan data koleksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {importStatus && (
          <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/30 text-gold text-xs font-medium">
            {importStatus}
          </div>
        )}

        {/* Quick Stat Counters */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border-subtle max-w-lg">
          <div>
            <div className="text-xl font-bold font-mono text-editorial-title">{ownedBooks.length}</div>
            <div className="text-[11px] text-editorial-muted">Buku Dimiliki</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-editorial-title">{wishlistBooks.length}</div>
            <div className="text-[11px] text-editorial-muted">Di Wishlist</div>
          </div>
          <div>
            <div className="text-xl font-bold font-mono text-editorial-title">{trackedSeries.length}</div>
            <div className="text-[11px] text-editorial-muted">Seri Sedang Dikoleksi</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-surface border border-border-subtle max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('OWNED')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'OWNED'
              ? 'bg-gold/15 text-gold border border-gold/30 shadow-xs'
              : 'text-editorial-muted hover:text-editorial-title'
          }`}
        >
          <BookMarked className="w-3.5 h-3.5" />
          <span>Dimiliki ({ownedBooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('WISHLIST')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'WISHLIST'
              ? 'bg-gold/15 text-gold border border-gold/30 shadow-xs'
              : 'text-editorial-muted hover:text-editorial-title'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Wishlist ({wishlistBooks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SERIES')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'SERIES'
              ? 'bg-gold/15 text-gold border border-gold/30 shadow-xs'
              : 'text-editorial-muted hover:text-editorial-title'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Kelengkapan Seri ({trackedSeries.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'OWNED' && (
        <div>
          {ownedBooks.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-border-subtle rounded-3xl space-y-2">
              <BookMarked className="w-8 h-8 text-editorial-faint mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Belum ada buku di koleksi Anda</h3>
              <p className="text-xs text-editorial-muted">
                Klik tombol &quot;+ Koleksi&quot; pada kartu buku di katalog untuk menambahkan volume yang Anda miliki.
              </p>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold text-background text-xs font-semibold"
                >
                  Jelajahi Katalog
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {ownedBooks.map((book) => (
                <ReleaseCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'WISHLIST' && (
        <div>
          {wishlistBooks.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-border-subtle rounded-3xl space-y-2">
              <Bookmark className="w-8 h-8 text-editorial-faint mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Wishlist Anda masih kosong</h3>
              <p className="text-xs text-editorial-muted">
                Tandai buku yang ingin Anda beli dengan ikon bookmark pada kartu buku.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {wishlistBooks.map((book) => (
                <ReleaseCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'SERIES' && (
        <div className="space-y-4">
          {trackedSeries.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-border-subtle rounded-3xl space-y-2">
              <Layers className="w-8 h-8 text-editorial-faint mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Belum ada seri yang terlacak</h3>
              <p className="text-xs text-editorial-muted">
                Saat Anda menandai volume buku sebagai milik Anda, pelacak kelengkapan seri akan otomatis memonitor volume yang masih kurang di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trackedSeries.map((series) => {
                const seriesBooks = allBooks.filter((b) => b.seriesId === series.id);
                const ownedInSeries = seriesBooks.filter((b) =>
                  ownedItems.some((i) => i.bookId === b.id && i.status === 'OWNED')
                );
                const missingInSeries = seriesBooks.filter(
                  (b) => !ownedItems.some((i) => i.bookId === b.id && i.status === 'OWNED')
                );
                const percent = Math.min(
                  100,
                  seriesBooks.length > 0 ? Math.round((ownedInSeries.length / seriesBooks.length) * 100) : 0
                );

                return (
                  <div
                    key={series.id}
                    className="p-5 rounded-2xl bg-surface border border-border-subtle hover:border-border-medium transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-editorial-faint uppercase block">
                          {series.publisherName} • {series.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
                        </span>
                        <Link
                          href={`/series/${series.slug}`}
                          className="text-sm font-bold font-editorial text-editorial-title hover:text-gold transition-colors"
                        >
                          {series.name}
                        </Link>
                      </div>

                      <span className="text-xs font-mono font-bold text-gold">
                        {ownedInSeries.length} / {seriesBooks.length} Vol ({percent}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-surface-sunken overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold to-emerald-400 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Missing Volumes alert */}
                    {missingInSeries.length > 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-semibold">Kurang: </span>
                          <span className="font-mono text-[11px]">
                            {missingInSeries
                              .map((b) => (b.volume !== null && b.volume !== undefined ? `Vol. ${b.volume}` : b.title))
                              .join(', ')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">Koleksi Lengkap!</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
