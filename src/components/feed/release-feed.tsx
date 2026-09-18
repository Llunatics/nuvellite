'use client';

import React, { useState, useMemo } from 'react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { Sparkles, Calendar, BookOpen, Layers, Filter } from 'lucide-react';

interface ReleaseFeedProps {
  initialBooks: Book[];
  publishers: Publisher[];
  stats: {
    totalBooks: number;
    totalSeries: number;
    mangaCount: number;
    lnCount: number;
  };
}

export function ReleaseFeed({ initialBooks, publishers, stats }: ReleaseFeedProps) {
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [wednesdayOnly, setWednesdayOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PREORDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'price_low' | 'price_high'>('latest');

  const filteredBooks = useMemo(() => {
    return initialBooks.filter((book) => {
      if (formatFilter !== 'ALL' && book.category !== formatFilter) return false;
      if (pubFilter !== 'ALL' && book.publisherId !== pubFilter) return false;
      if (wednesdayOnly && !book.isWednesdayRelease) return false;
      if (statusFilter !== 'ALL' && book.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = book.title.toLowerCase().includes(q);
        const matchSeries = book.seriesName?.toLowerCase().includes(q);
        const matchAuthor = book.authors.some((a) => a.toLowerCase().includes(q));
        if (!matchTitle && !matchSeries && !matchAuthor) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'price_low') {
        return a.currentPrice - b.currentPrice;
      }
      if (sortBy === 'price_high') {
        return b.currentPrice - a.currentPrice;
      }
      // 'latest' default: release date descending
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [initialBooks, formatFilter, pubFilter, wednesdayOnly, statusFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Hero Banner with Stats */}
      <div className="relative rounded-3xl bg-gradient-to-b from-surface-raised/80 to-surface/40 border border-border-subtle p-6 sm:p-8 overflow-hidden shadow-xs">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Katalog Resmi Manga & Light Novel Indonesia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title tracking-tight">
            Edisi Bersih &amp; Terfokus Pelacak Rilis
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted leading-relaxed">
            Menampilkan {stats.totalBooks.toLocaleString('id-ID')} judul komik ({stats.mangaCount}) dan light novel ({stats.lnCount}) berlisensi resmi dari Elex Media Komputindo, m&amp;c!, dan Phoenix Gramedia Indonesia.
          </p>
        </div>

        {/* Quick stat counters */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-6 border-t border-border-subtle max-w-lg">
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono text-editorial-title">{stats.mangaCount}</div>
            <div className="text-[11px] text-editorial-muted">Komik / Manga</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono text-editorial-title">{stats.lnCount}</div>
            <div className="text-[11px] text-editorial-muted">Light Novel</div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold font-mono text-editorial-title">{stats.totalSeries}</div>
            <div className="text-[11px] text-editorial-muted">Total Seri</div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="space-y-3 bg-surface p-4 rounded-2xl border border-border-subtle shadow-xs">
        {/* Row 1: Format & Rabu Rilis Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Format Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-surface-raised border border-border-subtle text-xs">
            {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  formatFilter === fmt
                    ? 'bg-surface text-editorial-title shadow-xs font-semibold'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {fmt === 'ALL' ? 'Semua Format' : fmt}
              </button>
            ))}
          </div>

          {/* Wednesday Drop Quick Toggle */}
          <button
            type="button"
            onClick={() => setWednesdayOnly(!wednesdayOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              wednesdayOnly
                ? 'bg-gold/15 text-gold border-gold/40 font-semibold shadow-xs'
                : 'bg-surface-raised border-border-subtle text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>⭐ Hanya Jadwal Rabu Rilis</span>
          </button>
        </div>

        {/* Row 2: Publisher Pills & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle text-xs">
          {/* Publishers */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-editorial-faint text-[11px] font-mono mr-1">Penerbit:</span>
            <button
              type="button"
              onClick={() => setPubFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                pubFilter === 'ALL'
                  ? 'bg-surface-raised border border-border-medium text-editorial-title font-semibold'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              Semua
            </button>
            {publishers.map((pub) => (
              <button
                key={pub.id}
                type="button"
                onClick={() => setPubFilter(pub.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  pubFilter === pub.id
                    ? 'bg-gold/15 border-gold/40 text-gold font-semibold'
                    : 'bg-surface-raised/40 border-border-subtle text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {pub.shortName}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-editorial-faint text-[11px]">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-raised border border-border-subtle text-editorial-body text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-border-medium"
            >
              <option value="latest">Rilis Terbaru</option>
              <option value="title">Judul (A-Z)</option>
              <option value="price_low">Harga Terendah</option>
              <option value="price_high">Harga Tertinggi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Results Summary */}
      <div className="flex items-center justify-between text-xs text-editorial-faint font-mono px-1">
        <span>Menampilkan {filteredBooks.length} buku terkurasi</span>
        {wednesdayOnly && <span className="text-gold font-medium">Filter Aktif: Jadwal Rabu Rilis</span>}
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="py-16 text-center bg-surface/50 border border-border-subtle rounded-3xl space-y-2">
          <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada rilisan yang sesuai filter</h3>
          <p className="text-xs text-editorial-muted">Coba reset filter format atau penerbit untuk melihat katalog lainnya.</p>
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
