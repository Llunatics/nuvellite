'use client';

import React from 'react';
import Link from 'next/link';
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
      <div className="group flex items-center gap-3 p-2.5 rounded-2xl bg-surface/70 hover:bg-surface-elevated/70 border border-border-subtle hover:border-border-medium transition-all duration-200">
        <Link href={`/books/${book.slug}`} className="relative aspect-[3/4] w-12 rounded-xl overflow-hidden shrink-0 bg-surface-sunken">
          {book.coverImage ? (
            <img src={book.coverImage} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-editorial-faint" />
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-editorial-faint mb-0.5">
            <span className="font-semibold text-editorial-muted">{book.publisherShortName}</span>
            <span>•</span>
            <span className={book.category === 'Light Novel' ? 'text-amber-400' : 'text-sky-400'}>{book.category}</span>
            {book.volume !== null && book.volume !== undefined && <span>• Vol. {book.volume}</span>}
          </div>
          <Link href={`/books/${book.slug}`}>
            <h4 className="text-xs font-medium text-editorial-title group-hover:text-accent transition-colors truncate">
              {book.title}
            </h4>
          </Link>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[11px] font-mono font-bold text-editorial-title">
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
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90 ${
              wishlisted
                ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                : 'bg-white/5 hover:bg-white/10 text-editorial-muted hover:text-editorial-title border-border-subtle'
            }`}
            aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90 ${
              owned
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs'
                : 'bg-white/5 hover:bg-white/10 text-editorial-muted hover:text-editorial-title border-border-subtle'
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

  return (
    <div className="group relative flex flex-col liquid-glass-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-border-subtle">
      {/* Top Cover Thumbnail with Floating Glass Badges */}
      <Link href={`/books/${book.slug}`} className="relative aspect-[3/4] w-full bg-surface-sunken overflow-hidden block cover-depth">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-elevated/40">
            <BookOpen className="w-8 h-8 text-editorial-faint mb-2" />
            <span className="text-[11px] text-editorial-muted font-medium line-clamp-2">{book.title}</span>
          </div>
        )}

        {/* Subtle Bottom Ambient Gradient for Cover Depth */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />

        {/* Floating Top Left: Format Capsule Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider uppercase liquid-chip ${
              book.category === 'Light Novel'
                ? 'text-amber-300'
                : 'text-sky-300'
            }`}
          >
            {book.category}
          </span>
        </div>

        {/* Floating Top Right: Volume Capsule Badge */}
        {book.volume !== null && book.volume !== undefined && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider liquid-chip text-slate-300">
              Vol. {book.volume}
            </span>
          </div>
        )}

        {/* Pre-order / Out of Stock Capsule Tag */}
        {book.status === 'PREORDER' && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[7.5px] font-mono font-bold uppercase tracking-wider bg-accent text-white shadow-md">
              PRE-ORDER
            </span>
          </div>
        )}
        {book.availability === 'OUT_OF_STOCK' && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[7.5px] font-mono font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-border-medium shadow-md">
              OUT OF STOCK
            </span>
          </div>
        )}
      </Link>

      {/* Book Information */}
      <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Publisher and Date */}
          <div className="flex items-center justify-between gap-1 text-[10px] text-editorial-muted font-mono mb-1">
            <span className="font-semibold truncate group-hover:text-accent transition-colors">
              {book.publisherShortName}
            </span>
            {book.releaseDate && (
              <span className="text-[9px] text-editorial-faint font-mono shrink-0">
                {formatDateWIB(book.releaseDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/books/${book.slug}`} className="block">
            <h3 className="text-xs sm:text-[13px] font-semibold text-editorial-title group-hover:text-accent transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>
        </div>

        {/* Integrated Bottom Dock: Price & Action Controls */}
        <div className="mt-auto pt-2 border-t border-border-subtle flex items-center justify-between gap-1">
          {/* Price with micro-label */}
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[8px] font-mono uppercase tracking-widest text-editorial-faint font-semibold leading-none">
              {book.originalPrice && book.originalPrice > book.currentPrice ? 'Diskon' : 'Harga Resmi'}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[11px] sm:text-[12.5px] font-mono font-bold text-editorial-title tracking-tight whitespace-nowrap">
                {formatRupiah(book.currentPrice)}
              </span>
              {book.originalPrice && book.originalPrice > book.currentPrice && (
                <span className="text-[9.5px] sm:text-[10.5px] font-mono text-editorial-faint line-through whitespace-nowrap">
                  {formatRupiah(book.originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Action Micro-Dock: Compact icon buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-surface-sunken/80 border border-border-subtle shrink-0">
            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90 ${
                wishlisted
                  ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                  : 'bg-white/5 hover:bg-white/10 text-editorial-muted hover:text-editorial-title border-border-subtle'
              }`}
              aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
              title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
            </button>

            {/* Owned / Collection Toggle Button */}
            <button
              type="button"
              onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90 ${
                owned
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-editorial-muted hover:text-editorial-title border-border-subtle'
              }`}
              aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
              title={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
            >
              {owned ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
