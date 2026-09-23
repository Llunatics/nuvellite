'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, X, BookOpen, ArrowLeft } from 'lucide-react';
import { Book } from '@/lib/types';
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

  // Distinct publishers in the dataset
  const publishers = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of allBooks) {
      if (b.publisherId && b.publisherShortName) {
        map.set(b.publisherId, b.publisherShortName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allBooks]);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeQuery, formatFilter, pubFilter, sortBy]);

  const visibleResults = useMemo(() => finalResults.slice(0, visibleCount), [finalResults, visibleCount]);
  const hasMore = visibleCount < finalResults.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, finalResults.length));
  }, [finalResults.length]);

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Katalog</span>
        </Link>
        <span className="text-[11px] font-mono text-editorial-faint">
          {allBooks.length.toLocaleString('id-ID')} Katalog Terdaftar
        </span>
      </div>

      {/* 2. Main Search Input Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface-elevated/40 border border-white/[0.06] shadow-xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-editorial font-normal text-editorial-title tracking-tight">
            {activeQuery ? (
              <span>Hasil Pencarian: &quot;{activeQuery}&quot;</span>
            ) : (
              <span>Pencarian Katalog Manga &amp; Light Novel</span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted font-sans">
            Cari berdasarkan judul, nama seri, nomor ISBN-13 resmi, atau nama pengarang.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-editorial-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ketik judul komik, light novel, pengarang, ISBN..."
              className="w-full pl-11 pr-10 py-3 rounded-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.07] border border-white/[0.08] focus:border-white/[0.18] text-xs sm:text-sm text-editorial-title placeholder:text-editorial-faint focus:outline-none transition-all shadow-inner font-sans"
              autoFocus={!activeQuery}
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => {
                  setInputVal('');
                  updateUrlParams('', formatFilter, pubFilter, sortBy);
                }}
                className="p-1 rounded-full text-editorial-faint hover:text-editorial-title absolute right-3.5 top-1/2 -translate-y-1/2"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-white text-black font-medium text-xs shadow-sm hover:bg-slate-100 transition-all shrink-0 active:scale-95"
          >
            Cari
          </button>
        </form>

        {/* Popular Tags */}
        {popularTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-editorial-faint mr-1">Rekomendasi Seri:</span>
            {popularTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-editorial-muted hover:text-editorial-title transition-all font-mono"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Filter Bar */}
      {activeQuery && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/[0.04] pb-4">
          <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  setFormatFilter(fmt);
                  updateUrlParams(activeQuery, fmt, pubFilter, sortBy);
                }}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  formatFilter === fmt
                    ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
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
              className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                updateUrlParams(activeQuery, formatFilter, pubFilter, e.target.value);
              }}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title text-xs focus:outline-none cursor-pointer"
            >
              <option value="latest" className="bg-surface text-editorial-title">Rilisan Terbaru</option>
              <option value="title" className="bg-surface text-editorial-title">Judul (A-Z)</option>
              <option value="price_low" className="bg-surface text-editorial-title">Harga Terendah</option>
              <option value="price_high" className="bg-surface text-editorial-title">Harga Tertinggi</option>
            </select>
          </div>
        </div>
      )}

      {/* 4. Results Section */}
      {activeQuery && (
        <div className="space-y-6">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-mono text-editorial-muted">
              Ditemukan <strong className="text-editorial-title font-semibold">{finalResults.length}</strong> judul untuk &quot;{activeQuery}&quot;
            </p>
          </div>

          {finalResults.length === 0 ? (
            <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
              <BookOpen className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
              <h3 className="text-sm font-medium text-editorial-title">Tidak ada hasil pencarian</h3>
              <p className="text-xs text-editorial-muted max-w-sm mx-auto">
                Periksa kembali ejaan kata kunci atau coba gunakan istilah pencarian yang lebih umum.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
              {visibleResults.map((book) => (
                <ReleaseCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-8 pb-4">
              <button
                type="button"
                onClick={loadMore}
                className="px-8 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-medium text-editorial-title transition-all shadow-sm active:scale-95"
              >
                Muat Lebih Banyak ({finalResults.length - visibleCount} tersisa)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
