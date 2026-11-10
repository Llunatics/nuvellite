'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect, useDeferredValue } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  ArrowRight,
  FilterX,
} from 'lucide-react';
import { Book, Publisher } from '@/lib/types';
import { loadPersistedViewState, savePersistedViewState, syncUrlQuery } from '@/lib/filter-persistence';
import { ReleaseCard } from '@/components/books/release-card';
import { FeaturedReleaseCard } from '@/components/books/card-variants';
import { useCollection } from '@/hooks/use-collection';

const PAGE_SIZE = 36;

interface ReleaseFeedProps {
  initialBooks: Book[];
  publishers: Publisher[];
  radarShelf?: React.ReactNode;
}

export const ReleaseFeed = React.memo(function ReleaseFeed({ initialBooks, publishers, radarShelf }: ReleaseFeedProps) {
  // Curated spotlight items: the 5 newest releases with a cover and price.
  // NOTE: do NOT require `synopsis` here. The homepage feed uses the
  // lightweight listing data, which strips synopsis (see split-catalog.py),
  // so a synopsis filter matched nothing and the spotlight silently fell
  // back to initialBooks[0] on every visit — Re-Living Vol. 1, forever.
  // FeaturedReleaseCard already renders its synopsis paragraph only when
  // one is present, so synopsis must stay optional.
  const spotlightBooks = useMemo(() => {
    return [...initialBooks]
      .filter((b) => b.coverImage && b.currentPrice > 0 && !b.isSetVariant)
      .sort((a, b) => {
        const byDate = (b.releaseDate || '').localeCompare(a.releaseDate || '');
        if (byDate !== 0) return byDate;
        return (b.volume ?? 0) - (a.volume ?? 0);
      })
      .slice(0, 5);
  }, [initialBooks]);

  const [activeSpotlightIdx, setActiveSpotlightIdx] = useState(0);
  const activeSpotlight = spotlightBooks[activeSpotlightIdx] || initialBooks[0];

  // Archive stats for the editorial hero strip (computed from props, no data-file read)
  const archiveStats = useMemo(() => {
    const seriesIds = new Set<string>();
    for (const b of initialBooks) {
      if (b.seriesId) seriesIds.add(b.seriesId);
    }
    return {
      titles: initialBooks.length,
      series: seriesIds.size,
      publishers: publishers.length,
    };
  }, [initialBooks, publishers]);

  // Dedicated Highlight Rails - Newest to oldest
  const mangaHighlights = useMemo(() => {
    return [...initialBooks]
      .filter((b) => b.category === 'Manga' && b.coverImage && !b.isSetVariant)
      .sort((a, b) => {
        const byDate = (b.releaseDate || '').localeCompare(a.releaseDate || '');
        if (byDate !== 0) return byDate;
        return (b.volume ?? 0) - (a.volume ?? 0);
      })
      .slice(0, 18);
  }, [initialBooks]);

  const lnHighlights = useMemo(() => {
    return [...initialBooks]
      .filter((b) => b.category === 'Light Novel' && b.coverImage && !b.isSetVariant)
      .sort((a, b) => {
        const byDate = (b.releaseDate || '').localeCompare(a.releaseDate || '');
        if (byDate !== 0) return byDate;
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

  const featuredSectionRef = useRef<HTMLElement>(null);
  const featuredInnerRef = useRef<HTMLDivElement>(null);
  const cardHeightRef = useRef<number>(480);

  const [dismissState, setDismissState] = useState<{
    opacity: number;
    transform: string;
    marginBottom: string;
    pointerEvents: 'auto' | 'none';
  }>({
    opacity: 1,
    transform: 'translate3d(0, 0px, 0) scale(1)',
    marginBottom: '0px',
    pointerEvents: 'auto',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const innerEl = featuredInnerRef.current;
    if (!innerEl) return;

    const measure = () => {
      const h = innerEl.offsetHeight;
      if (h > 0) cardHeightRef.current = h;
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(innerEl);
    return () => ro.disconnect();
  }, [activeSpotlightIdx]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setDismissState({
        opacity: 1,
        transform: 'translate3d(0, 0px, 0) scale(1)',
        marginBottom: '0px',
        pointerEvents: 'auto',
      });
      return;
    }

    let rafId = 0;
    const updateCardDismissal = () => {
      const sectionEl = featuredSectionRef.current;
      if (!sectionEl) return;

      const scrollY = window.scrollY || window.pageYOffset || 0;
      if (scrollY <= 4) {
        setDismissState({
          opacity: 1,
          transform: 'translate3d(0, 0px, 0) scale(1)',
          marginBottom: '0px',
          pointerEvents: 'auto',
        });
        return;
      }

      const viewportH = window.innerHeight || 844;
      const isDesktop = window.innerWidth >= 768;
      const cardH = cardHeightRef.current || (isDesktop ? 400 : 540);
      const sectionTop = sectionEl.offsetTop || (isDesktop ? 300 : 320);

      // Ensure the user can see the entire card before dismissal begins:
      // On mobile (where sectionTop + cardH > viewportH), start dismissing only after
      // the bottom of the card has entered comfortable viewing range.
      const overflowBelowFold = Math.max(0, sectionTop + cardH - viewportH + 48);
      const startScroll = isDesktop
        ? Math.max(40, sectionTop - 140)
        : Math.max(140, overflowBelowFold + 60);

      const travelRange = Math.max(260, Math.round(cardH * 0.65));
      const rawProgress = (scrollY - startScroll) / travelRange;
      const progress = Math.min(1, Math.max(0, rawProgress));

      // Smoothstep easing: C1 continuous at 0 and 1
      const eased = progress * progress * (3 - 2 * progress);

      const opacity = Math.max(0, Number((1 - eased).toFixed(3)));
      const translateY = Number((-eased * 40).toFixed(1));
      const scale = Number((1 - eased * 0.055).toFixed(4));

      // Collapse the card's occupied layout space in lockstep with its fade
      // so the section below ("Rilisan Manga Terbaru") rises smoothly to close the gap.
      // Cap collapse at cardH * 0.72 so document scrollHeight always stays comfortably
      // taller than scrollY and never triggers bottom-of-page scroll clamping.
      const maxCollapse = Math.round(cardH * 0.72);
      const collapsePx = Math.round(eased * maxCollapse);

      setDismissState({
        opacity,
        transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
        marginBottom: `${-collapsePx}px`,
        pointerEvents: opacity < 0.15 ? 'none' : 'auto',
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateCardDismissal);
    };

    updateCardDismissal();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Filter States
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RELEASED' | 'PREORDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'price_low' | 'price_high'>('latest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [spotlightPaused, setSpotlightPaused] = useState(false);
  const hydratedRef = useRef(false);
  const suppressFilterResetRef = useRef(false);
  const pendingScrollRef = useRef<number | null>(null);
  const spotlightResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pubParam = params.get('publisher');
    if (pubParam && publishers.some((p) => p.id === pubParam)) {
      setPubFilter(pubParam);
    } else if (pubParam === 'all') {
      setPubFilter('ALL');
    }
  }, [publishers]);

  // Hydrate filters from the URL and restore pagination + scroll position
  // saved before navigating away (Block 6). Runs once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const format = params.get('format');
    if (format === 'Manga' || format === 'Light Novel') setFormatFilter(format);
    const status = params.get('status');
    if (status === 'RELEASED' || status === 'PREORDER') setStatusFilter(status);
    const sort = params.get('sort');
    if (sort === 'latest' || sort === 'title' || sort === 'price_low' || sort === 'price_high') {
      setSortBy(sort);
    }
    const q = params.get('q');
    if (q) setSearchQuery(q);

    const persisted = loadPersistedViewState(window.location.pathname);
    if (persisted?.visibleCount && persisted.visibleCount > PAGE_SIZE) {
      suppressFilterResetRef.current = true;
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
      if (formatFilter !== 'ALL') params.set('format', formatFilter);
      if (pubFilter !== 'ALL') params.set('publisher', pubFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (sortBy !== 'latest') params.set('sort', sortBy);
      const q = searchQuery.trim();
      if (q) params.set('q', q);
      syncUrlQuery(params);
    }, 200);
    return () => clearTimeout(timer);
  }, [formatFilter, pubFilter, statusFilter, sortBy, searchQuery]);

  // Auto-advance the spotlight showcase; pauses while the user hovers it.
  useEffect(() => {
    if (spotlightBooks.length <= 1 || spotlightPaused) return;
    const timer = setInterval(() => {
      setActiveSpotlightIdx((idx) => (idx + 1) % spotlightBooks.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [spotlightBooks.length, spotlightPaused]);

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
        if (statusFilter === 'RELEASED' && !(book.status === 'RELEASED' || book.status === 'PUBLISHED')) return false;
        if (statusFilter === 'PREORDER' && !(book.status === 'PREORDER' || book.status === 'ANNOUNCED')) return false;
        if (deferredSearchQuery.trim()) {
          const q = deferredSearchQuery.toLowerCase().trim();
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
        return (b.releaseDate || '').localeCompare(a.releaseDate || '');
      });
  }, [initialBooks, formatFilter, pubFilter, statusFilter, deferredSearchQuery, sortBy]);

  // Reset visible count when filters change (in an effect, not during render)
  const prevFilterKey = useRef('');
  const filterKey = `${formatFilter}-${pubFilter}-${statusFilter}-${deferredSearchQuery}-${sortBy}`;
  useEffect(() => {
    if (filterKey !== prevFilterKey.current) {
      prevFilterKey.current = filterKey;
      if (suppressFilterResetRef.current) {
        suppressFilterResetRef.current = false;
        return;
      }
      setVisibleCount(PAGE_SIZE);
    }
  }, [filterKey]);

  const visibleBooks = useMemo(() => filteredBooks.slice(0, visibleCount), [filteredBooks, visibleCount]);

  useEffect(() => {
    if (pendingScrollRef.current != null && visibleBooks.length > 0) {
      const y = pendingScrollRef.current;
      pendingScrollRef.current = null;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [visibleBooks]);
  const hasMore = visibleCount < filteredBooks.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredBooks.length));
  }, [filteredBooks.length]);

  const persistViewState = () => {
    savePersistedViewState(window.location.pathname, {
      visibleCount,
      scrollY: window.scrollY,
    });
  };

  return (
    <div className="space-y-14 sm:space-y-20" onClickCapture={persistViewState}>
      {/* 1. HERO EDITORIAL INTRODUCTION */}
      <section className="space-y-4 pt-1 lg:pt-2">
        <div className="max-w-3xl lg:max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-xs shrink-0" />
            <span>Katalog Indonesia</span>
          </div>

          <h1 className="mt-4 font-editorial text-3xl sm:text-5xl lg:text-6xl font-normal text-editorial-title tracking-tight leading-[1.12]">
            Pelacak Manga &amp; Light Novel.
          </h1>

          <p className="mt-4 sm:mt-5 text-sm sm:text-base text-editorial-body leading-[1.7] max-w-2xl font-sans">
            Katalog manga &amp; light novel terbitan resmi Elex Media, m&amp;c!, dan Phoenix Gramedia Indonesia.
            Cek jadwal terbit mingguan, edisi bind-up, dan koleksi bukumu.
          </p>

          {/* Archive Stats Strip */}
          <dl className="mt-6 sm:mt-7 flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-2.5 text-xs font-mono text-editorial-muted">
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Judul terarsip</dt>
              <dd className="font-semibold text-editorial-title">
                {archiveStats.titles.toLocaleString('id-ID')}
              </dd>
              <dd>judul terarsip</dd>
            </div>
            <span aria-hidden="true" className="text-editorial-faint/50">/</span>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Seri</dt>
              <dd className="font-semibold text-editorial-title">
                {archiveStats.series.toLocaleString('id-ID')}
              </dd>
              <dd>seri</dd>
            </div>
            <span aria-hidden="true" className="text-editorial-faint/50">/</span>
            <div className="flex items-baseline gap-1.5">
              <dt className="sr-only">Penerbit</dt>
              <dd className="font-semibold text-editorial-title">
                {archiveStats.publishers.toLocaleString('id-ID')}
              </dd>
              <dd>penerbit</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 2. CURATED SPOTLIGHT SHOWCASE */}
      {activeSpotlight && (
        <section
          ref={featuredSectionRef}
          data-testid="featured-showcase-card"
          style={dismissState}
          className="relative z-10 !mt-8 sm:!mt-10 will-change-[transform,opacity] origin-top"
          onMouseEnter={() => setSpotlightPaused(true)}
          onMouseLeave={() => setSpotlightPaused(false)}
        >
          <div ref={featuredInnerRef} className="space-y-3">
            <FeaturedReleaseCard key={activeSpotlight.id} book={activeSpotlight} />

            {/* Minimal Spotlight Pagination */}
            {spotlightBooks.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {spotlightBooks.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveSpotlightIdx(idx);
                      // Let the user linger on their pick before auto-advance resumes.
                      setSpotlightPaused(true);
                      if (spotlightResumeRef.current) clearTimeout(spotlightResumeRef.current);
                      spotlightResumeRef.current = setTimeout(() => setSpotlightPaused(false), 12000);
                    }}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      activeSpotlightIdx === idx ? 'w-6 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Pilih sorotan ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. MANGA HIGHLIGHT RAIL */}
      {mangaHighlights.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15]">
                Rilisan Manga Terbaru
              </h2>
              <p className="mt-1.5 text-xs font-mono text-editorial-muted">
                {mangaHighlights.length} rilisan terkini
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3 pl-2">
              <button
                type="button"
                onClick={() => handleViewAll('Manga')}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-medium text-editorial-body hover:text-accent transition-colors py-1"
              >
                <span>Semua Manga</span>
                <ArrowRight className="w-3.5 h-3.5 text-accent" />
              </button>

              {/* Desktop-only rail scroll arrows — hidden on mobile touch screens so heading & link never collide */}
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => scrollRail(mangaRailRef, 'left')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(mangaRailRef, 'right')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={mangaRailRef}
            className="flex items-stretch gap-5 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pt-1"
          >
            {mangaHighlights.map((book) => (
              <div key={book.id} className="w-40 sm:w-48 lg:w-52 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. LIGHT NOVEL HIGHLIGHT RAIL */}
      {lnHighlights.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15]">
                Rilisan Light Novel Terbaru
              </h2>
              <p className="mt-1.5 text-xs font-mono text-editorial-muted">
                {lnHighlights.length} rilisan terkini
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3 pl-2">
              <button
                type="button"
                onClick={() => handleViewAll('Light Novel')}
                className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-medium text-editorial-body hover:text-accent transition-colors py-1"
              >
                <span>Semua Light Novel</span>
                <ArrowRight className="w-3.5 h-3.5 text-accent" />
              </button>

              {/* Desktop-only rail scroll arrows — hidden on mobile touch screens so heading & link never collide */}
              <div className="hidden sm:flex items-center gap-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => scrollRail(lnRailRef, 'left')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  aria-label="Geser ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(lnRailRef, 'right')}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-editorial-muted hover:text-editorial-title bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  aria-label="Geser ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div
            ref={lnRailRef}
            className="flex items-stretch gap-5 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pt-1"
          >
            {lnHighlights.map((book) => (
              <div key={book.id} className="w-40 sm:w-48 lg:w-52 shrink-0 snap-start">
                <ReleaseCard book={book} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4b. RADAR SHELF (Round 3: below the rails, per the D.3 heading order —
          the catalog hero leads the page again, not the announcements) */}
      {radarShelf}

      {/* 5. MAIN CATALOG ARCHIVE & COHESIVE CONTROLS */}
      <section ref={catalogRef} className="space-y-8 pt-4 scroll-mt-28">
        {/* Section Heading & Result Counter */}
        <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15]">
              Seluruh Katalog
            </h2>
            <p className="mt-1.5 text-xs font-mono text-editorial-muted">
              {filteredBooks.length.toLocaleString('id-ID')} buku terdata
            </p>
          </div>

          {hasActiveFilters && (
            <div className="shrink-0 flex items-center gap-3 pl-2">
              <button
                type="button"
                onClick={resetFilters}
                className="shrink-0 whitespace-nowrap text-xs font-mono text-accent hover:underline flex items-center gap-1.5 py-1"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Bersihkan Filter</span>
              </button>
            </div>
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
              placeholder="Cari judul, seri, atau pengarang..."
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
            <div className="sm:col-span-5 grid grid-cols-3 p-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
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
            <div className="sm:col-span-7 grid grid-cols-3 gap-2">
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

              {/* Availability Dropdown */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
                >
                  <option value="ALL" className="bg-surface text-editorial-title">Semua Status</option>
                  <option value="RELEASED" className="bg-surface text-editorial-title">Sudah Rilis</option>
                  <option value="PREORDER" className="bg-surface text-editorial-title">Pre-order</option>
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
            <h3 className="text-sm font-medium text-editorial-title">Buku yang dicari belum ketemu</h3>
            <p className="text-xs text-editorial-muted max-w-sm mx-auto">
              Coba ganti kata kunci atau reset filter yang aktif.
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 sm:gap-x-6 gap-y-9 sm:gap-y-12">
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

    </div>
  );
});

export function ReleaseFeedSkeleton() {
  return (
    <div className="space-y-16 animate-pulse">
      {/* Hero Showcase Skeleton */}
      <div className="aspect-[21/9] min-h-[300px] w-full rounded-3xl bg-white/[0.03] border border-white/[0.05]" />

      {/* Rails Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-48 bg-white/[0.06] rounded" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[180px] shrink-0 aspect-[3/4.2] rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-36 bg-white/[0.06] rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4.2] rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  );
}
