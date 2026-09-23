'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Series, Book } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Layers, Search, BookOpen, X, ArrowRight } from 'lucide-react';

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

  // Map seriesId -> List of published books sorted by volume
  const seriesBooksMap = useMemo(() => {
    const map = new Map<string, Book[]>();
    for (const b of allBooks) {
      if (b.seriesId) {
        if (!map.has(b.seriesId)) {
          map.set(b.seriesId, []);
        }
        map.get(b.seriesId)!.push(b);
      }
    }
    for (const books of map.values()) {
      books.sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0));
    }
    return map;
  }, [allBooks]);

  // Filtered and Sorted Series
  const filteredSeries = useMemo(() => {
    return allSeries
      .filter((s) => {
        if (formatFilter !== 'ALL' && s.type !== formatFilter) return false;
        if (pubFilter !== 'ALL' && s.publisherId !== pubFilter) return false;
        if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = s.name.toLowerCase().includes(q);
          const matchOrig = s.originalTitle?.toLowerCase().includes(q);
          const matchAuthor = s.author?.toLowerCase().includes(q);
          const matchPub = s.publisherName.toLowerCase().includes(q);
          if (!matchName && !matchOrig && !matchAuthor && !matchPub) return false;
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
          <Layers className="w-3.5 h-3.5 text-accent" />
          <span>Direktori Seri Resmi</span>
          <span className="text-white/20">•</span>
          <span>{allSeries.length.toLocaleString('id-ID')} Seri Terdaftar</span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
          Direktori Seri Manga &amp; Light Novel.
        </h1>

        <p className="text-sm text-editorial-body leading-relaxed max-w-2xl font-sans">
          Arsip kanonikal seri terbitan Elex Media, m&amp;c!, dan Phoenix Gramedia Indonesia.
          Lacak kelengkapan volume, temukan nomor yang terlewat, dan monitor status rilis resmi.
        </p>
      </section>

      {/* 2. Cohesive Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul seri, pengarang, penerbit..."
            className="w-full pl-9 pr-8 py-2 rounded-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.06] border border-white/[0.06] focus:border-white/[0.15] text-editorial-title placeholder:text-editorial-faint focus:outline-none transition-all text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-editorial-faint hover:text-editorial-title p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Format Pills */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {(['ALL', 'MANGA', 'LIGHT_NOVEL'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`px-3 py-1 rounded-full font-medium transition-all text-xs ${
                  formatFilter === fmt
                    ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {fmt === 'ALL' ? 'Semua' : fmt === 'MANGA' ? 'Manga' : 'Light Novel'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer"
          >
            <option value="ALL" className="bg-surface text-editorial-title">Semua Status</option>
            <option value="COMPLETED" className="bg-surface text-editorial-title">Tamat</option>
            <option value="ONGOING" className="bg-surface text-editorial-title">Berjalan</option>
          </select>

          {/* Publisher Select */}
          <select
            value={pubFilter}
            onChange={(e) => setPubFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer"
          >
            <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                {p.name}
              </option>
            ))}
          </select>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer"
          >
            <option value="name" className="bg-surface text-editorial-title">Judul (A-Z)</option>
            <option value="volumes_high" className="bg-surface text-editorial-title">Volume Terbanyak</option>
            <option value="volumes_low" className="bg-surface text-editorial-title">Volume Tersedikit</option>
          </select>
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
          {filteredSeries.map((series) => {
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
                      <img
                        src={series.coverImage}
                        alt={series.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-elevated/40">
                        <BookOpen className="w-6 h-6 text-editorial-faint mb-1" />
                        <span className="text-[9px] text-editorial-muted line-clamp-2">{series.name}</span>
                      </div>
                    )}

                    {/* Format Badge */}
                    <div className="absolute top-1.5 left-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-medium uppercase bg-black/60 backdrop-blur-sm border border-white/10 ${
                          series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {series.type === 'LIGHT_NOVEL' ? 'LN' : 'Manga'}
                      </span>
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
    </div>
  );
}
