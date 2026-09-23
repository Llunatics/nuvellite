'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Book, Series } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import { cleanStorySynopsis } from '@/lib/data/synopsis-cleaner';
import { Bookmark, Check, Plus, BookOpen, Sparkles, Layers, ArrowRight } from 'lucide-react';

interface FeaturedReleaseCardProps {
  book: Book;
}

export function FeaturedReleaseCard({ book }: FeaturedReleaseCardProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/40 border border-white/[0.06] p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl">
      {/* Subtle Ambient Cover Glow */}
      {book.coverImage && (
        <div
          className="absolute -right-20 -top-20 w-[500px] h-[500px] bg-cover bg-center rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${book.coverImage})` }}
        />
      )}

      <div className="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 items-center">
        {/* Large Visual Anchor Book Cover */}
        <Link
          href={`/books/${book.slug}`}
          className="relative aspect-[3/4.2] w-44 sm:w-56 shrink-0 book-cover-elevated overflow-hidden group block"
          tabIndex={-1}
        >
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              width={224}
              height={313}
              sizes="(max-width: 640px) 176px, 224px"
              priority
              className="w-full h-full object-cover transition-transform duration-500 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-sunken">
              <BookOpen className="w-12 h-12 text-editorial-faint" />
            </div>
          )}

          {/* Floating Cover Badges */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 ${
                book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'
              }`}
            >
              {book.category}
            </span>
          </div>

          {book.volume !== null && book.volume !== undefined && (
            <div className="absolute top-2.5 right-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-white/90">
                Vol. {book.volume}
              </span>
            </div>
          )}

          {book.status === 'PREORDER' && (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-accent text-white shadow-md">
                PRE-ORDER
              </span>
            </div>
          )}
        </Link>

        {/* Editorial Content */}
        <div className="flex-1 space-y-5 text-left w-full">
          <div className="space-y-3">
            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-editorial-muted">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold tracking-wider uppercase border border-accent/20">
                <Sparkles className="w-3 h-3" />
                <span>SOROTAN UTAMA</span>
              </span>
              <span className="text-editorial-faint/60">•</span>
              <span className="font-semibold text-editorial-title">{book.publisherName}</span>
              {book.releaseDate && (
                <>
                  <span className="text-editorial-faint/60">•</span>
                  <span className="text-editorial-faint">{formatDateWIB(book.releaseDate)}</span>
                </>
              )}
            </div>

            {/* Title */}
            <Link href={`/books/${book.slug}`} className="block">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-editorial font-normal text-editorial-title hover:text-accent transition-colors leading-[1.15] tracking-tight">
                {book.title}
              </h2>
            </Link>

            {book.authors?.length > 0 && (
              <p className="text-xs text-editorial-muted font-sans">
                Karya <span className="text-editorial-title font-medium">{book.authors.join(', ')}</span>
              </p>
            )}
          </div>

          {book.synopsis && (
            <p className="text-xs sm:text-sm text-editorial-body/90 line-clamp-3 leading-relaxed font-sans max-w-2xl">
              {cleanStorySynopsis(book.synopsis)}
            </p>
          )}

          {/* Pricing & Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-editorial-faint font-medium block">
                {book.originalPrice && book.originalPrice > book.currentPrice ? 'Harga Diskon' : 'Harga Resmi'}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-mono font-bold text-editorial-title tracking-tight">
                  {formatRupiah(book.currentPrice)}
                </span>
                {book.originalPrice && book.originalPrice > book.currentPrice && (
                  <span className="text-xs font-mono text-editorial-faint line-through">
                    {formatRupiah(book.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 ml-auto sm:ml-4">
              <Link
                href={`/books/${book.slug}`}
                className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-slate-100 text-xs font-medium shadow-md transition-all flex items-center gap-2 active:scale-95"
              >
                <span>Detail Buku</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
                className={`px-4 py-2.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                  owned
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-editorial-muted hover:text-editorial-title border border-white/[0.08]'
                }`}
              >
                {owned ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{owned ? 'Dimiliki' : 'Koleksi'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  wishlisted
                    ? 'bg-accent/20 text-accent border border-accent/40'
                    : 'bg-white/[0.06] hover:bg-white/[0.1] text-editorial-muted hover:text-editorial-title border border-white/[0.08]'
                }`}
                aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
                title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
              >
                <Bookmark className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
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
      className="group p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 block space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="relative aspect-[3/4] w-12 rounded-xl overflow-hidden bg-surface-sunken shrink-0 cover-depth">
          {series.coverImage ? (
            <Image src={series.coverImage} alt={series.name} width={48} height={64} className="w-full h-full object-cover" />
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
            <span className={series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'}>
              {series.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
            </span>
          </div>
          <h4 className="text-xs font-medium text-editorial-title group-hover:text-accent transition-colors truncate">
            {series.name}
          </h4>
          <span className="text-[10px] font-mono text-editorial-muted block mt-0.5">
            {ownedCount} dari {series.totalVolumes} Volume ({percent}%)
          </span>
        </div>
      </div>

      <div className="w-full h-1 rounded-full bg-surface-sunken overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
}
