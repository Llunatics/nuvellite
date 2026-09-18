'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, Check, Plus, BookOpen } from 'lucide-react';
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
    <div className="group relative flex flex-col bg-surface rounded-2xl border border-border-subtle hover:border-gold/30 transition-all duration-300 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5">
      {/* Top Cover Thumbnail with Badges */}
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
            <BookOpen className="w-8 h-8 text-editorial-faint mb-2" />
            <span className="text-[11px] text-editorial-muted font-medium line-clamp-2">{book.title}</span>
          </div>
        )}

        {/* Gradient overlay on bottom of cover for depth */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Floating Top Left: Format Badge */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-[4px] text-[8px] font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-xs border ${
              book.category === 'Light Novel'
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                : 'bg-sky-500/25 text-sky-300 border-sky-500/40'
            }`}
          >
            {book.category}
          </span>
        </div>

        {/* Floating Top Right: Volume Badge */}
        {book.volume !== null && book.volume !== undefined && (
          <div className="absolute top-2 right-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-[4px] text-[9px] font-mono font-bold bg-background/90 text-editorial-title border border-border-medium backdrop-blur-md shadow-xs">
              Vol. {book.volume}
            </span>
          </div>
        )}

        {/* Pre-order Tag Bottom Left of Cover */}
        {book.status === 'PREORDER' && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase bg-amber-500 text-black shadow-sm">
              PRE-ORDER
            </span>
          </div>
        )}
      </Link>

      {/* Book Info */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div>
          {/* Publisher and Author */}
          <div className="flex items-center justify-between gap-1 text-[10px] text-editorial-muted font-mono mb-1">
            <span className="font-semibold text-editorial-muted group-hover:text-gold transition-colors truncate">
              {book.publisherShortName}
            </span>
            {book.releaseDate && (
              <span className="text-[9px] text-editorial-faint font-mono truncate">
                {formatDateWIB(book.releaseDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/books/${book.slug}`} className="block">
            <h3 className="text-xs sm:text-[13px] font-semibold text-editorial-title group-hover:text-gold transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
          </Link>
        </div>

        {/* Footer: Price & Quick Action Buttons */}
        <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
          <div>
            <div className="text-xs sm:text-sm font-mono font-bold text-editorial-title">
              {formatRupiah(book.currentPrice)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => toggleWishlist(book.id, book.seriesId)}
              className={`p-1.5 rounded-xl border transition-all active:scale-95 ${
                wishlisted
                  ? 'bg-gold/15 text-gold border-gold/40 shadow-xs'
                  : 'bg-surface-raised hover:bg-surface text-editorial-muted hover:text-editorial-title border-border-subtle'
              }`}
              aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            {/* Owned / Collection Toggle Button */}
            <button
              type="button"
              onClick={() => toggleOwned(book.id, book.seriesId)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
                owned
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35 font-semibold shadow-xs'
                  : 'bg-surface-raised hover:bg-surface text-editorial-body hover:text-editorial-title border-border-subtle'
              }`}
              aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
            >
              {owned ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden xs:inline">{owned ? 'Milik' : 'Koleksi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
