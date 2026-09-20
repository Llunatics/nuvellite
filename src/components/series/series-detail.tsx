'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Series, Book } from '@/lib/types';
import { useCollection } from '@/hooks/use-collection';
import { ReleaseCard } from '@/components/books/release-card';
import { ArrowLeft, CheckCircle2, AlertCircle, Layers, Sparkles } from 'lucide-react';

interface SeriesDetailProps {
  series: Series;
  books: Book[];
}

export function SeriesDetail({ series, books }: SeriesDetailProps) {
  const { isOwned, isLoaded } = useCollection();
  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSING' | 'SPECIAL'>('ALL');

  // Sort books by volume number
  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => (a.volume || 0) - (b.volume || 0));
  }, [books]);

  // Owned books in this series
  const ownedBookIds = useMemo(() => {
    if (!isLoaded) return new Set<string>();
    return new Set(sortedBooks.filter((b) => isOwned(b.id)).map((b) => b.id));
  }, [sortedBooks, isOwned, isLoaded]);

  // Missing volumes detection in user's collection
  const missingFromCollection = useMemo(() => {
    if (!isLoaded || sortedBooks.length === 0) return [];
    return sortedBooks.filter((b) => !isOwned(b.id));
  }, [sortedBooks, isOwned, isLoaded]);

  // Special edition variants
  const specialEditions = useMemo(() => {
    return sortedBooks.filter((b) => b.isSetVariant || (b.editionType && b.editionType !== 'REGULAR'));
  }, [sortedBooks]);

  const displayedBooks = useMemo(() => {
    if (activeTab === 'MISSING') return missingFromCollection;
    if (activeTab === 'SPECIAL') return specialEditions;
    return sortedBooks;
  }, [activeTab, sortedBooks, missingFromCollection, specialEditions]);

  const progressPercent = Math.min(
    100,
    sortedBooks.length > 0 ? Math.round((ownedBookIds.size / sortedBooks.length) * 100) : 0
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Back to Series Directory */}
      <div>
        <Link
          href="/series"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Daftar Seri</span>
        </Link>
      </div>

      {/* Series Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl liquid-glass p-6 sm:p-8 shadow-xl border border-white/5">
        {/* Ambient background glow from cover */}
        {series.coverImage && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl opacity-10 scale-125 pointer-events-none"
            style={{ backgroundImage: `url(${series.coverImage})` }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Series Cover with depth */}
          <div className="relative aspect-[3/4] w-36 sm:w-48 shrink-0 rounded-2xl overflow-hidden bg-surface-sunken cover-depth">
            {series.coverImage ? (
              <img src={series.coverImage} alt={series.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                <Layers className="w-8 h-8 text-editorial-faint mb-1" />
                <span className="text-[10px] text-editorial-muted">{series.name}</span>
              </div>
            )}

            <div className="absolute top-2 left-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase liquid-chip ${
                  series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
                }`}
              >
                {series.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
              </span>
            </div>
          </div>

          {/* Series Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-editorial-muted mb-1.5">
                <span className="font-semibold text-editorial-title">{series.publisherName}</span>
                <span>•</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                    series.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-accent/20 text-accent border border-accent/30'
                  }`}
                >
                  {series.status === 'COMPLETED' ? 'Tamat / Complete' : 'Ongoing'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-bold font-editorial text-editorial-title tracking-tight">
                {series.name}
              </h1>

              {series.originalTitle && series.originalTitle !== series.name && (
                <p className="text-xs sm:text-sm text-editorial-muted italic font-editorial mt-0.5">
                  {series.originalTitle}
                </p>
              )}

              {series.author && (
                <p className="text-xs text-editorial-muted mt-2">
                  Pengarang: <span className="text-editorial-body font-medium">{series.author}</span>
                </p>
              )}

              {series.description && (
                <p className="text-xs sm:text-sm text-editorial-body/90 mt-3 line-clamp-3 leading-relaxed max-w-2xl">
                  {series.description}
                </p>
              )}
            </div>

            {/* Collection Progress & Missing Volume Detector Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated/50 border border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-editorial-title flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Progres Koleksi Seri</span>
                </span>
                <span className="font-mono text-xs text-accent font-bold">
                  {ownedBookIds.size} dari {sortedBooks.length} Volume Terbit ({progressPercent}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Missing Volume Detector Banner */}
              {isLoaded && missingFromCollection.length > 0 && ownedBookIds.size > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div className="min-w-0">
                    <span className="font-semibold">Volume Belum Anda Miliki: </span>
                    <span className="font-mono">
                      {missingFromCollection
                        .map((b) => (b.volume !== null && b.volume !== undefined ? `Vol. ${b.volume}` : b.title))
                        .join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {isLoaded && progressPercent === 100 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="font-semibold">Selamat! Anda telah mengoleksi seluruh volume yang telah terbit untuk seri ini.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-2xl liquid-glass w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl font-medium transition-all ${
            activeTab === 'ALL'
              ? 'bg-accent text-white font-semibold shadow-xs'
              : 'text-editorial-muted hover:text-editorial-title'
          }`}
        >
          Semua Volume ({sortedBooks.length})
        </button>

        {isLoaded && ownedBookIds.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('MISSING')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'MISSING'
                ? 'bg-accent text-white font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            Belum Anda Miliki ({missingFromCollection.length})
          </button>
        )}

        {specialEditions.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('SPECIAL')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'SPECIAL'
                ? 'bg-accent text-white font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            Edisi Khusus / Set ({specialEditions.length})
          </button>
        )}
      </div>

      {/* Volume Grid */}
      <div className="space-y-4">
        {displayedBooks.length === 0 ? (
          <div className="py-16 text-center rounded-3xl liquid-glass space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-semibold text-editorial-title">Semua volume pada kategori ini telah terpenuhi</h3>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
            {displayedBooks.map((book) => {
              const isOwnedBook = isLoaded && isOwned(book.id);
              return (
                <div key={book.id} className="relative">
                  <ReleaseCard book={book} />
                  {isLoaded && ownedBookIds.size > 0 && !isOwnedBook && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold bg-amber-500 text-black shadow-md uppercase">
                        Belum Ada
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
