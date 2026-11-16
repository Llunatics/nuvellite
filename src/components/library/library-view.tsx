'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Book, Series } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { useProfile } from '@/hooks/use-profile';
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
  Table as TableIcon,
  LayoutGrid,
} from 'lucide-react';
import { EmptyState } from '@/components/arc/empty-state/empty-state';
import { SortableDataTable, type DataColumn } from '@/components/arc/sortable-data-table/sortable-data-table';
import { Button } from '@/components/arc/button/button';
import { formatRupiah } from '@/lib/formatters';

interface LibraryViewProps {
  allBooks: Book[];
  allSeries: Series[];
}

export const LibraryView = React.memo(function LibraryView({ allBooks, allSeries }: LibraryViewProps) {
  const {
    items,
    ownedItems,
    wishlistItems,
    isLoaded,
    exportJSON,
    importJSON,
    clearAll,
  } = useCollection();
  const { profile } = useProfile();

  const [activeTab, setActiveTab] = useState<'OWNED' | 'WISHLIST' | 'SERIES' | 'MISSING'>('OWNED');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  interface LibraryTableRow extends Record<string, unknown> {
    id: string;
    slug: string;
    title: string;
    publisher: string;
    category: string;
    volume: string;
    price: number;
    priceFormatted: string;
  }

  const tableColumns: DataColumn<LibraryTableRow>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Judul Buku',
        sortable: true,
        render: (_val, row) => (
          <Link href={`/books/${row.slug}`} className="hover:text-accent font-medium text-editorial-title block truncate">
            {row.title}
          </Link>
        ),
      },
      {
        key: 'publisher',
        label: 'Penerbit',
        sortable: true,
        width: 140,
        render: (_val, row) => <span className="font-mono text-xs text-editorial-muted">{row.publisher}</span>,
      },
      {
        key: 'category',
        label: 'Kategori',
        sortable: true,
        width: 130,
        render: (_val, row) => <span className="text-xs text-editorial-muted">{row.category}</span>,
      },
      {
        key: 'volume',
        label: 'Vol',
        sortable: true,
        width: 90,
        render: (_val, row) => <span className="font-mono text-xs text-editorial-title">{row.volume}</span>,
      },
      {
        key: 'price',
        label: 'Harga',
        numeric: true,
        sortable: true,
        width: 130,
        render: (_val, row) => (
          <span className="font-mono text-xs font-semibold text-editorial-title">{row.priceFormatted}</span>
        ),
      },
    ],
    [],
  );

  const getTableRows = (books: Book[]): LibraryTableRow[] =>
    books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      publisher: b.publisherShortName || 'Penerbit',
      category: b.category,
      volume: b.volume != null ? `Vol. ${b.volume}` : '—',
      price: b.currentPrice,
      priceFormatted: formatRupiah(b.currentPrice),
    }));

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
      <section className="pt-2 sm:pt-4 border-b border-white/[0.06] pb-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
              <BookMarked className="w-3 h-3 text-accent shrink-0" />
              <span>Rak Buku Lokal{profile ? ` • ${profile.name}` : ''}</span>
            </div>

            <h1 className="mt-4 font-editorial text-3xl sm:text-5xl lg:text-6xl font-normal text-editorial-title tracking-tight leading-[1.12]">
              Perpustakaan &amp; Koleksi Saya.
            </h1>

            <p className="mt-4 sm:mt-5 text-sm sm:text-base text-editorial-body leading-[1.7] max-w-2xl font-sans">
              Koleksi tersimpan aman secara lokal di perangkat ini, tanpa perlu login.
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
            <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title mt-1 block">
              {trackedSeries.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
              Volume Terlewat
            </span>
            <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title mt-1 block">
              {missingBooks.length}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Tabs & Format Filter Toolbar */}
      <div className="space-y-3 mb-8 text-xs">
        {/* Navigation Pills — full width, equal columns */}
        <div className="grid grid-cols-2 sm:flex items-stretch gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab('OWNED')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-medium transition-all text-center ${
              activeTab === 'OWNED'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Dimiliki ({ownedBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WISHLIST')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-medium transition-all text-center ${
              activeTab === 'WISHLIST'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Wishlist ({wishlistBooks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SERIES')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-medium transition-all text-center ${
              activeTab === 'SERIES'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Progres Seri ({trackedSeries.length})</span>
          </button>

          {missingBooks.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('MISSING')}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 rounded-xl font-medium transition-all text-center ${
                activeTab === 'MISSING'
                  ? 'bg-amber-400/20 text-amber-300 font-semibold shadow-xs'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">Terlewat ({missingBooks.length})</span>
            </button>
          )}
        </div>

        {/* Format Filter & View Mode Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] flex-1">
            {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`py-2 rounded-full font-medium transition-all text-center truncate ${
                  formatFilter === fmt
                    ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {fmt === 'ALL' ? 'Semua' : fmt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-full transition-all ${
                viewMode === 'grid' ? 'bg-white/[0.12] text-editorial-title' : 'text-editorial-muted hover:text-editorial-title'
              }`}
              title="Tampilan Grid"
              aria-label="Tampilan Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-full transition-all ${
                viewMode === 'table' ? 'bg-white/[0.12] text-editorial-title' : 'text-editorial-muted hover:text-editorial-title'
              }`}
              title="Tampilan Tabel (Arc)"
              aria-label="Tampilan Tabel"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tab Views */}
      {activeTab === 'OWNED' && (
        <div>
          {ownedBooks.length === 0 ? (
            <EmptyState
              title="Belum Ada Buku di Koleksi"
              description="Tekan tombol (+) di kartu buku untuk menandai volume yang sudah dimiliki."
              icon={<BookOpen className="w-8 h-8 text-editorial-muted" />}
              action={
                <Link href="/">
                  <Button variant="primary" size="md">
                    Jelajahi Katalog
                  </Button>
                </Link>
              }
            />
          ) : viewMode === 'table' ? (
            <div className="w-full overflow-x-auto min-w-0 rounded-2xl border border-white/[0.06] bg-surface-sunken/40">
              <SortableDataTable<LibraryTableRow>
                rows={getTableRows(ownedBooks)}
                columns={tableColumns}
                rowKey="id"
                defaultSort={{ key: 'title', direction: 'asc' }}
                caption="Daftar Koleksi Buku Dimiliki"
              />
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
            <EmptyState
              title="Belum Ada Buku di Wishlist"
              description="Tekan ikon bookmark di kartu buku untuk menyimpan judul incaran."
              icon={<Bookmark className="w-8 h-8 text-editorial-muted" />}
              action={
                <Link href="/">
                  <Button variant="primary" size="md">
                    Cari Buku Incaran
                  </Button>
                </Link>
              }
            />
          ) : viewMode === 'table' ? (
            <div className="w-full overflow-x-auto min-w-0 rounded-2xl border border-white/[0.06] bg-surface-sunken/40">
              <SortableDataTable<LibraryTableRow>
                rows={getTableRows(wishlistBooks)}
                columns={tableColumns}
                rowKey="id"
                defaultSort={{ key: 'title', direction: 'asc' }}
                caption="Daftar Wishlist Buku"
              />
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
            <EmptyState
              title="Belum Ada Seri Terlacak"
              description="Seri muncul di sini setelah ada volume yang ditandai dimiliki."
              icon={<Layers className="w-8 h-8 text-editorial-muted" />}
              action={
                <Link href="/series">
                  <Button variant="primary" size="md">
                    Buka Direktori Seri
                  </Button>
                </Link>
              }
            />
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
            <EmptyState
              title="Koleksi Serimu Lengkap!"
              description="Tidak ada volume yang terlewat dari seri yang kamu ikuti."
              icon={<Sparkles className="w-8 h-8 text-accent" />}
              action={
                <Link href="/">
                  <Button variant="primary" size="md">
                    Jelajahi Rilisan Baru
                  </Button>
                </Link>
              }
            />
          ) : viewMode === 'table' ? (
            <div className="w-full overflow-x-auto min-w-0 rounded-2xl border border-white/[0.06] bg-surface-sunken/40">
              <SortableDataTable<LibraryTableRow>
                rows={getTableRows(missingBooks)}
                columns={tableColumns}
                rowKey="id"
                defaultSort={{ key: 'title', direction: 'asc' }}
                caption="Daftar Volume Terlewat"
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-sans">
                <span className="font-semibold">Daftar Volume Terlewat: </span>
                <span>
                  Volume yang sudah terbit tapi belum ada di koleksimu.
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
});

export function LibraryViewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-white/[0.05] rounded" />
          <div className="h-8 w-60 bg-white/[0.08] rounded" />
          <div className="h-3.5 w-72 bg-white/[0.04] rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-white/[0.05] rounded-full" />
          <div className="h-8 w-20 bg-white/[0.05] rounded-full" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-white/[0.06] rounded-full" />
        <div className="h-8 w-24 bg-white/[0.06] rounded-full" />
        <div className="h-8 w-24 bg-white/[0.06] rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4.2] rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
