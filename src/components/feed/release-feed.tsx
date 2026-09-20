'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Search,
  X,
  Plus,
  Check,
  Bookmark,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { FeaturedReleaseCard } from '@/components/books/card-variants';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';

interface ReleaseFeedProps {
  initialBooks: Book[];
  publishers: Publisher[];
}

export function ReleaseFeed({ initialBooks, publishers }: ReleaseFeedProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();

  // Curated spotlight items
  const spotlightBooks = useMemo(() => {
    return initialBooks.filter((b) => b.coverImage && b.synopsis && b.currentPrice > 0).slice(0, 5);
  }, [initialBooks]);

  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const activeSpotlight = spotlightBooks[activeSpotlightIdx] || initialBooks[0];

  // Dedicated Highlight Rails - Newest to oldest (left to right)
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
      const scrollAmount = direction === 'left' ? -320 : 320;
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

  const handleViewAll = (format: 'Manga' | 'Light Novel') => {
    setFormatFilter(format);
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  return (
    <div className="space-y-12">
      {/* 1. HERO SPOTLIGHT SHOWCASE */}
      {activeSpotlight && (
        <div className="relative">
          <FeaturedReleaseCard book={activeSpotlight} />

          {/* Spotlight Pagination Pills */}
          {spotlightBooks.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {spotlightBooks.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSpotlightIdx(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeSpotlightIdx === idx ? 'w-6 bg-accent' : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Pilih sorotan ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MANGA HIGHLIGHT RAIL */}
      {mangaHighlights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold font-editorial text-editorial-title">
                Rilisan Manga Terbaru
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewAll('Manga')}
                className="text-xs font-semibold text-accent hover:underline hidden sm:inline-block"
              >
                Semua Manga →
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRail(mangaRailRef, 'left')}
                  className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-editorial-muted hover:text-editorial-title transition-all"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(mangaRailRef, 'right')}
                  className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-editorial-muted hover:text-editorial-title transition-all"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={mangaRailRef}
            className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          >
            {mangaHighlights.map((book) => (
              <div key={book.id} className="w-36 sm:w-44 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. LIGHT NOVEL HIGHLIGHT RAIL */}
      {lnHighlights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-lg sm:text-xl font-bold font-editorial text-editorial-title">
                Rilisan Light Novel Terbaru
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleViewAll('Light Novel')}
                className="text-xs font-semibold text-accent hover:underline hidden sm:inline-block"
              >
                Semua Light Novel →
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollRail(lnRailRef, 'left')}
                  className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-editorial-muted hover:text-editorial-title transition-all"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(lnRailRef, 'right')}
                  className="w-7 h-7 rounded-lg liquid-glass flex items-center justify-center text-editorial-muted hover:text-editorial-title transition-all"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={lnRailRef}
            className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory"
          >
            {lnHighlights.map((book) => (
              <div key={book.id} className="w-36 sm:w-44 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. MAIN CATALOG SECTION & CONTROLS */}
      <div ref={catalogRef} className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-editorial text-editorial-title">
              Jelajahi Seluruh Katalog
            </h2>
            <p className="text-xs text-editorial-muted mt-0.5">
              Menampilkan {filteredBooks.length} judul resmi
            </p>
          </div>

          {/* Desktop Filter Controls */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            {/* Format Pills */}
            <div className="flex items-center gap-1 p-1 rounded-2xl liquid-glass">
              {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                    formatFilter === fmt
                      ? 'bg-accent text-white font-semibold shadow-xs'
                      : 'text-editorial-muted hover:text-editorial-title'
                  }`}
                >
                  {fmt === 'ALL' ? 'Semua Format' : fmt}
                </button>
              ))}
            </div>

            {/* Publisher Select */}
            <select
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              className="px-3 py-2 rounded-2xl liquid-glass text-editorial-title focus:outline-none text-xs"
            >
              <option value="ALL">Semua Penerbit</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-2xl liquid-glass text-editorial-title focus:outline-none text-xs"
            >
              <option value="latest">Rilisan Terbaru</option>
              <option value="title">Judul (A-Z)</option>
              <option value="price_low">Harga: Terendah</option>
              <option value="price_high">Harga: Tertinggi</option>
            </select>
          </div>

          {/* Mobile Filter Toggle Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl liquid-glass text-xs font-semibold text-editorial-title shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-accent" />
              <span>Filter &amp; Urutkan ({filteredBooks.length})</span>
            </button>
          </div>
        </div>

        {/* Catalog Grid */}
        {filteredBooks.length === 0 ? (
          <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
            <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
            <h3 className="text-sm font-semibold text-editorial-title">Tidak ada buku yang cocok</h3>
            <p className="text-xs text-editorial-muted">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {filteredBooks.map((book) => (
              <ReleaseCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Filter Drawer / Bottom-Sheet */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full rounded-t-3xl bg-surface p-5 space-y-5 border-t border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="font-editorial text-base font-bold text-editorial-title">Filter &amp; Urutkan</span>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 rounded-lg text-editorial-muted hover:text-editorial-title"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">Format</span>
              <div className="grid grid-cols-3 gap-2">
                {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormatFilter(fmt)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      formatFilter === fmt ? 'bg-accent text-white shadow-sm' : 'bg-white/5 text-editorial-muted'
                    }`}
                  >
                    {fmt === 'ALL' ? 'Semua' : fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Publisher Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">Penerbit</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPubFilter('ALL')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    pubFilter === 'ALL' ? 'bg-accent text-white shadow-sm' : 'bg-white/5 text-editorial-muted'
                  }`}
                >
                  Semua Penerbit
                </button>
                {publishers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPubFilter(p.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      pubFilter === p.id ? 'bg-accent text-white shadow-sm' : 'bg-white/5 text-editorial-muted'
                    }`}
                  >
                    {p.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">Urutkan</span>
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
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      sortBy === s.id ? 'bg-accent text-white shadow-sm' : 'bg-white/5 text-editorial-muted'
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
              className="w-full py-3 rounded-2xl bg-accent text-white font-semibold text-xs shadow-md"
            >
              Terapkan Filter ({filteredBooks.length} Buku)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
