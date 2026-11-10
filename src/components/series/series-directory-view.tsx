'use client';

import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { CoverImage } from '../books/cover-image';
import { Series } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { loadPersistedViewState, savePersistedViewState, syncUrlQuery } from '@/lib/filter-persistence';
import { Layers, Search, BookOpen, X, ArrowRight, ChevronDown, SlidersHorizontal, Check } from 'lucide-react';

const PAGE_SIZE = 60;

/**
 * Slim directory DTO: the page ships ~3,200 series to the client, so it
 * passes only the fields the directory renders/filters on. Archive series
 * in particular must not embed their full KKI entry (enrichment blobs
 * included) — only the first-volume year is displayed.
 */
export interface DirectorySeries {
  id: string;
  slug: string;
  name: string;
  publisherId: string;
  publisherName: string;
  author?: string;
  type: Series['type'];
  status: Series['status'];
  totalVolumes: number;
  coverImage?: string;
  isArchive?: boolean;
  archiveYearFirstVol?: number | string | null;
}

interface SeriesDirectoryViewProps {
  allSeries: DirectorySeries[];
  bindUpSeriesIds: string[];
}

export function SeriesDirectoryView({ allSeries, bindUpSeriesIds }: SeriesDirectoryViewProps) {
  const { ownedItems, isLoaded } = useCollection();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'MANGA' | 'LIGHT_NOVEL'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ONGOING' | 'ARCHIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'volumes_high' | 'volumes_low'>('name');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editionFilter, setEditionFilter] = useState<'ALL' | 'REGULAR' | 'BINDUP' | 'ONESHOT' | 'SHORT'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const suppressResetRef = useRef(false);
  const pendingScrollRef = useRef<number | null>(null);

  // Series IDs that have bind-up editions (computed server-side)
  const bindUpSeriesIdSet = useMemo(() => new Set(bindUpSeriesIds), [bindUpSeriesIds]);

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

  // Publisher groups: 3 main publishers + imprints as sub-options + "Lainnya" for the rest.
  // Maps each series publisherId to its canonical group.
  // (Defined before filteredSeries to avoid TDZ issues during SSR prerender.)
  const PUBLISHER_GROUPS = useMemo(() => [
    {
      id: 'grp_pgi',
      name: 'Phoenix Gramedia Indonesia',
      matchIds: ['pub_pgi', 'arc_phoenix'],
    },
    {
      id: 'grp_elex',
      name: 'Elex Media Komputindo',
      matchIds: ['pub_elex', 'arc_elex'],
      subs: [{ id: 'arc_level', name: 'Level' }],
    },
    {
      id: 'grp_mnc',
      name: 'm&c! Publishing',
      matchIds: ['pub_mnc', 'arc_m-c'],
      subs: [
        { id: 'arc_akasha', name: 'Akasha' },
        { id: 'arc_clover', name: 'Clover' },
      ],
    },
  ], []);

  const publishers = useMemo(() => {
    const seenIds = new Set<string>();
    for (const s of allSeries) seenIds.add(s.publisherId);
    // "Lainnya": any publisherId not covered by the groups above
    const groupedIds = new Set<string>();
    for (const g of PUBLISHER_GROUPS) {
      for (const id of g.matchIds) groupedIds.add(id);
      for (const sub of g.subs || []) groupedIds.add(sub.id);
    }
    const othersCount = Array.from(seenIds).filter((id) => !groupedIds.has(id)).length;
    return { groups: PUBLISHER_GROUPS, othersCount };
  }, [allSeries, PUBLISHER_GROUPS]);

  const getPublisherLabel = (filterVal: string): string => {
    if (filterVal === 'ALL') return 'Semua Penerbit';
    if (filterVal === 'OTHERS') return 'Penerbit Lainnya';
    for (const g of PUBLISHER_GROUPS) {
      if (filterVal === g.id) return g.name;
      for (const sub of g.subs || []) {
        if (filterVal === sub.id) return `${g.name.split(' ')[0]} (${sub.name})`;
      }
    }
    return filterVal;
  };

  // Resolve which publisherIds a filter value matches
  const resolvePubFilter = (filterVal: string): Set<string> | null => {
    if (filterVal === 'ALL') return null;
    if (filterVal === 'OTHERS') {
      const groupedIds = new Set<string>();
      for (const g of PUBLISHER_GROUPS) {
        for (const id of g.matchIds) groupedIds.add(id);
        for (const sub of g.subs || []) groupedIds.add(sub.id);
      }
      const seenIds = new Set<string>();
      for (const s of allSeries) seenIds.add(s.publisherId);
      return new Set(Array.from(seenIds).filter((id) => !groupedIds.has(id)));
    }
    for (const g of PUBLISHER_GROUPS) {
      if (filterVal === g.id) {
        const ids = new Set(g.matchIds);
        for (const sub of g.subs || []) ids.add(sub.id);
        return ids;
      }
      for (const sub of g.subs || []) {
        if (filterVal === sub.id) return new Set([sub.id]);
      }
    }
    return new Set([filterVal]);
  };

  // Filtered & Sorted Series
  const filteredSeries = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    const pubIds = resolvePubFilter(pubFilter);

    return allSeries
      .filter((s) => {
        // Format
        if (formatFilter !== 'ALL' && s.type !== formatFilter) return false;
        // Publisher (group-aware)
        if (pubIds && !pubIds.has(s.publisherId)) return false;
        // Status
        if (statusFilter === 'COMPLETED' && s.status !== 'COMPLETED') return false;
        if (statusFilter === 'ONGOING' && (s.status !== 'ONGOING' || s.isArchive)) return false;
        if (statusFilter === 'ARCHIVE' && !s.isArchive) return false;
        // Edition: regular / bind-up / oneshot (1 vol) / short series (2-4 vol)
        if (editionFilter === 'BINDUP' && !bindUpSeriesIdSet.has(s.id)) return false;
        if (editionFilter === 'REGULAR' && bindUpSeriesIdSet.has(s.id)) return false;
        if (editionFilter === 'ONESHOT' && s.totalVolumes !== 1) return false;
        if (editionFilter === 'SHORT' && (s.totalVolumes < 2 || s.totalVolumes > 4)) return false;
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
  }, [allSeries, formatFilter, pubFilter, statusFilter, deferredSearchQuery, sortBy, editionFilter, bindUpSeriesIdSet]);

  const activeFilterCount =
    (formatFilter !== 'ALL' ? 1 : 0) +
    (editionFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (pubFilter !== 'ALL' ? 1 : 0) +
    (sortBy !== 'name' ? 1 : 0);

  const resetFilters = () => {
    setFormatFilter('ALL');
    setEditionFilter('ALL');
    setStatusFilter('ALL');
    setPubFilter('ALL');
    setSortBy('name');
  };

  // Close filter sheet on Escape key
  useEffect(() => {
    if (!isFilterOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFilterOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFilterOpen]);

  // Hydrate filters from the URL and restore pagination + scroll position
  // saved before navigating away (Block 6). Runs once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const format = params.get('type') || params.get('format');
    if (format) {
      const upper = format.toUpperCase();
      if (upper === 'MANGA' || upper === 'LIGHT_NOVEL') setFormatFilter(upper as any);
    }
    const publisher = params.get('publisher');
    if (publisher) setPubFilter(publisher);
    const status = params.get('status');
    if (status) {
      const upper = status.toUpperCase();
      if (upper === 'COMPLETED' || upper === 'ONGOING' || upper === 'ARCHIVE') setStatusFilter(upper as any);
    }
    const edition = params.get('edition');
    if (edition) {
      const upper = edition.toUpperCase();
      if (upper === 'BINDUP' || upper === 'REGULAR' || upper === 'ONESHOT' || upper === 'SHORT') setEditionFilter(upper as any);
    }
    const sort = params.get('sort');
    if (sort === 'name' || sort === 'volumes_high' || sort === 'volumes_low') setSortBy(sort);
    const q = params.get('q');
    if (q) setSearchQuery(q);

    const persisted = loadPersistedViewState(window.location.pathname);
    if (persisted?.visibleCount && persisted.visibleCount > PAGE_SIZE) {
      suppressResetRef.current = true;
      setVisibleCount(persisted.visibleCount);
    }
    if (persisted?.scrollY) pendingScrollRef.current = persisted.scrollY;
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters back into the URL (debounced 200ms, replaceState only)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (formatFilter !== 'ALL') {
        params.set('type', formatFilter.toLowerCase());
        params.set('format', formatFilter);
      }
      if (pubFilter !== 'ALL') params.set('publisher', pubFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (editionFilter !== 'ALL') params.set('edition', editionFilter);
      if (sortBy !== 'name') params.set('sort', sortBy);
      const q = searchQuery.trim();
      if (q) params.set('q', q);
      syncUrlQuery(params);
    }, 200);
    return () => clearTimeout(timer);
  }, [formatFilter, pubFilter, statusFilter, editionFilter, sortBy, searchQuery]);

  // Reset pagination when filters change (skipped once after hydration restore)
  useEffect(() => {
    if (suppressResetRef.current) {
      suppressResetRef.current = false;
      return;
    }
    setVisibleCount(PAGE_SIZE);
  }, [formatFilter, pubFilter, statusFilter, searchQuery, sortBy, editionFilter]);

  // Scroll restore once the restored entries have rendered
  useEffect(() => {
    if (pendingScrollRef.current != null && visibleCount > PAGE_SIZE) {
      const y = pendingScrollRef.current;
      pendingScrollRef.current = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [visibleCount]);

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

  const persistViewState = () => {
    savePersistedViewState(window.location.pathname, {
      visibleCount,
      scrollY: window.scrollY,
    });
  };

  return (
    <div className="space-y-8 pb-16" onClickCapture={persistViewState}>
      {/* 1. Header Banner */}
      <section className="space-y-3 pt-2 sm:pt-4">
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

        <div>
          <Link
            href="/bind-up"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] px-4 py-2 text-xs font-medium text-editorial-body hover:text-editorial-title transition-colors"
          >
            <span>Direktori Edisi Bind-Up &amp; Omnibus</span>
            <span aria-hidden="true" className="text-accent">→</span>
          </Link>
        </div>
      </section>

      {/* 2. Unified Search & Filter Command Bar */}
      <div className="mt-5 sm:mt-6 space-y-3">
        <div className="flex items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul seri, pengarang, penerbit..."
              className="w-full h-11 pl-10 pr-9 rounded-full bg-surface/80 border border-white/[0.07] text-editorial-title placeholder:text-editorial-muted focus:border-accent/50 focus:outline-none transition-all text-sm"
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

          {/* Single Filter Button */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            aria-expanded={isFilterOpen}
            data-testid="series-filter-trigger"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface/80 hover:bg-surface-raised border border-white/[0.07] px-4 text-sm font-medium text-editorial-title transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-semibold text-zinc-950">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Filter Chips (Conditional) */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
            {formatFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-editorial-title text-xs">
                <span>Format: {formatFilter === 'MANGA' ? 'Manga' : 'Light Novel'}</span>
                <button
                  type="button"
                  onClick={() => setFormatFilter('ALL')}
                  aria-label="Hapus filter format"
                  className="text-editorial-muted hover:text-editorial-title ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {editionFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-editorial-title text-xs">
                <span>
                  Edisi:{' '}
                  {editionFilter === 'BINDUP'
                    ? 'Bind-Up & Omnibus'
                    : editionFilter === 'REGULAR'
                    ? 'Edisi Reguler'
                    : editionFilter === 'ONESHOT'
                    ? 'Oneshot (1 vol)'
                    : 'Seri Pendek (2–4 vol)'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditionFilter('ALL')}
                  aria-label="Hapus filter edisi"
                  className="text-editorial-muted hover:text-editorial-title ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-editorial-title text-xs">
                <span>
                  Status:{' '}
                  {statusFilter === 'COMPLETED'
                    ? 'Tamat'
                    : statusFilter === 'ONGOING'
                    ? 'Berlangsung'
                    : 'Arsip Lama'}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  aria-label="Hapus filter status"
                  className="text-editorial-muted hover:text-editorial-title ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {pubFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-editorial-title text-xs">
                <span>Penerbit: {getPublisherLabel(pubFilter)}</span>
                <button
                  type="button"
                  onClick={() => setPubFilter('ALL')}
                  aria-label="Hapus filter penerbit"
                  className="text-editorial-muted hover:text-editorial-title ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sortBy !== 'name' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] px-3 py-1 text-editorial-title text-xs">
                <span>
                  Urutan: {sortBy === 'volumes_high' ? 'Volume Terbanyak' : 'Volume Sedikit'}
                </span>
                <button
                  type="button"
                  onClick={() => setSortBy('name')}
                  aria-label="Hapus filter urutan"
                  className="text-editorial-muted hover:text-editorial-title ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-editorial-muted hover:text-accent underline underline-offset-4 ml-1 transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 3. Liquid-Glass Filter Sheet / Modal */}
      {isFilterOpen && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter Direktori Seri"
            className="w-full sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/[0.08] bg-surface/95 backdrop-blur-2xl p-6 shadow-2xl flex flex-col gap-5 text-xs text-editorial-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                <h2 className="font-editorial text-lg font-medium text-editorial-title">
                  Filter Direktori Seri
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                aria-label="Tutup filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Format */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted font-semibold block">
                Format
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'Semua' },
                  { id: 'MANGA', label: 'Manga' },
                  { id: 'LIGHT_NOVEL', label: 'Light Novel' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormatFilter(opt.id as any)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                      formatFilter === opt.id
                        ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Jenis Edisi */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted font-semibold block">
                Jenis Edisi
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'Semua Edisi' },
                  { id: 'REGULAR', label: 'Edisi Reguler' },
                  { id: 'BINDUP', label: 'Bind-Up & Omnibus' },
                  { id: 'ONESHOT', label: 'Oneshot (1 vol)' },
                  { id: 'SHORT', label: 'Seri Pendek (2–4 vol)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEditionFilter(opt.id as any)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                      editionFilter === opt.id
                        ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Status Seri */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted font-semibold block">
                Status Seri
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'ONGOING', label: 'Berlangsung' },
                  { id: 'COMPLETED', label: 'Tamat' },
                  { id: 'ARCHIVE', label: 'Arsip Lama' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStatusFilter(opt.id as any)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                      statusFilter === opt.id
                        ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Penerbit */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted font-semibold block">
                Penerbit
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPubFilter('ALL')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    pubFilter === 'ALL'
                      ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                      : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                  }`}
                >
                  Semua Penerbit
                </button>
                {publishers.groups.map((g) => (
                  <React.Fragment key={g.id}>
                    <button
                      type="button"
                      onClick={() => setPubFilter(g.id)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        pubFilter === g.id
                          ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                          : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                      }`}
                    >
                      {g.name}
                    </button>
                    {g.subs?.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setPubFilter(sub.id)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          pubFilter === sub.id
                            ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                            : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                        }`}
                      >
                        {g.name.split(' ')[0]} ({sub.name})
                      </button>
                    ))}
                  </React.Fragment>
                ))}
                {publishers.othersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPubFilter('OTHERS')}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      pubFilter === 'OTHERS'
                        ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                    }`}
                  >
                    Lainnya ({publishers.othersCount} penerbit)
                  </button>
                )}
              </div>
            </div>

            {/* 5. Urutkan Berdasarkan */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted font-semibold block">
                Urutkan Berdasarkan
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'name', label: 'Judul (A–Z)' },
                  { id: 'volumes_high', label: 'Volume Terbanyak' },
                  { id: 'volumes_low', label: 'Volume Sedikit' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id as any)}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                      sortBy === opt.id
                        ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                        : 'bg-white/[0.05] hover:bg-white/[0.09] text-editorial-body hover:text-editorial-title border border-white/[0.07]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-full text-xs font-medium text-editorial-muted hover:text-editorial-title bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded-full bg-accent text-zinc-950 font-semibold px-6 py-2.5 text-xs transition-colors hover:brightness-110 active:scale-95 shadow-md"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 4. Series Cards Grid */}
      {filteredSeries.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
          <BookOpen className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
          <h3 className="text-sm font-medium text-editorial-title">Seri yang dicari belum ketemu</h3>
          <p className="text-xs text-editorial-muted">Coba ganti kata kunci atau reset filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
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
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-elevated/80 border border-white/[0.06] rounded-xl select-none">
                        <span className="font-editorial text-lg text-editorial-title leading-none mb-1">
                          {series.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                        <span className="text-[9px] text-editorial-muted line-clamp-2 leading-tight px-0.5">
                          {series.name}
                        </span>
                      </div>
                    )}

                    {/* Compact top format pill (at most one compact badge) */}
                    <div className="absolute top-1.5 left-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-mono font-medium uppercase backdrop-blur-md bg-black/65 border border-white/15 ${
                          series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {series.type === 'LIGHT_NOVEL' ? 'LN' : 'Manga'}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-editorial-faint">
                      <span className="font-semibold text-editorial-muted truncate max-w-[120px]">{series.publisherName}</span>
                      <span>•</span>
                      <span>{series.status === 'COMPLETED' ? 'Tamat' : 'Berjalan'}</span>
                      {series.isArchive && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400">Arsip</span>
                        </>
                      )}
                      {bindUpSeriesIdSet.has(series.id) && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Bind-Up</span>
                        </>
                      )}
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
                      className="h-full bg-accent transition-all duration-300 rounded-full"
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
