'use client';

import React from 'react';
import Link from 'next/link';
import { CoverImage } from './cover-image';
import { Book, Series } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import { Bookmark, Check, Plus, Sparkles } from 'lucide-react';

export interface FeaturedReleaseCardProps {
  book: Book;
  spotlightBooks?: Book[];
  activeIndex?: number;
  onSelectIndex?: (index: number) => void;
}

export const FeaturedReleaseCard = React.memo(function FeaturedReleaseCard({
  book,
  spotlightBooks = [],
  activeIndex = 0,
  onSelectIndex,
}: FeaturedReleaseCardProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  const hasMultiple = spotlightBooks.length > 1;

  const rightEyebrow = [
    book.category,
    book.volume !== null && book.volume !== undefined ? `Vol. ${book.volume}` : null,
    book.status === 'PREORDER' ? 'Pre-Order' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      data-testid="featured-release-card"
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] sm:rounded-[32px] border border-white/[0.08] bg-surface/90 backdrop-blur-xl p-4 sm:p-6 lg:p-7 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.7)]"
    >
      {/* 1. Top Monospace Eyebrow Strip (Llunevie Header Pattern) */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3 mb-4 lg:mb-6 text-[10px] font-mono uppercase tracking-[0.14em]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-accent shrink-0">
          <Sparkles className="w-3 h-3 shrink-0" />
          <span>Sorotan Utama</span>
        </span>
        <span className="text-editorial-muted truncate">
          {rightEyebrow}
        </span>
      </div>

      {/* Main Dual-Zone Showcase Body (Mobile Stack / Desktop Split) */}
      <div className="flex flex-col md:grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] gap-4 md:gap-7 lg:gap-9 md:items-stretch">
        {/* Zone A — Upright Cover Media Well */}
        <div
          data-testid="featured-media-stage"
          className="relative w-full h-[284px] sm:h-[320px] md:h-[400px] lg:h-[428px] rounded-2xl overflow-hidden bg-surface-sunken border border-white/[0.06] flex items-center justify-center select-none shrink-0"
        >
          {/* Atmospheric Cover Aura Inside Media Well (Behind Upright Cover) */}
          {book.coverImage && (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-125 opacity-30 pointer-events-none"
              style={{ backgroundImage: `url(${book.coverImage})` }}
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/25 pointer-events-none"
          />

          {/* Single Upright Book Cover (Active Spotlight Book — 100% Straight 0deg) */}
          <Link
            href={`/books/${book.slug}`}
            data-testid="featured-upright-cover"
            className="group/cover relative z-20 block w-[164px] sm:w-[188px] md:w-[228px] lg:w-[248px] aspect-[2/3] rounded-xl overflow-hidden bg-surface-sunken shadow-[0_22px_48px_rgba(0,0,0,0.8)] ring-1 ring-white/15 transition-transform duration-300 ease-out hover:scale-[1.02]"
          >
            <CoverImage
              src={book.coverImage}
              alt={book.title}
              width={248}
              height={372}
              sizes="(max-width: 640px) 164px, (max-width: 1024px) 228px, 248px"
              priority
              imgClassName="w-full h-full object-cover"
            />
          </Link>

          {/* Bottom-Left Status Pill Inside Media Well */}
          {book.status === 'PREORDER' && (
            <div className="absolute bottom-2.5 left-3 z-30 pointer-events-none">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-accent text-zinc-950 shadow-md">
                PRE-ORDER
              </span>
            </div>
          )}

          {/* Bottom-Right Integrated Spotlight Carousel Dots Inside Media Well */}
          {hasMultiple && (
            <div
              data-testid="featured-carousel-dots"
              className="absolute bottom-2.5 right-3 z-30 flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1.5 border border-white/10"
            >
              {spotlightBooks.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => onSelectIndex?.(idx)}
                  aria-label={`Pilih sorotan ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeIndex === idx
                      ? 'w-5 bg-accent'
                      : 'w-1.5 bg-white/35 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Zone B — Editorial & Action Column */}
        <div className="flex flex-col justify-between md:py-1 min-w-0">
          {/* Top/Middle Editorial Stack */}
          <div>
            {/* Publisher & Date Meta Line (Zero bullet dots, zero mid-word truncation) */}
            <div
              data-testid="featured-meta-line"
              className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-editorial-muted"
            >
              <span className="font-semibold text-editorial-title">
                {book.publisherName}
              </span>
              {book.releaseDate && (
                <>
                  <span className="h-3 w-px bg-white/15 shrink-0" aria-hidden="true" />
                  <span className="shrink-0">
                    {formatDateWIB(book.releaseDate)}
                  </span>
                </>
              )}
            </div>

            {/* Title (Clickable to Book Detail) */}
            <Link
              href={`/books/${book.slug}`}
              className="group/title block mt-2 md:mt-3 focus-visible:outline-none"
            >
              <h2 className="font-editorial text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal text-editorial-title group-hover/title:text-accent transition-colors duration-200 leading-[1.16] tracking-tight line-clamp-2 md:line-clamp-3">
                {book.title}
              </h2>
            </Link>

            {/* Dedicated Full Author Line (Never Truncated to "K...") */}
            {book.authors && book.authors.length > 0 && (
              <p
                data-testid="featured-author-line"
                className="mt-1.5 md:mt-2.5 text-xs sm:text-sm text-editorial-muted line-clamp-1"
              >
                Karya <span className="text-editorial-title font-medium">{book.authors.join(', ')}</span>
              </p>
            )}

            {/* Desktop Editorial Context / Series & Format Summary Chips */}
            <div className="hidden md:flex flex-wrap items-center gap-2 mt-5">
              {book.category && (
                <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs font-mono text-editorial-muted">
                  Format: {book.category}
                </span>
              )}
              <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs font-mono text-editorial-muted">
                {book.volume !== null && book.volume !== undefined ? `Volume ${book.volume}` : 'Edisi Tunggal'}
              </span>
              <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs font-mono text-editorial-muted">
                {book.status === 'PREORDER' ? 'Status: Pre-Order Resmi' : 'Status: Tersedia'}
              </span>
            </div>
          </div>

          {/* Bottom Price & Collection Actions Row */}
          <div className="mt-3.5 md:mt-auto pt-3 md:pt-5 border-t border-white/[0.06] flex items-center justify-between gap-3">
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-editorial-faint">
                {book.originalPrice && book.originalPrice > book.currentPrice
                  ? 'Harga Promo'
                  : 'Harga Normal'}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl lg:text-3xl font-mono font-bold text-editorial-title tracking-tight">
                  {formatRupiah(book.currentPrice)}
                </span>
                {book.originalPrice && book.originalPrice > book.currentPrice && (
                  <span className="text-xs font-mono text-editorial-faint line-through">
                    {formatRupiah(book.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 ${
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
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  wishlisted
                    ? 'bg-accent/20 text-accent border border-accent/40'
                    : 'bg-white/[0.07] hover:bg-white/[0.12] text-editorial-muted hover:text-editorial-title border border-white/[0.09]'
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
    </article>
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
