'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  SlidersHorizontal,
  ArrowRight,
  FilterX,
} from 'lucide-react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { FeaturedReleaseCard } from '@/components/books/card-variants';
import { useCollection } from '@/hooks/use-collection';

const PAGE_SIZE = 36;

interface ReleaseFeedProps {
  initialBooks: Book[];
  publishers: Publisher[];
}

export function ReleaseFeed({ initialBooks, publishers }: ReleaseFeedProps) {
  // Curated spotlight items (top items with verified synopsis and cover image)
  const spotlightBooks = useMemo(() => {
    return initialBooks.filter((b) => b.coverImage && b.synopsis && b.currentPrice > 0).slice(0, 5);
  }, [initialBooks]);

  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const activeSpotlight = spotlightBooks[activeSpotlightIdx] || initialBooks[0];

  // Dedicated Highlight Rails - Newest to oldest
  const mangaHighlights = useMemo(() => {
    return [...initialBooks]
      .filter((b) => b.category === 'Manga' && b.coverImage && !b.isSetVariant)
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.volume ?? 0) - (a.volume ?? 0);
      })
      .slice(0, 18);
  }, [initialBooks]);

  const lnHighlights = useMemo(() => {
    return [...initialBooks]
      .filter((b) => b.category === 'Light Novel' && b.coverImage && !b.isSetVariant)
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.volume ?? 0) - (a.volume ?? 0);
      })
      .slice(0, 18);
  }, [initialBooks]);

  const mangaRailRef = useRef<HTMLDivElement>(null);
  const lnRailRef = useRef<HTMLDivElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  const scrollRail = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filter States
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PREORDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'price_low' | 'price_high'>('latest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleViewAll = (format: 'Manga' | 'Light Novel') => {
    setFormatFilter(format);
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasActiveFilters = formatFilter !== 'ALL' || pubFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery.trim() !== '' || sortBy !== 'latest';

  const resetFilters = () => {
    setFormatFilter('ALL');
    setPubFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setSortBy('latest');
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    return initialBooks
      .filter((book) => {
        if (formatFilter !== 'ALL' && book.category !== formatFilter) return false;
        if (pubFilter !== 'ALL' && book.publisherId !== pubFilter) return false;
        if (statusFilter !== 'ALL' && book.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = book.title.toLowerCase().includes(q);
          const matchSeries = book.seriesName?.toLowerCase().includes(q);
          const matchAuthor = Array.isArray(book.authors) && book.authors.some((a) => {
            if (typeof a === 'string') return a.toLowerCase().includes(q);
            if (typeof a === 'object' && a && 'name' in a) return String((a as any).name).toLowerCase().includes(q);
            return false;
          });
          if (!matchTitle && !matchSeries && !matchAuthor) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'price_low') {
          return a.currentPrice - b.currentPrice;
        }
        if (sortBy === 'price_high') {
          return b.currentPrice - a.currentPrice;
        }
        // latest
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [initialBooks, formatFilter, pubFilter, statusFilter, searchQuery, sortBy]);

  // Reset visible count when filters change
  const prevFilterKey = useRef('');
  const filterKey = `${formatFilter}-${pubFilter}-${statusFilter}-${searchQuery}-${sortBy}`;
  if (filterKey !== prevFilterKey.current) {
    prevFilterKey.current = filterKey;
    if (visibleCount !== PAGE_SIZE) {
      setVisibleCount(PAGE_SIZE);
    }
  }

  const visibleBooks = useMemo(() => filteredBooks.slice(0, visibleCount), [filteredBooks, visibleCount]);
  const hasMore = visibleCount < filteredBooks.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredBooks.length));
  }, [filteredBooks.length]);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* 1. HERO EDITORIAL INTRODUCTION */}
      <section className="space-y-4 pt-2 sm:pt-4">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs shrink-0" />
            <span>Katalog Indonesia</span>
          </div>

          <h1 className="font-editorial text-3xl sm:text-5xl lg:text-6xl font-normal text-editorial-title tracking-tight leading-[1.08]">
            Pelacak Manga &amp; Light Novel.
          </h1>

          <p className="text-sm sm:text-base text-editorial-body leading-relaxed max-w-2xl font-sans">
            Arsip lengkap terbitan Elex Media Komputindo, m&amp;c!, dan Phoenix Gramedia Indonesia.
            Pantau rilis mingguan, varian kanonikal, riwayat harga, dan kelengkapan koleksi Anda.
          </p>
        </div>
      </section>

      {/* 2. CURATED SPOTLIGHT SHOWCASE */}
      {activeSpotlight && (
        <section className="space-y-3">
          <FeaturedReleaseCard book={activeSpotlight} />

          {/* Minimal Spotlight Pagination */}
          {spotlightBooks.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {spotlightBooks.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSpotlightIdx(idx)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    activeSpotlightIdx === idx ? 'w-6 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Pilih sorotan ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. MANGA HIGHLIGHT RAIL */}
      {mangaHighlights.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl sm:text-2xl font-editorial font-normal text-editorial-title tracking-tight">
                Rilisan Manga Terbaru
              </h2>
              <span className="text-[11px] font-mono text-editorial-faint hidden sm:inline">
                {mangaHighlights.length} rilisan terkini
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleViewAll('Manga')}
                className="text-xs font-mono text-editorial-muted hover:text-editorial-title transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <span>Semua Manga</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRail(mangaRailRef, 'left')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title hover:bg-white/[0.06] transition-all"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(mangaRailRef, 'right')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title hover:bg-white/[0.06] transition-all"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={mangaRailRef}
            className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pt-1"
          >
            {mangaHighlights.map((book) => (
              <div key={book.id} className="w-36 sm:w-44 lg:w-48 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. LIGHT NOVEL HIGHLIGHT RAIL */}
      {lnHighlights.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl sm:text-2xl font-editorial font-normal text-editorial-title tracking-tight">
                Rilisan Light Novel Terbaru
              </h2>
              <span className="text-[11px] font-mono text-editorial-faint hidden sm:inline">
                {lnHighlights.length} rilisan terkini
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleViewAll('Light Novel')}
                className="text-xs font-mono text-editorial-muted hover:text-editorial-title transition-colors hidden sm:inline-flex items-center gap-1"
              >
                <span>Semua Light Novel</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRail(lnRailRef, 'left')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title hover:bg-white/[0.06] transition-all"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(lnRailRef, 'right')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title hover:bg-white/[0.06] transition-all"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={lnRailRef}
            className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pt-1"
          >
            {lnHighlights.map((book) => (
              <div key={book.id} className="w-36 sm:w-44 lg:w-48 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. MAIN CATALOG ARCHIVE & COHESIVE CONTROLS */}
      <section ref={catalogRef} className="space-y-8 pt-4">
        {/* Section Heading & Result Counter */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-white/[0.04] pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-editorial font-normal text-editorial-title tracking-tight">
              Seluruh Katalog
            </h2>
            <p className="text-xs text-editorial-muted mt-1 font-mono">
              Menampilkan {filteredBooks.length.toLocaleString('id-ID')} judul terdaftar
            </p>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1.5 self-start sm:self-auto"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Bersihkan Filter</span>
            </button>
          )}
        </div>

        {/* Symmetrical Search & Filter Control Console */}
        <div className="space-y-2.5">
          {/* Integrated Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Saring judul, seri, pengarang..."
              className="w-full h-10 pl-10 pr-9 rounded-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.06] border border-white/[0.06] focus:border-white/[0.15] text-editorial-title placeholder:text-editorial-faint focus:outline-none transition-all text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-editorial-faint hover:text-editorial-title p-1"
                aria-label="Hapus kata kunci"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Symmetrical Filter Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
            {/* Format Segmented Tab */}
            <div className="sm:col-span-6 grid grid-cols-3 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
              {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`py-1.5 text-center rounded-full font-medium transition-all text-xs truncate ${
                    formatFilter === fmt
                      ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                      : 'text-editorial-muted hover:text-editorial-title'
                  }`}
                >
                  {fmt === 'ALL' ? 'Semua' : fmt}
                </button>
              ))}
            </div>

            {/* Symmetrical Dropdowns */}
            <div className="sm:col-span-6 grid grid-cols-2 gap-2">
              {/* Publisher Dropdown */}
              <div className="relative">
                <select
                  value={pubFilter}
                  onChange={(e) => setPubFilter(e.target.value)}
                  className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
                >
                  <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
                  {publishers.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                      {p.shortName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
                >
                  <option value="latest" className="bg-surface text-editorial-title">Rilisan Terbaru</option>
                  <option value="title" className="bg-surface text-editorial-title">Judul (A-Z)</option>
                  <option value="price_low" className="bg-surface text-editorial-title">Harga Terendah</option>
                  <option value="price_high" className="bg-surface text-editorial-title">Harga Tertinggi</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Bookshelf Grid */}
        {filteredBooks.length === 0 ? (
          <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <BookOpen className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
            <h3 className="text-sm font-medium text-editorial-title">Tidak ada buku yang sesuai kriteria</h3>
            <p className="text-xs text-editorial-muted max-w-sm mx-auto">
              Coba gunakan kata kunci berbeda atau bersihkan filter yang sedang aktif.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-editorial-title border border-white/[0.08] transition-all"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
            {visibleBooks.map((book) => (
              <ReleaseCard key={book.id} book={book} />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center pt-8 pb-4">
            <button
              type="button"
              onClick={loadMore}
              className="px-8 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.16] text-xs font-mono font-medium text-editorial-title transition-all shadow-sm active:scale-95"
            >
              Muat Lebih Banyak ({filteredBooks.length - visibleCount} tersisa)
            </button>
          </div>
        )}
      </section>

      {/* Mobile Filter Bottom-Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full rounded-t-3xl bg-surface p-6 space-y-6 border-t border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="font-editorial text-lg font-normal text-editorial-title">
                Filter &amp; Pengurutan
              </span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-full text-editorial-muted hover:text-editorial-title"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Format
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormatFilter(fmt)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      formatFilter === fmt ? 'bg-white text-black font-semibold shadow-sm' : 'bg-white/[0.04] text-editorial-muted'
                    }`}
                  >
                    {fmt === 'ALL' ? 'Semua' : fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Publisher Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Penerbit
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPubFilter('ALL')}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                    pubFilter === 'ALL' ? 'bg-white text-black font-semibold shadow-sm' : 'bg-white/[0.04] text-editorial-muted'
                  }`}
                >
                  Semua Penerbit
                </button>
                {publishers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPubFilter(p.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      pubFilter === p.id ? 'bg-white text-black font-semibold shadow-sm' : 'bg-white/[0.04] text-editorial-muted'
                    }`}
                  >
                    {p.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Urutkan Berdasarkan
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'latest', label: 'Rilisan Terbaru' },
                  { id: 'title', label: 'Judul (A-Z)' },
                  { id: 'price_low', label: 'Harga Terendah' },
                  { id: 'price_high', label: 'Harga Tertinggi' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSortBy(s.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                      sortBy === s.id ? 'bg-white text-black font-semibold shadow-sm' : 'bg-white/[0.04] text-editorial-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="w-full py-3 rounded-full bg-white text-black font-semibold text-xs shadow-md"
            >
              Terapkan Filter ({filteredBooks.length} Buku)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
