'use client';

import React from 'react';
import Link from 'next/link';
import { Book, Series } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import { cleanStorySynopsis } from '@/lib/data/synopsis-cleaner';
import { Bookmark, Check, Plus, BookOpen, Sparkles, TrendingDown, Layers, ArrowRight } from 'lucide-react';

interface FeaturedReleaseCardProps {
  book: Book;
}

export function FeaturedReleaseCard({ book }: FeaturedReleaseCardProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  return (
    <div className="relative overflow-hidden rounded-3xl liquid-glass p-6 sm:p-8 shadow-2xl border border-white/5">
      {/* Dynamic Ambient Cover Background */}
      {book.coverImage && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-15 scale-125 pointer-events-none"
          style={{ backgroundImage: `url(${book.coverImage})` }}
        />
      )}

      {/* Atmospheric dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-center">
        {/* Large Cover with Cover Depth */}
        <Link
          href={`/books/${book.slug}`}
          className="relative aspect-[3/4] w-40 sm:w-52 rounded-2xl overflow-hidden shrink-0 bg-surface-sunken group cover-depth"
        >
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-editorial-faint" />
            </div>
          )}

          {/* Floating Badges on Cover */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider liquid-chip ${
                book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'
              }`}
            >
              {book.category}
            </span>
          </div>

          {book.volume !== null && book.volume !== undefined && (
            <div className="absolute top-2.5 right-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider liquid-chip text-slate-200">
                Vol. {book.volume}
              </span>
            </div>
          )}

          {book.status === 'PREORDER' && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-accent text-white shadow-md">
                PRE-ORDER
              </span>
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 space-y-4 text-left w-full">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-semibold tracking-wider uppercase border border-accent/25">
                <Sparkles className="w-3 h-3" />
                <span>SOROTAN UTAMA</span>
              </span>
              <span>•</span>
              <span className="font-semibold text-editorial-title">{book.publisherName}</span>
              {book.releaseDate && (
                <>
                  <span>•</span>
                  <span>{formatDateWIB(book.releaseDate)}</span>
                </>
              )}
            </div>

            <Link href={`/books/${book.slug}`} className="block">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-editorial text-editorial-title hover:text-accent transition-colors leading-tight tracking-tight">
                {book.title}
              </h2>
            </Link>

            {book.authors?.length > 0 && (
              <p className="text-xs text-editorial-muted">
                Karya <span className="text-editorial-body font-medium">{book.authors.join(', ')}</span>
              </p>
            )}
          </div>

          {book.synopsis && (
            <p className="text-xs sm:text-sm text-editorial-body/90 line-clamp-3 leading-relaxed font-sans max-w-3xl">
              {cleanStorySynopsis(book.synopsis)}
            </p>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="mr-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-editorial-faint font-semibold block">
                Harga Resmi
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title tracking-tight">
                {formatRupiah(book.currentPrice)}
              </span>
            </div>

            <Link
              href={`/books/${book.slug}`}
              className="px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent/90 text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>Detail Buku</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <button
              type="button"
              onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95 ${
                owned
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                  : 'bg-surface-elevated hover:bg-surface text-editorial-muted hover:text-editorial-title border border-border-subtle'
              }`}
            >
              {owned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>{owned ? 'Dimiliki' : 'Koleksi'}</span>
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
              className={`p-2.5 rounded-xl transition-all border active:scale-95 ${
                wishlisted
                  ? 'bg-accent/20 text-accent border-accent/40'
                  : 'bg-white/5 hover:bg-white/10 text-editorial-muted hover:text-editorial-title border-white/5'
              }`}
              aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            >
              <Bookmark className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SeriesProgressionCardProps {
  series: Series;
  ownedCount: number;
}

export function SeriesProgressionCard({ series, ownedCount }: SeriesProgressionCardProps) {
  const percent = series.totalVolumes > 0 ? Math.min(100, Math.round((ownedCount / series.totalVolumes) * 100)) : 0;

  return (
    <Link
      href={`/series/${series.slug}`}
      className="group p-4 rounded-2xl liquid-glass-card block space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="relative aspect-[3/4] w-12 rounded-xl overflow-hidden bg-surface-sunken shrink-0">
          {series.coverImage ? (
            <img src={series.coverImage} alt={series.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="w-5 h-5 text-editorial-faint" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-editorial-faint mb-0.5">
            <span className="font-semibold text-editorial-muted">{series.publisherName}</span>
            <span>•</span>
            <span className={series.type === 'LIGHT_NOVEL' ? 'text-amber-400' : 'text-sky-400'}>
              {series.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
            </span>
          </div>
          <h4 className="text-xs font-semibold text-editorial-title group-hover:text-accent transition-colors truncate">
            {series.name}
          </h4>
          <span className="text-[10px] font-mono text-editorial-muted block mt-0.5">
            {ownedCount} dari {series.totalVolumes} Volume ({percent}%)
          </span>
        </div>
      </div>

      <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
}
