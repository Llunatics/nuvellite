'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, X, BookOpen, ArrowLeft } from 'lucide-react';
import { Book, Series } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';

const PAGE_SIZE = 36;

interface SearchResultsViewProps {
  allBooks: Book[];
  popularTags: string[];
}

export function SearchResultsView({ allBooks, popularTags }: SearchResultsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialFormat = (searchParams.get('format') as any) || 'ALL';
  const initialPublisher = searchParams.get('publisher') || 'ALL';
  const initialSort = (searchParams.get('sortBy') as any) || 'latest';

  const [inputVal, setInputVal] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>(initialFormat);
  const [pubFilter, setPubFilter] = useState<string>(initialPublisher);
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'price_low' | 'price_high'>(initialSort);

  // Sync when URL query changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setInputVal(q);
    setActiveQuery(q);
    if (searchParams.get('format')) {
      setFormatFilter(searchParams.get('format') as any);
    }
    if (searchParams.get('publisher')) {
      setPubFilter(searchParams.get('publisher') as string);
    }
    if (searchParams.get('sortBy')) {
      setSortBy(searchParams.get('sortBy') as any);
    }
  }, [searchParams]);

  const updateUrlParams = (q: string, fmt: string, pub: string, srt: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (fmt !== 'ALL') params.set('format', fmt);
    if (pub !== 'ALL') params.set('publisher', pub);
    if (srt !== 'latest') params.set('sortBy', srt);
    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : '/search');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    updateUrlParams(trimmed, formatFilter, pubFilter, sortBy);
  };

  const handleTagClick = (tag: string) => {
    setInputVal(tag);
    updateUrlParams(tag, formatFilter, pubFilter, sortBy);
  };

  // Client-side search against the books passed from server
  const rawResults = useMemo(() => {
    if (!activeQuery.trim()) return [];
    const q = activeQuery.toLowerCase().trim();
    return allBooks.filter((b) => {
      const titleMatch = b.title && b.title.toLowerCase().includes(q);
      const seriesMatch = b.seriesName && b.seriesName.toLowerCase().includes(q);
      const origTitleMatch = b.originalTitle && b.originalTitle.toLowerCase().includes(q);
      const isbnMatch = b.isbn13 && b.isbn13.includes(q);
      const categoryMatch = b.category && b.category.toLowerCase().includes(q);
      const authorMatch = Array.isArray(b.authors) && b.authors.some((a) => {
        if (typeof a === 'string') return a.toLowerCase().includes(q);
        if (typeof a === 'object' && a && 'name' in a) return String((a as any).name).toLowerCase().includes(q);
        return false;
      });
      return Boolean(titleMatch || seriesMatch || origTitleMatch || isbnMatch || categoryMatch || authorMatch);
    });
  }, [activeQuery, allBooks]);

  // Filtered & Sorted
  const finalResults = useMemo(() => {
    return rawResults
      .filter((book) => {
        if (formatFilter !== 'ALL' && book.category !== formatFilter) return false;
        if (pubFilter !== 'ALL' && book.publisherId !== pubFilter) return false;
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
  }, [rawResults, formatFilter, pubFilter, sortBy]);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when query or filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeQuery, formatFilter, pubFilter, sortBy]);

  const visibleResults = useMemo(() => finalResults.slice(0, visibleCount), [finalResults, visibleCount]);
  const hasMore = visibleCount < finalResults.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, finalResults.length));
  }, [finalResults.length]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-[11px] font-mono text-editorial-faint">
          2.400+ Katalog Resmi
        </span>
      </div>

      {/* Main Search Input Card */}
      <div className="p-5 sm:p-7 rounded-3xl liquid-glass shadow-lg space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-editorial-title tracking-tight">
            {activeQuery ? (
              <span>Hasil Pencarian: &quot;{activeQuery}&quot;</span>
            ) : (
              <span>Pencarian Katalog Manga &amp; Light Novel</span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted">
            Cari berdasarkan judul komik, light novel, nama pengarang, atau nomor ISBN resmi.
          </p>
        </div>

        {/* Interactive Search Bar Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ketik judul komik, light novel, pengarang..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface-sunken border border-white/5 focus:border-accent focus:outline-none text-xs sm:text-sm text-editorial-title placeholder:text-editorial-faint transition-all shadow-inner"
              autoFocus={!activeQuery}
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  updateUrlParams('', formatFilter, pubFilter, sortBy);
                }}
                className="p-1 rounded-md text-editorial-faint hover:text-editorial-title absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-accent text-white font-semibold text-xs shadow-sm hover:bg-accent/90 transition-all shrink-0"
          >
            Cari
          </button>
        </form>

        {/* Popular Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-editorial-faint mr-1">Rekomendasi:</span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-editorial-muted hover:text-editorial-title transition-all"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      {activeQuery && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl liquid-glass text-xs">
          <div className="flex items-center gap-1">
            {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setFormatFilter(fmt);
                  updateUrlParams(activeQuery, fmt, pubFilter, sortBy);
                }}
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

          <div className="flex items-center gap-2">
            <select
              value={pubFilter}
              onChange={(e) => {
                setPubFilter(e.target.value);
                updateUrlParams(activeQuery, formatFilter, e.target.value, sortBy);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-sunken border border-white/5 text-editorial-title text-xs focus:outline-none"
            >
              <option value="ALL">Semua Penerbit</option>
              <option value="pub_elex">Elex Media</option>
              <option value="pub_mnc">m&c!</option>
              <option value="pub_pgi">PGI</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                updateUrlParams(activeQuery, formatFilter, pubFilter, e.target.value);
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-sunken border border-white/5 text-editorial-title text-xs focus:outline-none"
            >
              <option value="latest">Terbaru</option>
              <option value="title">Judul (A-Z)</option>
              <option value="price_low">Harga Terendah</option>
              <option value="price_high">Harga Tertinggi</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {activeQuery ? (
        finalResults.length === 0 ? (
          <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
            <BookOpen className="w-10 h-10 text-editorial-faint mx-auto" />
            <h3 className="text-sm font-semibold text-editorial-title">Tidak ada hasil untuk &quot;{activeQuery}&quot;</h3>
            <p className="text-xs text-editorial-muted">Coba periksa ejaan atau gunakan nama penulis/judul Jepang.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="text-xs font-mono text-editorial-muted block px-1">
              Ditemukan {finalResults.length} buku yang cocok
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {visibleResults.map((book) => (
                <ReleaseCard key={book.id} book={book} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={loadMore}
                  className="px-8 py-3 rounded-2xl liquid-glass text-sm font-semibold text-editorial-title hover:text-accent border border-border-subtle hover:border-accent/30 transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  Muat Lagi ({finalResults.length - visibleCount} tersisa)
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="py-16 text-center text-xs text-editorial-faint">
          Ketik judul di atas untuk memulai pencarian katalog.
        </div>
      )}
    </div>
  );
}
