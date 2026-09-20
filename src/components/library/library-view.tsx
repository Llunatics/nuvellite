'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Book, Series } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { ReleaseCard } from '@/components/books/release-card';
import { SeriesProgressionCard } from '@/components/books/card-variants';
import {
  BookMarked,
  Bookmark,
  Layers,
  Download,
  Upload,
  Trash2,
  Sparkles,
  BookOpen,
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

  const [activeTab, setActiveTab] = useState<'OWNED' | 'WISHLIST' | 'SERIES' | 'MISSING'>('OWNED');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');
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
    return ownedItems
      .map((i) => bookMap.get(i.bookId))
      .filter((b): b is Book => Boolean(b))
      .filter((b) => (formatFilter === 'ALL' ? true : b.category === formatFilter));
  }, [ownedItems, bookMap, formatFilter]);

  const wishlistBooks = useMemo(() => {
    return wishlistItems
      .map((i) => bookMap.get(i.bookId))
      .filter((b): b is Book => Boolean(b))
      .filter((b) => (formatFilter === 'ALL' ? true : b.category === formatFilter));
  }, [wishlistItems, bookMap, formatFilter]);

  // Series where user owns at least 1 book
  const trackedSeries = useMemo(() => {
    const ownedSeriesIds = new Set(
      ownedItems.map((i) => i.seriesId).filter((s): s is string => Boolean(s))
    );
    return allSeries
      .filter((s) => ownedSeriesIds.has(s.id))
      .filter((s) => (formatFilter === 'ALL' ? true : (formatFilter === 'Manga' ? s.type === 'MANGA' : s.type === 'LIGHT_NOVEL')));
  }, [ownedItems, allSeries, formatFilter]);

  // Missing volumes across tracked series
  const missingBooks = useMemo(() => {
    if (!isLoaded || trackedSeries.length === 0) return [];
    const ownedBookIdSet = new Set(ownedItems.map((i) => i.bookId));
    const list: Book[] = [];
    for (const series of trackedSeries) {
      const seriesBooks = allBooks.filter((b) => b.seriesId === series.id);
      for (const b of seriesBooks) {
        if (!ownedBookIdSet.has(b.id)) {
          if (formatFilter === 'ALL' || b.category === formatFilter) {
            list.push(b);
          }
        }
      }
    }
    return list.sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0));
  }, [isLoaded, trackedSeries, ownedItems, allBooks, formatFilter]);

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
        setImportStatus('Gagal mengimpor: format file tidak valid.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass shadow-xl border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-chip text-slate-200 text-xs font-mono font-semibold tracking-wider">
              <BookMarked className="w-3.5 h-3.5 text-accent" />
              <span>KOLEKSI LOCAL-FIRST</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-editorial text-editorial-title tracking-tight">
              Perpustakaan &amp; Pelacak Koleksi Saya
            </h1>
            <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
              Tersimpan aman langsung di peramban Anda tanpa perlu registrasi atau akun. Cadangkan dan pulihkan data Anda kapan saja.
            </p>
          </div>

          {/* Backup & Restore Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-glass hover:bg-white/10 text-editorial-muted hover:text-editorial-title text-xs transition-all active:scale-95 border border-white/5"
              title="Cadangkan koleksi ke file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-glass hover:bg-white/10 text-editorial-muted hover:text-editorial-title text-xs transition-all cursor-pointer active:scale-95 border border-white/5">
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
                className="p-2 rounded-xl liquid-glass hover:bg-rose-500/20 text-editorial-muted hover:text-rose-400 transition-all text-xs border border-white/5"
                title="Kosongkan data koleksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-medium">
            {importStatus}
          </div>
        )}

        {/* Stats Grid: 4 Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-white/5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-editorial-faint block">
              Buku Dimiliki
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title">
              {ownedBooks.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-white/5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-editorial-faint block">
              Wishlist
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-accent">
              {wishlistBooks.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-white/5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-editorial-faint block">
              Seri Diikuti
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-sky-400">
              {trackedSeries.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-elevated/40 border border-white/5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-editorial-faint block">
              Volume Belum Lengkap
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-amber-400">
              {missingBooks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Format Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-2xl liquid-glass text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('OWNED')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'OWNED'
                ? 'bg-accent text-white font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dimiliki ({ownedBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WISHLIST')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'WISHLIST'
                ? 'bg-accent text-white font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Wishlist ({wishlistBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SERIES')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'SERIES'
                ? 'bg-accent text-white font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Progres Seri ({trackedSeries.length})</span>
          </button>

          {missingBooks.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('MISSING')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-all ${
                activeTab === 'MISSING'
                  ? 'bg-accent text-white font-semibold shadow-xs'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Volume Terlewat ({missingBooks.length})</span>
            </button>
          )}
        </div>

        {/* Format Filter */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl liquid-glass text-xs">
          {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormatFilter(fmt)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                formatFilter === fmt
                  ? 'bg-white/10 text-editorial-title font-semibold shadow-xs'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              {fmt === 'ALL' ? 'Semua' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'OWNED' && (
        <div>
          {ownedBooks.length === 0 ? (
            <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
              <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Koleksi Anda masih kosong</h3>
              <p className="text-xs text-editorial-muted">
                Tambahkan buku dari katalog dengan menekan tombol &quot;+&quot; pada kartu buku.
              </p>
              <Link
                href="/"
                className="inline-block px-4 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold shadow-sm mt-2"
              >
                Jelajahi Katalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
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
            <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
              <Bookmark className="w-10 h-10 text-editorial-faint mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Wishlist Anda masih kosong</h3>
              <p className="text-xs text-editorial-muted">
                Simpan komik atau light novel impian Anda dengan menekan ikon bookmark pada kartu buku.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {wishlistBooks.map((book) => (
                <ReleaseCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'SERIES' && (
        <div>
          {trackedSeries.length === 0 ? (
            <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
              <Layers className="w-10 h-10 text-editorial-faint mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Belum ada seri yang terlacak</h3>
              <p className="text-xs text-editorial-muted">
                Saat Anda menandai kepemilikan volume, seri terkait akan otomatis terlacak di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackedSeries.map((series) => {
                const ownedInSeries = ownedItems.filter((i) => i.seriesId === series.id).length;
                return (
                  <SeriesProgressionCard
                    key={series.id}
                    series={series}
                    ownedCount={ownedInSeries}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'MISSING' && (
        <div>
          {missingBooks.length === 0 ? (
            <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
              <Sparkles className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-semibold text-editorial-title">Koleksi seri Anda lengkap!</h3>
              <p className="text-xs text-editorial-muted">
                Tidak ada volume terlewat dari seri yang sedang Anda ikuti saat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <span className="font-semibold">Daftar Volume Terlewat: </span>
                <span>
                  Berikut adalah volume resmi yang telah terbit namun belum Anda miliki pada seri-seri yang Anda ikuti.
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                {missingBooks.map((book) => (
                  <ReleaseCard key={book.id} book={book} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
