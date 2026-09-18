'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import {
  Sparkles,
  BookOpen,
  Search,
  Check,
  Plus,
  Bookmark,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
} from 'lucide-react';

interface ReleaseFeedProps {
  initialBooks: Book[];
  publishers: Publisher[];
}

export function ReleaseFeed({ initialBooks, publishers }: ReleaseFeedProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();

  // Find 5 top spotlight books with covers for the interactive Hero Spotlight
  const spotlightBooks = useMemo(() => {
    const list = initialBooks.filter((b) => b.coverImage && b.synopsis);
    // Prioritize high-profile series
    const prioritized = list.filter((b) =>
      ['alya', 'spy', 'bungo stray', 'shape of voice', 'one piece', 'akasha', 'frieren', 're-living'].some((k) =>
        b.title.toLowerCase().includes(k)
      )
    );
    return prioritized.slice(0, 5);
  }, [initialBooks]);

  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const activeSpotlight = spotlightBooks[activeSpotlightIdx] || spotlightBooks[0];

  // Dedicated Horizontal Scroll Rails
  const mangaHighlights = useMemo(() => {
    return initialBooks.filter((b) => b.category === 'Manga' && b.coverImage).slice(0, 14);
  }, [initialBooks]);

  const lnHighlights = useMemo(() => {
    return initialBooks.filter((b) => b.category === 'Light Novel' && b.coverImage).slice(0, 14);
  }, [initialBooks]);

  const mangaRailRef = useRef<HTMLDivElement>(null);
  const lnRailRef = useRef<HTMLDivElement>(null);

  const scrollRail = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filters
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel' | 'Merchandise'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PREORDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'price_low' | 'price_high'>('latest');

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
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [initialBooks, formatFilter, pubFilter, statusFilter, searchQuery, sortBy]);

  const spotlightOwned = isLoaded && activeSpotlight && isOwned(activeSpotlight.id);
  const spotlightWishlisted = isLoaded && activeSpotlight && isWishlisted(activeSpotlight.id);

  return (
    <div className="space-y-10">
      {/* 1. HERO SPOTLIGHT SHOWCASE (Rich Desktop Experience) */}
      {activeSpotlight && (
        <div className="relative rounded-3xl bg-gradient-to-br from-surface via-surface-raised/90 to-surface-sunken border border-border-medium overflow-hidden shadow-2xl p-6 sm:p-10 transition-all">
          {/* Ambient Background Glow matching category */}
          <div
            className={`absolute top-0 right-1/4 w-96 h-96 rounded-full blur-[140px] pointer-events-none opacity-30 ${
              activeSpotlight.category === 'Light Novel' ? 'bg-amber-500' : activeSpotlight.category === 'Merchandise' ? 'bg-purple-500' : 'bg-sky-500'
            }`}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-mono font-bold tracking-wider uppercase">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Sorotan Rilis Pilihan</span>
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase ${
                    activeSpotlight.category === 'Light Novel'
                      ? 'bg-amber-500/20 text-amber-300'
                      : activeSpotlight.category === 'Merchandise'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-sky-500/20 text-sky-300'
                  }`}
                >
                  {activeSpotlight.category}
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-editorial-body bg-surface-raised">
                  {activeSpotlight.publisherShortName}
                </span>

                {activeSpotlight.category !== 'Merchandise' && activeSpotlight.volume !== null && activeSpotlight.volume !== undefined && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wider backdrop-blur-md shadow-sm ${
                      activeSpotlight.category === 'Light Novel'
                        ? 'bg-black/60 text-amber-200/90'
                        : 'bg-black/60 text-sky-200/90'
                    }`}
                  >
                    Vol. {activeSpotlight.volume}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold font-editorial text-editorial-title tracking-tight leading-[1.15]">
                {activeSpotlight.title}
              </h1>

              {activeSpotlight.originalTitle && activeSpotlight.originalTitle !== activeSpotlight.title && (
                <p className="text-xs sm:text-sm text-editorial-muted italic font-editorial">
                  {activeSpotlight.originalTitle}
                </p>
              )}

              <p className="text-xs sm:text-sm text-editorial-body line-clamp-3 leading-relaxed max-w-xl">
                {activeSpotlight.synopsis}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-[10px] font-mono text-editorial-faint block uppercase">Harga Resmi</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title">
                    {formatRupiah(activeSpotlight.currentPrice)}
                  </span>
                </div>

                <div className="h-8 w-px bg-border-subtle hidden sm:block" />

                {activeSpotlight.releaseDate && (
                  <div>
                    <span className="text-[10px] font-mono text-editorial-faint block uppercase">Tanggal Terbit</span>
                    <span className="text-xs sm:text-sm font-mono text-editorial-body">
                      {formatDateWIB(activeSpotlight.releaseDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/books/${activeSpotlight.slug}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent/90 transition-all shadow-md active:scale-95"
                >
                  <span>Lihat Detail Buku</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => toggleOwned(activeSpotlight.id, activeSpotlight.seriesId)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                    spotlightOwned
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-xs'
                      : 'bg-surface hover:bg-surface-raised text-editorial-body hover:text-editorial-title'
                  }`}
                >
                  {spotlightOwned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{spotlightOwned ? 'Dimiliki' : 'Tambah ke Koleksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(activeSpotlight.id, activeSpotlight.seriesId)}
                  className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                    spotlightWishlisted
                      ? 'bg-accent/20 text-accent'
                      : 'bg-surface hover:bg-surface-raised text-editorial-muted hover:text-editorial-title'
                  }`}
                  aria-label="Tambah ke Wishlist"
                >
                  <Bookmark className={`w-4 h-4 ${spotlightWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Right Interactive Cover Carousel */}
            <div className="lg:col-span-5 flex flex-col items-center gap-4">
              <Link
                href={`/books/${activeSpotlight.slug}`}
                className="relative group/cover block aspect-[3/4] w-52 sm:w-64 rounded-2xl overflow-hidden shadow-2xl border border-border-medium hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-accent/30 via-sky-500/20 to-purple-500/20 blur-xl opacity-60 group-hover/cover:opacity-90 transition-opacity" />
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface-sunken">
                  {activeSpotlight.coverImage ? (
                    <img
                      src={activeSpotlight.coverImage}
                      alt={activeSpotlight.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-raised">
                      <BookOpen className="w-12 h-12 text-editorial-faint" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Thumbnails to switch spotlight */}
              <div className="flex items-center gap-2">
                {spotlightBooks.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveSpotlightIdx(idx)}
                    className={`relative w-10 h-14 rounded-lg overflow-hidden border transition-all ${
                      activeSpotlightIdx === idx
                        ? 'border-accent ring-2 ring-accent/40 scale-105'
                        : 'border-border-subtle opacity-50 hover:opacity-100'
                    }`}
                    title={b.title}
                  >
                    {b.coverImage ? (
                      <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-raised" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEDICATED HORIZONTAL SCROLL RAILS: MANGA & LIGHT NOVEL */}
      <div className="space-y-8">
        {/* Rail 1: Komik & Manga */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-editorial text-editorial-title">
                  Komik &amp; Manga Terbaru
                </h2>
              </div>
            </div>

            {/* Controls: Scroll Buttons + View All */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRail(mangaRailRef, 'left')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-surface border border-border-subtle hover:border-accent/40 text-editorial-muted hover:text-editorial-title transition-all active:scale-95"
                aria-label="Scroll kiri manga"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(mangaRailRef, 'right')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-surface border border-border-subtle hover:border-accent/40 text-editorial-muted hover:text-editorial-title transition-all active:scale-95"
                aria-label="Scroll kanan manga"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFormatFilter('Manga')}
                className="ml-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-editorial-muted hover:text-accent hover:bg-surface transition-all"
              >
                Semua Manga →
              </button>
            </div>
          </div>

          <div
            ref={mangaRailRef}
            className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth"
          >
            {mangaHighlights.map((book) => (
              <div key={book.id} className="w-36 sm:w-44 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </div>

        {/* Rail 2: Light Novel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold font-editorial text-editorial-title">
                  Light Novel Pilihan &amp; Terkurasi
                </h2>
              </div>
            </div>

            {/* Controls: Scroll Buttons + View All */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRail(lnRailRef, 'left')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-surface border border-border-subtle hover:border-accent/40 text-editorial-muted hover:text-editorial-title transition-all active:scale-95"
                aria-label="Scroll kiri light novel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(lnRailRef, 'right')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-surface border border-border-subtle hover:border-accent/40 text-editorial-muted hover:text-editorial-title transition-all active:scale-95"
                aria-label="Scroll kanan light novel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setFormatFilter('Light Novel')}
                className="ml-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-editorial-muted hover:text-accent hover:bg-surface transition-all"
              >
                Semua Light Novel →
              </button>
            </div>
          </div>

          <div
            ref={lnRailRef}
            className="flex items-center gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth"
          >
            {lnHighlights.map((book) => (
              <div key={book.id} className="w-36 sm:w-44 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. DESKTOP FILTER & TOOLBAR */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border-subtle shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Real-time Search Input on Desktop */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul komik, light novel, merchandise, atau pengarang..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-raised border border-border-subtle hover:border-border-medium focus:border-accent/50 focus:outline-none text-xs text-editorial-title placeholder:text-editorial-faint transition-colors"
            />
          </div>

          {/* Format Segmented Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-surface-raised border border-border-subtle text-xs shrink-0 self-start md:self-auto overflow-x-auto">
            {(['ALL', 'Manga', 'Light Novel', 'Merchandise'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  formatFilter === fmt
                    ? 'bg-surface text-editorial-title shadow-xs font-semibold'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {fmt === 'ALL'
                  ? 'Semua Format'
                  : fmt === 'Manga'
                  ? 'Manga'
                  : fmt === 'Light Novel'
                  ? 'Light Novel'
                  : 'Merchandise'}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Publisher Pills, Status Filter, and Sort */}
        <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Publishers */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-editorial-faint text-[11px] font-mono mr-1">Penerbit:</span>
            <button
              type="button"
              onClick={() => setPubFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                pubFilter === 'ALL'
                  ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-xs'
                  : 'bg-surface-raised border-border-subtle text-editorial-muted hover:text-editorial-title'
              }`}
            >
              Semua Penerbit
            </button>
            {publishers.map((pub) => (
              <button
                key={pub.id}
                type="button"
                onClick={() => setPubFilter(pub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  pubFilter === pub.id
                    ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-xs'
                    : 'bg-surface-raised/60 border-border-subtle text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {pub.name}
              </button>
            ))}
          </div>

          {/* Right Controls: Status & Sort */}
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <span className="text-editorial-faint text-[11px] font-mono">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-surface-raised border border-border-subtle text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">Semua</option>
                <option value="AVAILABLE">Tersedia</option>
                <option value="PREORDER">Pre-Order</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1">
              <span className="text-editorial-faint text-[11px] font-mono">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-surface-raised border border-border-subtle text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="latest">Rilis Terbaru</option>
                <option value="title">Judul (A-Z)</option>
                <option value="price_low">Harga Terendah</option>
                <option value="price_high">Harga Tertinggi</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE RESULTS SUMMARY */}
      <div className="flex items-center justify-between text-xs text-editorial-faint font-mono px-1">
        <span>Menampilkan {filteredBooks.length} item terkurasi</span>
        {searchQuery && (
          <span className="text-accent font-medium">Hasil pencarian: &quot;{searchQuery}&quot;</span>
        )}
      </div>

      {/* 5. BOOKS GRID */}
      {filteredBooks.length === 0 ? (
        <div className="py-20 text-center bg-surface border border-border-subtle rounded-3xl space-y-2">
          <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada item yang sesuai dengan filter</h3>
          <p className="text-xs text-editorial-muted">Coba ubah kata kunci pencarian atau reset filter format/penerbit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {filteredBooks.map((book) => (
            <ReleaseCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
