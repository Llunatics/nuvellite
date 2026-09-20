'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, X, BookOpen, Sparkles, Filter, ArrowLeft } from 'lucide-react';
import { searchCatalog, getAllBooks, getAllSeries } from '@/lib/catalog-service';
import { Book } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';



export function SearchResultsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  // Sync when URL query changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setInputVal(q);
    setActiveQuery(q);
  }, [searchParams]);

  // Formats & Filters
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel' | 'Merchandise'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'price_low' | 'price_high'>('latest');

  // Dynamically derive popular search suggestions from active catalog series
  const popularSearchTags = useMemo(() => {
    return getAllSeries()
      .filter((s) => (s.totalVolumes || 0) >= 2)
      .slice(0, 10)
      .map((s) => s.name);
  }, []);

  // Handle Search Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  const handleTagClick = (tag: string) => {
    setInputVal(tag);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  };

  // Base matches from catalog
  const rawResults = useMemo(() => {
    if (!activeQuery.trim()) return [];
    return searchCatalog(activeQuery, 0); // 0 = return all matches
  }, [activeQuery]);

  // Count per category
  const formatCounts = useMemo(() => {
    return {
      ALL: rawResults.length,
      Manga: rawResults.filter((b) => b.category === 'Manga').length,
      'Light Novel': rawResults.filter((b) => b.category === 'Light Novel').length,
      Merchandise: rawResults.filter((b) => b.category === 'Merchandise').length,
    };
  }, [rawResults]);

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
        // latest
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [rawResults, formatFilter, pubFilter, sortBy]);

  // Popular / recommended when no query
  const samplePicks = useMemo(() => {
    if (activeQuery.trim()) return [];
    return getAllBooks().slice(0, 12);
  }, [activeQuery]);

  return (
    <div className="space-y-6">
      {/* Back Button & Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-[11px] font-mono text-editorial-faint">
          2.700+ Katalog Terdaftar
        </span>
      </div>

      {/* Main Search Input Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-surface border border-slate-800 shadow-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-sans text-editorial-title tracking-tight">
            {activeQuery ? (
              <span>Hasil Pencarian: &quot;{activeQuery}&quot;</span>
            ) : (
              <span>Pencarian Katalog Manga &amp; Light Novel</span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted">
            Cari berdasarkan judul buku, nama pengarang, judul seri, atau nomor ISBN resmi.
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
              placeholder="Ketik judul komik, light novel, merchandise, pengarang..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface-raised border border-slate-700/60 focus:border-accent focus:outline-none text-xs sm:text-sm text-editorial-title placeholder:text-editorial-faint transition-all shadow-inner"
              autoFocus={!activeQuery}
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-editorial-faint hover:text-editorial-title transition-colors"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent/90 transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <span>Cari</span>
            <span className="hidden sm:inline font-mono text-xs opacity-75">↵</span>
          </button>
        </form>

        {/* Quick Suggestion Tags */}
        <div className="pt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs py-1">
          <span className="text-[11px] font-mono text-editorial-faint shrink-0 mr-1">
            Pencarian Populer:
          </span>
          {popularSearchTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`px-2.5 py-1 rounded-xl font-mono text-[11px] transition-all shrink-0 border ${
                activeQuery.toLowerCase() === tag.toLowerCase()
                  ? 'bg-accent/20 text-accent border-accent/40 font-semibold'
                  : 'bg-slate-800/60 text-slate-300 hover:text-white border-slate-700/50 hover:bg-slate-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* When Query Exists: Show Filter Toolbar & Results */}
      {activeQuery ? (
        <div className="space-y-5">
          {/* Format Tabs & Filter Controls */}
          <div className="p-3 sm:p-4 rounded-2xl bg-surface border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Format Segmented Buttons */}
            <div className="inline-flex p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs overflow-x-auto scrollbar-none w-full sm:w-auto">
              {(['ALL', 'Manga', 'Light Novel', 'Merchandise'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormatFilter(fmt)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    formatFilter === fmt
                      ? 'bg-surface text-editorial-title shadow-xs font-semibold'
                      : 'text-editorial-muted hover:text-editorial-title'
                  }`}
                >
                  <span>
                    {fmt === 'ALL'
                      ? 'Semua'
                      : fmt === 'Manga'
                      ? 'Manga'
                      : fmt === 'Light Novel'
                      ? 'Light Novel'
                      : 'Merchandise'}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      formatFilter === fmt ? 'bg-accent text-white' : 'bg-surface-raised text-editorial-faint'
                    }`}
                  >
                    {formatCounts[fmt]}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort & Publisher Filter Controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Publisher Selector */}
              <select
                value={pubFilter}
                onChange={(e) => setPubFilter(e.target.value)}
                className="bg-surface-raised border border-slate-700/60 text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none flex-1 sm:flex-initial"
              >
                <option value="ALL">Semua Penerbit</option>
                <option value="pub_elex">Elex Media</option>
                <option value="pub_mnc">m&c! Publishing</option>
                <option value="pub_pgi">Phoenix Gramedia (PGI)</option>
                <option value="pub_gramedia">Gramedia Official</option>
              </select>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-surface-raised border border-slate-700/60 text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none flex-1 sm:flex-initial"
              >
                <option value="latest">Rilis Terbaru</option>
                <option value="title">Judul (A-Z)</option>
                <option value="price_low">Harga Terendah</option>
                <option value="price_high">Harga Tertinggi</option>
              </select>
            </div>
          </div>

          {/* Results Summary Counter */}
          <div className="flex items-center justify-between text-xs text-editorial-faint font-mono px-1">
            <span>
              Menampilkan {finalResults.length} hasil dari total {rawResults.length} judul
            </span>
          </div>

          {/* Books Grid or Empty State */}
          {finalResults.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-slate-800 rounded-3xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-editorial-faint mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold font-sans text-editorial-title">
                Tidak ada buku yang sesuai dengan pencarian &quot;{activeQuery}&quot;
              </h3>
              <p className="text-xs text-editorial-muted max-w-md mx-auto leading-relaxed">
                Coba periksa ejaan, gunakan kata kunci yang lebih umum, atau klik salah satu tag pencarian populer di atas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {finalResults.map((book) => (
                <ReleaseCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty Query Showcase: Recommendations & Popular Books */
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <h2 className="text-base font-bold font-sans text-editorial-title">
              Rekomendasi Rilisan Terpopuler
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {samplePicks.map((book) => (
              <ReleaseCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
