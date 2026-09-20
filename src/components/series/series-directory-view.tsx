'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Series, Book } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { Layers, Search, BookOpen } from 'lucide-react';

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
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass shadow-xl border border-border-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-chip text-editorial-muted text-xs font-mono font-semibold tracking-wider">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>PELACAK SERI RESMI</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold font-editorial text-editorial-title tracking-tight">
              Direktori Seri Manga &amp; Light Novel
            </h1>
            <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
              Direktori seri resmi terbitan Elex Media, m&amp;c!, dan Phoenix Gramedia Indonesia. Track kelengkapan volume dan temukan judul yang belum Anda miliki.
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="pt-3 border-t border-border-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-editorial-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul seri, pengarang, penerbit..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-elevated/60 border border-border-subtle text-editorial-title placeholder:text-editorial-faint focus:outline-none focus:border-accent/40 text-xs transition-all"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Format Pills */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl liquid-glass border border-border-subtle">
              {(['ALL', 'MANGA', 'LIGHT_NOVEL'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                    formatFilter === fmt
                      ? 'bg-accent text-white font-semibold shadow-xs'
                      : 'text-editorial-muted hover:text-editorial-title'
                  }`}
                >
                  {fmt === 'ALL' ? 'Semua' : fmt === 'MANGA' ? 'Manga' : 'Light Novel'}
                </button>
              ))}
            </div>

            {/* Publisher Select */}
            <select
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              className="px-3 py-2 rounded-xl liquid-glass border border-border-subtle text-editorial-title focus:outline-none text-xs"
            >
              <option value="ALL">Semua Penerbit</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl liquid-glass border border-border-subtle text-editorial-title focus:outline-none text-xs"
            >
              <option value="name">Urutan: Judul (A-Z)</option>
              <option value="volumes_high">Volume: Terbanyak</option>
              <option value="volumes_low">Volume: Tersedikit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Series Grid */}
      {filteredSeries.length === 0 ? (
        <div className="py-20 text-center rounded-3xl liquid-glass border border-border-subtle space-y-3">
          <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada seri yang cocok</h3>
          <p className="text-xs text-editorial-muted">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSeries.map((series) => {
            const books = seriesBooksMap.get(series.id) || [];
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
                className="group flex flex-col liquid-glass-card rounded-2xl p-4 shadow-sm hover:shadow-xl border border-border-subtle transition-all duration-300"
              >
                <div className="flex gap-3.5 items-start">
                  {/* Series Cover Thumbnail with depth */}
                  <div className="relative aspect-[3/4] w-20 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-surface-sunken cover-depth">
                    {series.coverImage ? (
                      <img
                        src={series.coverImage}
                        alt={series.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
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
                        className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider liquid-chip ${
                          series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {series.type === 'LIGHT_NOVEL' ? 'LN' : 'Manga'}
                      </span>
                    </div>
                  </div>

                  {/* Series Identity */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-editorial-faint">
                      <span className="font-semibold text-editorial-muted truncate">{series.publisherName}</span>
                      <span>•</span>
                      <span className={series.status === 'COMPLETED' ? 'text-emerald-400 font-semibold' : 'text-accent'}>
                        {series.status === 'COMPLETED' ? 'Tamat' : 'Ongoing'}
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-semibold text-editorial-title group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                      {series.name}
                    </h3>

                    {series.author && (
                      <p className="text-[10px] text-editorial-muted truncate">
                        Oleh <span className="text-editorial-body">{series.author}</span>
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-editorial-muted">
                      <span>Total:</span>
                      <span className="font-bold text-editorial-title">{series.totalVolumes} volume</span>
                    </div>
                  </div>
                </div>

                {/* Visual Volume Progression Timeline */}
                {books.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border-subtle space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-mono text-editorial-faint">
                      <span>Linimasa Volume ({books.length} terbit):</span>
                      {ownedCount > 0 && (
                        <span className="text-accent font-bold">
                          {ownedCount}/{series.totalVolumes} ({percent}%)
                        </span>
                      )}
                    </div>

                    {/* Timeline Pills */}
                    <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                      {books.slice(0, 16).map((b) => {
                        const isOwned = ownedBookIds.has(b.id);
                        return (
                          <span
                            key={b.id}
                            className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-semibold transition-all ${
                              isOwned
                                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                : 'bg-surface-sunken text-editorial-faint border border-border-subtle'
                            }`}
                            title={`Volume ${b.volume ?? '?'}: ${isOwned ? 'Sudah Dimiliki' : 'Belum Dimiliki'}`}
                          >
                            {b.volume !== null && b.volume !== undefined ? b.volume : '•'}
                          </span>
                        );
                      })}
                      {books.length > 16 && (
                        <span className="px-1 text-[8.5px] font-mono text-editorial-faint self-center">
                          +{books.length - 16} lagi
                        </span>
                      )}
                    </div>

                    {/* Collection Completion Progress Bar */}
                    {ownedCount > 0 && (
                      <div className="w-full h-1 rounded-full bg-surface-sunken overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
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
