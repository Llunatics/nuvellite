'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';

interface ReleaseFeedProps {
  initialBooks: Book[];
  publishers: Publisher[];
}

export function ReleaseFeed({ initialBooks, publishers }: ReleaseFeedProps) {
  const router = useRouter();
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();

  // Curated spotlight items
  const spotlightBooks = useMemo(() => {
    return initialBooks.filter((b) => b.coverImage && b.synopsis && b.currentPrice > 0).slice(0, 5);
  }, [initialBooks]);

  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const activeSpotlight = spotlightBooks[activeSpotlightIdx] || initialBooks[0];

  const spotlightOwned = isLoaded && activeSpotlight && isOwned(activeSpotlight.id);
  const spotlightWishlisted = isLoaded && activeSpotlight && isWishlisted(activeSpotlight.id);

  // Dedicated Highlight Rails - Strictly sorted from newest to oldest (left to right)
  const mangaHighlights = useMemo(() => {
    return [...initialBooks]
      .filter((b) => b.category === 'Manga' && b.coverImage && !b.isSetVariant)
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA; // Newest first (left to right)
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
        if (dateB !== dateA) return dateB - dateA; // Newest first (left to right)
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

  const handleViewAll = (format: 'Manga' | 'Light Novel') => {
    setFormatFilter(format);
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        // latest
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [initialBooks, formatFilter, pubFilter, statusFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* 1. HERO SPOTLIGHT SHOWCASE */}
      {activeSpotlight && (
        <div className="relative overflow-hidden rounded-3xl bg-surface border border-slate-800 p-4 sm:p-8 shadow-xl">
          {/* Subtle Ambient Background Gradient */}
          <div
            className={`absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-colors duration-700 ${
              activeSpotlight.category === 'Light Novel'
                ? 'bg-amber-500'
                : activeSpotlight.category === 'Merchandise'
                ? 'bg-purple-500'
                : 'bg-sky-500'
            }`}
          />

          {/* MOBILE VIEW (< lg): Compact Cohesive Card */}
          <div className="lg:hidden space-y-3.5 relative z-10">
            {/* Top row: Cover on left, Badges & Info on right */}
            <div className="flex items-start gap-3">
              <Link
                href={`/books/${activeSpotlight.slug}`}
                className="relative aspect-[3/4] w-24 sm:w-28 rounded-xl overflow-hidden shadow-md border border-slate-700/60 shrink-0 bg-surface-sunken"
              >
                {activeSpotlight.coverImage ? (
                  <img
                    src={activeSpotlight.coverImage}
                    alt={activeSpotlight.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-editorial-faint" />
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-200 text-[9px] font-mono font-semibold uppercase">
                    <Flame className="w-3 h-3 text-accent" />
                    <span>Sorotan</span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase border border-slate-700/60 ${
                      activeSpotlight.category === 'Light Novel'
                        ? 'bg-slate-800/80 text-amber-300'
                        : activeSpotlight.category === 'Merchandise'
                        ? 'bg-slate-800/80 text-purple-300'
                        : 'bg-slate-800/80 text-sky-300'
                    }`}
                  >
                    {activeSpotlight.category}
                  </span>

                  {activeSpotlight.category !== 'Merchandise' &&
                    activeSpotlight.volume !== null &&
                    activeSpotlight.volume !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        Vol. {activeSpotlight.volume}
                      </span>
                    )}
                </div>

                <Link href={`/books/${activeSpotlight.slug}`}>
                  <h2 className="text-sm sm:text-base font-bold font-sans text-editorial-title line-clamp-2 leading-snug hover:text-accent transition-colors">
                    {activeSpotlight.title}
                  </h2>
                </Link>

                <div className="text-[10.5px] text-editorial-muted font-mono truncate">
                  <span>{activeSpotlight.publisherShortName}</span>
                  {activeSpotlight.releaseDate && <span> • {formatDateWIB(activeSpotlight.releaseDate)}</span>}
                </div>

                <div className="pt-0.5">
                  <span className="text-[8px] font-mono text-editorial-faint uppercase leading-none block">
                    Harga Resmi
                  </span>
                  <span className="text-sm font-mono font-bold text-editorial-title">
                    {formatRupiah(activeSpotlight.currentPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 pt-0.5">
              <Link
                href={`/books/${activeSpotlight.slug}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all shadow-sm active:scale-95"
              >
                <span>Lihat Detail Buku</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => toggleOwned(activeSpotlight.id, activeSpotlight.seriesId)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                  spotlightOwned
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/60'
                }`}
                aria-label={spotlightOwned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
                title={spotlightOwned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
              >
                {spotlightOwned ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(activeSpotlight.id, activeSpotlight.seriesId)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                  spotlightWishlisted
                    ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                }`}
                aria-label="Tambah ke Wishlist"
                title="Tambah ke Wishlist"
              >
                <Bookmark className={`w-4 h-4 ${spotlightWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Thumbnails to switch spotlight */}
            <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-800/60">
              {spotlightBooks.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setActiveSpotlightIdx(idx)}
                  className={`relative w-8 h-11 rounded-md overflow-hidden border transition-all ${
                    activeSpotlightIdx === idx
                      ? 'border-accent ring-2 ring-accent/40 scale-105'
                      : 'border-slate-800 opacity-40 hover:opacity-100'
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

          {/* DESKTOP VIEW (lg and above): Full 12-Column Showcase */}
          <div className="hidden lg:grid relative z-10 grid-cols-12 gap-8 items-center">
            {/* Left Info Column */}
            <div className="col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-mono font-semibold tracking-wider uppercase shadow-xs">
                  <Flame className="w-3.5 h-3.5 text-accent" />
                  <span>Sorotan Rilis Pilihan</span>
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wider uppercase border border-slate-700/60 ${
                    activeSpotlight.category === 'Light Novel'
                      ? 'bg-slate-800/80 text-amber-300'
                      : activeSpotlight.category === 'Merchandise'
                      ? 'bg-slate-800/80 text-purple-300'
                      : 'bg-slate-800/80 text-sky-300'
                  }`}
                >
                  {activeSpotlight.category}
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-300 bg-slate-800/80 border border-slate-700/60">
                  {activeSpotlight.publisherShortName}
                </span>

                {activeSpotlight.category !== 'Merchandise' &&
                  activeSpotlight.volume !== null &&
                  activeSpotlight.volume !== undefined && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/60 shadow-sm">
                      Vol. {activeSpotlight.volume}
                    </span>
                  )}
              </div>

              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold font-editorial text-editorial-title tracking-tight leading-[1.15]">
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

              <div className="pt-2 flex items-center gap-4">
                <div>
                  <span className="text-[10px] font-mono text-editorial-faint block uppercase">Harga Resmi</span>
                  <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title">
                    {formatRupiah(activeSpotlight.currentPrice)}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden sm:block" />

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
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all active:scale-95 ${
                    spotlightOwned
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-700/60'
                  }`}
                >
                  {spotlightOwned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{spotlightOwned ? 'Dimiliki' : 'Tambah ke Koleksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(activeSpotlight.id, activeSpotlight.seriesId)}
                  className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
                    spotlightWishlisted
                      ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                  aria-label="Tambah ke Wishlist"
                >
                  <Bookmark className={`w-4 h-4 ${spotlightWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Right Interactive Cover Carousel */}
            <div className="col-span-5 flex flex-col items-center gap-4">
              <Link
                href={`/books/${activeSpotlight.slug}`}
                className="relative group/cover block aspect-[3/4] w-52 sm:w-64 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 hover:scale-[1.02] transition-transform duration-300"
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
                        : 'border-slate-800 opacity-50 hover:opacity-100'
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold font-sans tracking-tight text-editorial-title truncate">
                Rilisan Manga Terbaru
              </h2>
            </div>

            {/* Controls: Scroll Buttons + View All */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollRail(mangaRailRef, 'left')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all active:scale-95"
                aria-label="Scroll kiri manga"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(mangaRailRef, 'right')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all active:scale-95"
                aria-label="Scroll kanan manga"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewAll('Manga')}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-accent hover:bg-slate-800/80 border border-slate-700/50 transition-all active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1"
                title="Lihat semua manga di katalog"
              >
                <span className="sm:hidden">Semua →</span>
                <span className="hidden sm:inline">Lihat Semua Manga →</span>
              </button>
            </div>
          </div>

          <div
            ref={mangaRailRef}
            className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {mangaHighlights.map((book) => (
              <div key={book.id} className="w-40 sm:w-44 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </div>

        {/* Rail 2: Light Novel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold font-sans tracking-tight text-editorial-title truncate">
                Rilisan Light Novel Terbaru
              </h2>
            </div>

            {/* Controls: Scroll Buttons + View All */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => scrollRail(lnRailRef, 'left')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all active:scale-95"
                aria-label="Scroll kiri light novel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(lnRailRef, 'right')}
                className="hidden sm:flex w-7 h-7 rounded-xl items-center justify-center bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white transition-all active:scale-95"
                aria-label="Scroll kanan light novel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewAll('Light Novel')}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-300 hover:text-accent hover:bg-slate-800/80 border border-slate-700/50 transition-all active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1"
                title="Lihat semua light novel di katalog"
              >
                <span className="sm:hidden">Semua →</span>
                <span className="hidden sm:inline">Lihat Semua Light Novel →</span>
              </button>
            </div>
          </div>

          <div
            ref={lnRailRef}
            className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {lnHighlights.map((book) => (
              <div key={book.id} className="w-40 sm:w-44 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. CATALOG FILTER & TOOLBAR (Optimized for Mobile & Desktop) */}
      <div
        ref={catalogRef}
        id="katalog"
        className="scroll-mt-20 p-3.5 sm:p-5 rounded-2xl bg-surface border border-slate-800 shadow-sm space-y-3 sm:space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Real-time Search Input on Desktop & Mobile with Enter Key Support */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
              }
            }}
            className="relative flex-1 max-w-md"
          >
            <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari komik, light novel, pengarang (tekan Enter)..."
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-surface-raised border border-slate-700/60 focus:border-accent/60 focus:outline-none text-xs text-editorial-title placeholder:text-editorial-faint transition-colors"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-7 top-1/2 -translate-y-1/2 p-1 text-editorial-faint hover:text-editorial-title"
                aria-label="Bersihkan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 hover:text-accent border border-slate-700"
              title="Buka halaman pencarian penuh (Enter)"
            >
              ↵
            </button>
          </form>

          {/* Format Segmented Tabs */}
          <div className="w-full sm:w-auto flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs overflow-x-auto scrollbar-none shrink-0">
            {(['ALL', 'Manga', 'Light Novel', 'Merchandise'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap text-center ${
                  formatFilter === fmt
                    ? 'bg-surface text-editorial-title shadow-xs font-semibold'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {fmt === 'ALL'
                  ? 'Semua'
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
        <div className="pt-2 sm:pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Publishers - Sleek horizontal swipe on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-1 px-1">
            <span className="text-editorial-faint text-[11px] font-mono mr-1 shrink-0">Penerbit:</span>
            <button
              type="button"
              onClick={() => setPubFilter('ALL')}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all shrink-0 ${
                pubFilter === 'ALL'
                  ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-xs'
                  : 'bg-surface-raised border-slate-700/50 text-editorial-muted hover:text-editorial-title'
              }`}
            >
              Semua
            </button>
            {publishers.map((pub) => (
              <button
                key={pub.id}
                type="button"
                onClick={() => setPubFilter(pub.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium border transition-all shrink-0 ${
                  pubFilter === pub.id
                    ? 'bg-accent/15 border-accent/40 text-accent font-semibold shadow-xs'
                    : 'bg-surface-raised border-slate-700/50 text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {pub.shortName}
              </button>
            ))}
          </div>

          {/* Status and Sort Filters */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-surface-raised border border-slate-700/50 text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Status: Semua</option>
              <option value="AVAILABLE">Tersedia</option>
              <option value="PREORDER">Pre-order</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-raised border border-slate-700/50 text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="latest">Rilis Terbaru</option>
              <option value="title">Judul (A-Z)</option>
              <option value="price_low">Harga Terendah</option>
              <option value="price_high">Harga Tertinggi</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. ACTIVE RESULTS SUMMARY */}
      <div className="flex items-center justify-between text-xs text-editorial-faint font-mono px-1">
        <span>Menampilkan {filteredBooks.length} judul rilis</span>
        {searchQuery && (
          <span className="text-accent font-medium">Hasil pencarian: &quot;{searchQuery}&quot;</span>
        )}
      </div>

      {/* 5. BOOKS GRID */}
      {filteredBooks.length === 0 ? (
        <div className="py-20 text-center bg-surface border border-slate-800 rounded-3xl space-y-2">
          <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada item yang sesuai dengan filter</h3>
          <p className="text-xs text-editorial-muted">Coba ubah kata kunci pencarian atau reset filter format/penerbit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredBooks.map((book) => (
            <ReleaseCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
