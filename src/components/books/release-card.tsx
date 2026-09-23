'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bookmark, Check, Plus, BookOpen } from 'lucide-react';
import { Book } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';

interface ReleaseCardProps {
  book: Book;
  variant?: 'standard' | 'compact';
}

export function ReleaseCard({ book, variant = 'standard' }: ReleaseCardProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  if (variant === 'compact') {
    return (
      <div className="group flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] transition-all duration-200">
        <Link
          href={`/books/${book.slug}`}
          className="relative aspect-[3/4] w-11 rounded-lg overflow-hidden shrink-0 bg-surface-sunken cover-depth"
        >
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              width={44}
              height={59}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-editorial-faint" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-editorial-faint mb-0.5">
            <span className="font-semibold text-editorial-muted">{book.publisherShortName}</span>
            <span>•</span>
            <span className={book.category === 'Light Novel' ? 'text-amber-300/90' : 'text-sky-300/90'}>
              {book.category}
            </span>
            {book.volume !== null && book.volume !== undefined && (
              <span>• Vol. {book.volume}</span>
            )}
          </div>
          <Link href={`/books/${book.slug}`}>
            <h4 className="text-xs font-medium text-editorial-title group-hover:text-accent transition-colors truncate">
              {book.title}
            </h4>
          </Link>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono font-semibold text-editorial-title">
              {formatRupiah(book.currentPrice)}
            </span>
            {book.originalPrice && book.originalPrice > book.currentPrice && (
              <span className="text-[9px] font-mono text-editorial-faint line-through">
                {formatRupiah(book.originalPrice)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              wishlisted
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-editorial-muted hover:text-editorial-title hover:bg-white/[0.06]'
            }`}
            aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
              owned
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-editorial-muted hover:text-editorial-title hover:bg-white/[0.06]'
            }`}
            aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
            title={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
          >
            {owned ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  }

  // Standard Editorial Bookshelf Card
  return (
    <div className="group flex flex-col transition-all duration-200">
      {/* 1. Physical Book Cover Frame with specular lighting and hover lift */}
      <div className="relative aspect-[3/4.2] w-full rounded-2xl overflow-hidden bg-surface-sunken book-cover-elevated">
        <Link href={`/books/${book.slug}`} className="block w-full h-full" tabIndex={-1} aria-hidden="true">
          {book.coverImage ? (
            <Image
              src={book.coverImage}
              alt={book.title}
              width={184}
              height={258}
              loading="lazy"
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 190px, 220px"
              className="w-full h-full object-cover transition-transform duration-300 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-elevated/40">
              <BookOpen className="w-8 h-8 text-editorial-faint mb-2" />
              <span className="text-[11px] text-editorial-muted font-medium line-clamp-2">{book.title}</span>
            </div>
          )}

          {/* Subtle Ambient Vignette on Cover for Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
        </Link>

        {/* Floating Top Left: Format Capsule Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-medium tracking-wide uppercase bg-black/50 backdrop-blur-md border border-white/10 ${
              book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'
            }`}
          >
            {book.category}
          </span>
        </div>

        {/* Floating Top Right: Volume Capsule Badge */}
        {book.volume !== null && book.volume !== undefined && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wider bg-black/50 backdrop-blur-md border border-white/10 text-white/90">
              Vol. {book.volume}
            </span>
          </div>
        )}

        {/* Status indicator: Preorder / Out of stock */}
        {book.status === 'PREORDER' && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[7.5px] font-mono font-bold uppercase tracking-wider bg-accent text-white shadow-md">
              PRE-ORDER
            </span>
          </div>
        )}
        {book.availability === 'OUT_OF_STOCK' && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[7.5px] font-mono font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-sm text-slate-300 border border-white/10">
              HABIS
            </span>
          </div>
        )}

        {/* Floating Quick Action Overlays on Cover (Appear on Hover) */}
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(book.id, book.seriesId || undefined);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
              wishlisted
                ? 'bg-accent text-white shadow-md'
                : 'bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/15'
            }`}
            aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleOwned(book.id, book.seriesId || undefined);
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${
              owned
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/15'
            }`}
            aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
            title={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
          >
            {owned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Editorial Typography & Metadata (Pure hierarchy, zero boxing) */}
      <div className="pt-3 pb-1 flex-1 flex flex-col justify-between">
        <div>
          {/* Publisher & Release Date */}
          <div className="flex items-center justify-between text-[10px] font-mono text-editorial-faint mb-1">
            <span className="font-medium text-editorial-muted truncate">
              {book.publisherShortName}
            </span>
            {book.releaseDate && (
              <span className="shrink-0 text-[9px] text-editorial-faint/80">
                {formatDateWIB(book.releaseDate)}
              </span>
            )}
          </div>

          {/* Book Title */}
          <Link href={`/books/${book.slug}`} className="block group-hover:text-accent transition-colors">
            <h3 className="text-xs sm:text-[13px] font-medium text-editorial-title line-clamp-2 leading-snug tracking-tight">
              {book.title}
            </h3>
          </Link>
        </div>

        {/* Price & Discount */}
        <div className="mt-2 pt-1 flex items-baseline gap-1.5">
          <span className="text-[12px] sm:text-[13px] font-mono font-semibold text-editorial-title tracking-tight">
            {formatRupiah(book.currentPrice)}
          </span>
          {book.originalPrice && book.originalPrice > book.currentPrice && (
            <span className="text-[10px] font-mono text-editorial-faint line-through">
              {formatRupiah(book.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
