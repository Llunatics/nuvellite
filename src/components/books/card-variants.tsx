'use client';

import React from 'react';
import Link from 'next/link';
import { CoverImage } from './cover-image';
import { Book, Series } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import { cleanStorySynopsis } from '@/lib/data/synopsis-cleaner';
import { Bookmark, Check, Plus, BookOpen, Sparkles, Layers, ArrowRight } from 'lucide-react';

interface FeaturedReleaseCardProps {
  book: Book;
}

export const FeaturedReleaseCard = React.memo(function FeaturedReleaseCard({ book }: FeaturedReleaseCardProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  return (
    <div className="relative z-10 overflow-hidden rounded-[28px] border border-white/[0.07] bg-surface/85 backdrop-blur-2xl p-5 sm:p-6 lg:p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.6)]">
      {/* Ambient cover glow (Round 3, D.2) */}
      <div
        className="absolute -right-20 -top-20 w-[500px] h-[500px] bg-cover bg-center rounded-full blur-3xl opacity-10 pointer-events-none -z-10"
        style={{ backgroundImage: book.coverImage ? `url(${book.coverImage})` : undefined }}
        aria-hidden="true"
      />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[216px_1fr] lg:grid-cols-[224px_1fr] gap-6 lg:gap-8 items-center">
        {/* Cover column with ambient glow strictly behind cover container */}
        <div className="relative shrink-0 z-0 mx-auto md:mx-0 w-[192px] sm:w-[216px] lg:w-[224px]">
          <div
            className="absolute -inset-4 bg-cover bg-center rounded-full blur-3xl opacity-15 pointer-events-none -z-10"
            style={{ backgroundImage: book.coverImage ? `url(${book.coverImage})` : undefined }}
            aria-hidden="true"
          />
          <Link
            href={`/books/${book.slug}`}
            className="group/cover relative block aspect-[2/3] w-full rounded-2xl overflow-hidden book-cover-elevated focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CoverImage
              src={book.coverImage}
              alt={book.title}
              width={224}
              height={336}
              sizes="(max-width: 640px) 192px, (max-width: 1024px) 216px, 224px"
              priority
              imgClassName="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/cover:scale-[1.03]"
              fallbackIconClassName="w-12 h-12 text-editorial-faint"
            />
            {/* Floating cover badges (Round 3, D.2 / S-05) */}
            <span className="absolute top-2.5 left-2.5 z-10 backdrop-blur-md bg-black/65 text-white border border-white/15 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
              {book.category}
            </span>
            {book.volume !== null && book.volume !== undefined && (
              <span className="absolute top-2.5 right-2.5 z-10 backdrop-blur-md bg-black/65 text-white border border-white/15 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                Vol. {book.volume}
              </span>
            )}
            {book.status === 'PREORDER' && (
              <span className="absolute bottom-2.5 left-2.5 z-10 backdrop-blur-md bg-accent text-white border border-white/15 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                Pre-Order
              </span>
            )}
          </Link>
        </div>

        {/* Editorial Content */}
        <div className="flex-1 text-left w-full">
          <div>
            {/* Tier 1 — Eyebrow Badge (SOROTAN UTAMA) */}
            <div className="flex items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/12 text-accent text-[10px] font-mono font-semibold tracking-[0.12em] uppercase border border-accent/25">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>SOROTAN UTAMA</span>
              </span>
            </div>

            {/* Tier 2 — Publisher & Date Line */}
            <div
              data-testid="featured-meta-line"
              className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono"
            >
              <span className="font-semibold text-editorial-title">
                {book.publisherName}
              </span>
              {book.releaseDate && (
                <>
                  <span className="h-3 w-px bg-white/15 shrink-0" aria-hidden="true" />
                  <span className="text-editorial-muted">
                    {formatDateWIB(book.releaseDate)}
                  </span>
                </>
              )}
            </div>

            {/* Title */}
            <div className="mt-2.5">
              <Link
                href={`/books/${book.slug}`}
                className="group/title inline-block focus-visible:outline-none"
              >
                <h2 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-normal text-editorial-title group-hover/title:text-accent transition-colors duration-200 leading-[1.18] tracking-tight">
                  {book.title}
                </h2>
              </Link>
            </div>

            {book.authors?.length > 0 && (
              <p className="mt-3 text-xs sm:text-sm text-editorial-muted">
                Karya <span className="text-editorial-title font-medium">{book.authors.join(', ')}</span>
              </p>
            )}
          </div>

          {book.synopsis && (
            <p className="mt-4 text-xs sm:text-sm text-editorial-body/90 line-clamp-3 leading-[1.65] font-sans max-w-2xl">
              {cleanStorySynopsis(book.synopsis)}
            </p>
          )}

          {/* Pricing & Actions Bar */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
            {/* Pricing */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-editorial-muted font-medium block">
                {book.originalPrice && book.originalPrice > book.currentPrice ? 'HARGA PROMO' : 'HARGA NORMAL'}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono text-2xl sm:text-3xl font-bold text-editorial-title tracking-tight">
                  {formatRupiah(book.currentPrice)}
                </span>
                {book.originalPrice && book.originalPrice > book.currentPrice && (
                  <span className="text-xs font-mono text-editorial-faint line-through">
                    {formatRupiah(book.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 ${
                  owned
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.07] hover:bg-white/[0.12] text-editorial-title border border-white/[0.09]'
                }`}
              >
                {owned ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Dimiliki</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-accent shrink-0" />
                    <span>Koleksi</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
                className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 border ${
                  wishlisted
                    ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                    : 'bg-white/[0.07] hover:bg-white/[0.12] text-editorial-muted hover:text-editorial-title border-white/[0.09]'
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
});

interface SeriesProgressionCardProps {
  series: Series;
  ownedCount: number;
}

export const SeriesProgressionCard = React.memo(function SeriesProgressionCard({ series, ownedCount }: SeriesProgressionCardProps) {
  const percent = series.totalVolumes > 0 ? Math.min(100, Math.round((ownedCount / series.totalVolumes) * 100)) : 0;

  return (
    <Link
      href={`/series/${series.slug}`}
      className="group p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08] transition-all duration-200 block space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="relative aspect-[3/4] w-12 rounded-xl overflow-hidden bg-surface-sunken shrink-0 cover-depth">
          <CoverImage
            src={series.coverImage}
            alt={series.name}
            width={48}
            height={64}
            imgClassName="w-full h-full object-cover"
            fallbackIconClassName="w-5 h-5 text-editorial-faint"
          />
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
          className="h-full bg-accent transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </Link>
  );
});
