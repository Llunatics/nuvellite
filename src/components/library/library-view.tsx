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
  ArrowRight,
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
        setImportStatus('Koleksi berhasil dipulihkan!');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Gagal mengimpor: format file JSON tidak valid.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Header Banner */}
      <section className="space-y-4 pt-2 sm:pt-4 border-b border-white/[0.04] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
              <BookMarked className="w-3.5 h-3.5 text-accent" />
              <span>Rak Buku Local-First</span>
              <span className="text-white/20">•</span>
              <span>Privasi Penuh di Peramban Anda</span>
            </div>

            <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
              Perpustakaan &amp; Koleksi Saya.
            </h1>

            <p className="text-sm text-editorial-body leading-relaxed max-w-2xl font-sans">
              Koleksi Anda tersimpan aman secara lokal di perangkat ini tanpa login akun.
              Cadangkan data ke format JSON dan pulihkan kapan saja.
            </p>
          </div>

          {/* Backup & Restore Controls */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title text-xs font-mono transition-all active:scale-95 border border-white/[0.06]"
              title="Cadangkan koleksi ke file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>

            <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title text-xs font-mono transition-all cursor-pointer active:scale-95 border border-white/[0.06]">
              <Upload className="w-3.5 h-3.5" />
              <span>Impor</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            {items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Yakin ingin mengosongkan seluruh koleksi perpustakaan?')) {
                    clearAll();
                  }
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.02] hover:bg-rose-500/20 text-editorial-faint hover:text-rose-400 transition-all border border-white/[0.04]"
                title="Kosongkan data koleksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-2xl bg-accent/15 border border-accent/25 text-accent text-xs font-mono">
            {importStatus}
          </div>
        )}

        {/* 4 Stats Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
              Buku Dimiliki
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title mt-1 block">
              {ownedBooks.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
              Wishlist
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-accent mt-1 block">
              {wishlistBooks.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
              Seri Diikuti
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-sky-400 mt-1 block">
              {trackedSeries.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
              Volume Terlewat
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-amber-400 mt-1 block">
              {missingBooks.length}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Tabs & Format Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Navigation Pills */}
        <div className="flex flex-wrap items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('OWNED')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'OWNED'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Dimiliki ({ownedBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WISHLIST')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'WISHLIST'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Wishlist ({wishlistBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SERIES')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'SERIES'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
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
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium transition-all ${
                activeTab === 'MISSING'
                  ? 'bg-amber-400/20 text-amber-300 font-semibold shadow-xs'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Volume Terlewat ({missingBooks.length})</span>
            </button>
          )}
        </div>

        {/* Format Filter */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
          {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormatFilter(fmt)}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                formatFilter === fmt
                  ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              {fmt === 'ALL' ? 'Semua' : fmt}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Tab Views */}
      {activeTab === 'OWNED' && (
        <div>
          {ownedBooks.length === 0 ? (
            <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <BookOpen className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
              <h3 className="text-sm font-medium text-editorial-title">Koleksi Anda masih kosong</h3>
              <p className="text-xs text-editorial-muted max-w-sm mx-auto">
                Tambahkan buku yang sudah Anda miliki dari katalog dengan menekan tombol tanda plus pada kartu buku.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white text-black text-xs font-medium hover:bg-slate-100 transition-all mt-2"
              >
                <span>Jelajahi Katalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
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
            <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <Bookmark className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
              <h3 className="text-sm font-medium text-editorial-title">Wishlist Anda masih kosong</h3>
              <p className="text-xs text-editorial-muted max-w-sm mx-auto">
                Simpan komik atau light novel impian Anda dengan menekan ikon bookmark pada kartu buku.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
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
            <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <Layers className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
              <h3 className="text-sm font-medium text-editorial-title">Belum ada seri yang terlacak</h3>
              <p className="text-xs text-editorial-muted max-w-sm mx-auto">
                Saat Anda menandai kepemilikan volume, seri buku tersebut akan otomatis terlacak di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
            <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <Sparkles className="w-10 h-10 text-emerald-400 mx-auto stroke-1" />
              <h3 className="text-sm font-medium text-editorial-title">Koleksi seri Anda lengkap!</h3>
              <p className="text-xs text-editorial-muted max-w-sm mx-auto">
                Tidak ada nomor volume yang terlewat dari seri yang sedang Anda ikuti.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-sans">
                <span className="font-semibold">Daftar Volume Terlewat: </span>
                <span>
                  Berikut adalah nomor volume resmi yang telah terbit namun belum Anda miliki pada seri yang sedang Anda ikuti.
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
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
