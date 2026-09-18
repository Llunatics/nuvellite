'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, Check, Plus, BookOpen, Sparkles } from 'lucide-react';
import { Book } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';

interface ReleaseCardProps {
  book: Book;
}

export function ReleaseCard({ book }: ReleaseCardProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  return (
    <div className="group relative flex flex-col bg-surface rounded-2xl border border-slate-800/90 hover:border-slate-700 transition-all duration-300 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5">
      {/* Top Cover Thumbnail with Floating Glass Badges */}
      <Link href={`/books/${book.slug}`} className="relative aspect-[3/4] w-full bg-surface-sunken overflow-hidden block">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-raised/40">
            {book.category === 'Merchandise' ? (
              <Sparkles className="w-8 h-8 text-purple-400/60 mb-2" />
            ) : (
              <BookOpen className="w-8 h-8 text-editorial-faint mb-2" />
            )}
            <span className="text-[11px] text-editorial-muted font-medium line-clamp-2">{book.title}</span>
          </div>
        )}

        {/* Gradient overlay on bottom of cover for depth */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Floating Top Left: Format Capsule Badge (Clean matching gray outline) */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-sm border border-slate-700/60 ${
              book.category === 'Light Novel'
                ? 'bg-slate-900/85 text-amber-300'
                : book.category === 'Merchandise'
                ? 'bg-slate-900/85 text-purple-300'
                : 'bg-slate-900/85 text-sky-300'
            }`}
          >
            {book.category}
          </span>
        </div>

        {/* Floating Top Right: Volume Capsule Badge (Clean matching gray outline, NEVER for Merchandise) */}
        {book.category !== 'Merchandise' && book.volume !== null && book.volume !== undefined && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider backdrop-blur-md shadow-sm bg-slate-900/85 text-slate-300 border border-slate-700/60">
              Vol. {book.volume}
            </span>
          </div>
        )}

        {/* Pre-order Capsule Tag Bottom Left of Cover */}
        {book.status === 'PREORDER' && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-accent text-white shadow-md">
              PRE-ORDER
            </span>
          </div>
        )}
      </Link>

      {/* Book Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          {/* Publisher / Provider and Date */}
          <div className="flex items-center justify-between gap-1 text-[10px] text-editorial-muted font-mono mb-1">
            <span className={`font-semibold truncate ${book.category === 'Merchandise' ? 'text-purple-400' : 'group-hover:text-accent transition-colors'}`}>
              {book.category === 'Merchandise' ? 'Gramedia Official' : book.publisherShortName}
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

        {/* Integrated Bottom Dock: Price & Action Controls with matching soft gray divider */}
        <div className="mt-auto pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2">
          {/* Price with micro-label */}
          <div className="flex flex-col min-w-0">
            <span className="text-[8.5px] font-mono uppercase tracking-widest text-editorial-faint font-semibold leading-none">
              Harga Resmi
            </span>
            <span className="text-xs sm:text-[13px] font-mono font-bold text-editorial-title tracking-tight mt-1 truncate">
              {formatRupiah(book.currentPrice)}
            </span>
          </div>

          {/* Action Micro-Dock */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0">
            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => toggleWishlist(book.id, book.seriesId)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all active:scale-90 ${
                wishlisted
                  ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/50'
              }`}
              aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
              title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${wishlisted ? 'fill-current' : ''}`} />
            </button>

            {/* Owned / Collection Toggle Button */}
            <button
              type="button"
              onClick={() => toggleOwned(book.id, book.seriesId)}
              className={`h-7 px-2 sm:px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-semibold border transition-all active:scale-95 ${
                owned
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-xs font-semibold'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/50'
              }`}
              aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
              title={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
            >
              {owned ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] hidden xs:inline">Milik</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden xs:inline">Koleksi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
