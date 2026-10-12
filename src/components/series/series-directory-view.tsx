'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { CoverImage } from '../books/cover-image';
import { Series, Book } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Layers, Search, BookOpen, X, ArrowRight, ChevronDown } from 'lucide-react';

const PAGE_SIZE = 60;

interface SeriesDirectoryViewProps {
  allSeries: Series[];
  allBooks: Book[];
}

export function SeriesDirectoryView({ allSeries, allBooks }: SeriesDirectoryViewProps) {
  const { ownedItems, isLoaded } = useCollection();

  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'MANGA' | 'LIGHT_NOVEL'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ONGOING'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'volumes_high' | 'volumes_low'>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Map seriesId -> Set of owned book IDs
  const ownedSeriesMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!isLoaded) return map;
    for (const item of ownedItems) {
      if (item.seriesId) {
        if (!map.has(item.seriesId)) {
          map.set(item.seriesId, new Set());
        }
        map.get(item.seriesId)!.add(item.bookId);
      }
    }
    return map;
  }, [ownedItems, isLoaded]);

  // Filtered & Sorted Series
  const filteredSeries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return allSeries
      .filter((s) => {
        // Format
        if (formatFilter !== 'ALL' && s.type !== formatFilter) return false;
        // Publisher
        if (pubFilter !== 'ALL' && s.publisherId !== pubFilter) return false;
        // Status
        if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
        // Search Query (name, author, publisher)
        if (q) {
          const matchName = s.name.toLowerCase().includes(q);
          const matchAuthor = s.author?.toLowerCase().includes(q);
          const matchPub = s.publisherName.toLowerCase().includes(q);
          if (!matchName && !matchAuthor && !matchPub) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'volumes_high') {
          return b.totalVolumes - a.totalVolumes;
        }
        if (sortBy === 'volumes_low') {
          return a.totalVolumes - b.totalVolumes;
        }
        return a.name.localeCompare(b.name);
      });
  }, [allSeries, formatFilter, pubFilter, statusFilter, searchQuery, sortBy]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [formatFilter, pubFilter, statusFilter, searchQuery, sortBy]);

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: '800px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const publishers = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSeries) {
      map.set(s.publisherId, s.publisherName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allSeries]);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Header Banner */}
      <section className="space-y-3 pt-2 sm:pt-4 border-b border-white/[0.04] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
          <Layers className="w-3 h-3 text-accent shrink-0" />
          <span>Direktori Seri</span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
          Direktori Seri Manga &amp; Light Novel.
        </h1>

        <p className="text-[13px] text-editorial-muted font-sans">
          {allSeries.length.toLocaleString('id-ID')} seri — termasuk arsip terbitan lama yang ditandai badge Arsip.
        </p>
      </section>

      {/* 2. Symmetrical Search & Filter Command Bar */}
      <div className="space-y-2.5">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul seri, pengarang, penerbit..."
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

        {/* Filter Controls: Symmetrical Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          {/* Format Segmented Tab */}
          <div className="sm:col-span-6 grid grid-cols-3 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {(['ALL', 'MANGA', 'LIGHT_NOVEL'] as const).map((fmt) => (
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
                {fmt === 'ALL' ? 'Semua' : fmt === 'MANGA' ? 'Manga' : 'Light Novel'}
              </button>
            ))}
          </div>

          {/* Symmetrical Dropdowns */}
          <div className="sm:col-span-6 grid grid-cols-3 gap-2">
            {/* Status Select */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
              >
                <option value="ALL" className="bg-surface text-editorial-title">Semua Status</option>
                <option value="COMPLETED" className="bg-surface text-editorial-title">Tamat</option>
                <option value="ONGOING" className="bg-surface text-editorial-title">Berjalan</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Publisher Select */}
            <div className="relative">
              <select
                value={pubFilter}
                onChange={(e) => setPubFilter(e.target.value)}
                className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
              >
                <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
                {publishers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
              >
                <option value="name" className="bg-surface text-editorial-title">Judul (A-Z)</option>
                <option value="volumes_high" className="bg-surface text-editorial-title">Vol. Terbanyak</option>
                <option value="volumes_low" className="bg-surface text-editorial-title">Vol. Sedikit</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Series Cards Grid */}
      {filteredSeries.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
          <BookOpen className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
          <h3 className="text-sm font-medium text-editorial-title">Tidak ada seri yang sesuai kriteria</h3>
          <p className="text-xs text-editorial-muted">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredSeries.slice(0, visibleCount).map((series) => {
            const ownedBookIds = ownedSeriesMap.get(series.id) || new Set();
            const ownedCount = ownedBookIds.size;
            const percent =
              series.totalVolumes > 0
                ? Math.min(100, Math.round((ownedCount / series.totalVolumes) * 100))
                : 0;

            return (
              <Link
                key={series.id}
                href={`/series/${series.slug}`}
                className="group flex flex-col p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 space-y-3"
              >
                <div className="flex gap-4 items-start">
                  {/* Series Cover */}
                  <div className="relative aspect-[3/4.2] w-20 sm:w-22 shrink-0 rounded-xl overflow-hidden bg-surface-sunken cover-depth">
                    {series.coverImage ? (
                      <CoverImage
                        src={series.coverImage}
                        alt={series.name}
                        width={88}
                        height={117}
                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                        fallbackIconClassName="w-6 h-6 text-editorial-faint"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                        <span className="font-editorial text-lg text-editorial-muted leading-none mb-1.5">
                          {series.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                        <span className="text-[9px] text-editorial-faint line-clamp-2 leading-tight px-1">
                          {series.name}
                        </span>
                        {series.isArchive && series.archiveEntry?.yearFirstVol && (
                          <span className="mt-1 text-[8px] font-mono text-editorial-faint">
                            {series.archiveEntry.yearFirstVol}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Format Badge */}
                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium uppercase bg-black/60 backdrop-blur-sm border border-white/10 ${
                          series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {series.type === 'LIGHT_NOVEL' ? 'LN' : 'Manga'}
                      </span>
                      {series.isArchive && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-medium uppercase bg-black/60 backdrop-blur-sm border border-amber-500/30 text-amber-300">
                          Arsip
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-editorial-faint">
                      <span className="font-semibold text-editorial-muted truncate">{series.publisherName}</span>
                      <span>•</span>
                      <span>{series.status === 'COMPLETED' ? 'Tamat' : 'Ongoing'}</span>
                    </div>

                    <h3 className="text-xs sm:text-[13px] font-medium text-editorial-title group-hover:text-accent transition-colors line-clamp-2 leading-snug tracking-tight">
                      {series.name}
                    </h3>

                    {series.author && (
                      <p className="text-[11px] text-editorial-faint truncate font-sans">
                        {series.author}
                      </p>
                    )}

                    <div className="pt-1 flex items-baseline justify-between text-[11px] font-mono text-editorial-muted">
                      <span>{series.totalVolumes} Volume</span>
                      {ownedCount > 0 && (
                        <span className="text-emerald-400 font-medium">
                          {ownedCount} Milik ({percent}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar if user owns items */}
                {ownedCount > 0 && (
                  <div className="w-full h-1 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Infinite scroll sentinel + counter */}
      {filteredSeries.length > 0 && (
        <div ref={sentinelRef} className="pt-4 text-center">
          <p className="text-[11px] font-mono text-editorial-faint">
            Menampilkan {Math.min(visibleCount, filteredSeries.length)} dari {filteredSeries.length.toLocaleString('id-ID')} seri
          </p>
        </div>
      )}
    </div>
  );
}
