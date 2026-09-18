'use client';

import React from 'react';
import Link from 'next/link';
import { Book } from '@/lib/types';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import {
  ArrowLeft,
  Check,
  Plus,
  Bookmark,
  BookOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import { ReleaseCard } from './release-card';

interface BookDetailProps {
  book: Book;
  seriesSiblings: Book[];
}

export function BookDetail({ book, seriesSiblings }: BookDetailProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Kembali ke Katalog</span>
        </Link>
      </div>

      {/* Main Detail Header Card */}
      <div className="bg-surface rounded-3xl border border-border-subtle p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cover Image & Quick Action */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
            <div className="relative aspect-[3/4] w-full max-w-[260px] rounded-2xl overflow-hidden bg-surface-sunken border border-border-medium shadow-lg">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                  <BookOpen className="w-10 h-10 text-editorial-faint mb-2" />
                  <span className="text-xs text-editorial-muted font-medium">{book.title}</span>
                </div>
              )}

              {/* Badges on Cover */}
              <div className="absolute top-2 left-2 z-10">
                <span
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border backdrop-blur-md ${
                    book.category === 'Light Novel'
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/40'
                      : 'bg-sky-500/25 text-sky-300 border-sky-500/40'
                  }`}
                >
                  {book.category}
                </span>
              </div>

              {book.volume !== null && book.volume !== undefined && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-background/90 text-editorial-title border border-border-medium backdrop-blur-md">
                    Vol. {book.volume}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons Below Cover */}
            <div className="w-full max-w-[260px] flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => toggleOwned(book.id, book.seriesId)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  owned
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-gold text-background hover:bg-gold-400 border-transparent shadow-xs'
                }`}
              >
                {owned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(book.id, book.seriesId)}
                className={`p-2.5 rounded-xl border transition-all ${
                  wishlisted
                    ? 'bg-gold/15 text-gold border-gold/40'
                    : 'bg-surface-raised hover:bg-surface text-editorial-muted hover:text-editorial-title border-border-subtle'
                }`}
                aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Information & Metadata */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
                <Link
                  href={`/publishers/${book.publisherId.replace('pub_', '')}`}
                  className="hover:text-gold transition-colors font-semibold"
                >
                  {book.publisherName}
                </Link>
                <span>•</span>
                <span>{book.category}</span>
                {book.status === 'PREORDER' && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-bold uppercase tracking-wider">PREORDER RESMI</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-editorial text-editorial-title tracking-tight">
                {book.title}
              </h1>

              {book.originalTitle && book.originalTitle !== book.title && (
                <p className="text-xs sm:text-sm text-editorial-muted italic font-editorial">
                  Judul Asli: {book.originalTitle}
                </p>
              )}
            </div>

            {/* Price & Official Status Banner */}
            <div className="p-4 rounded-2xl bg-surface-raised/60 border border-border-subtle flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-editorial-faint block">Harga Resmi (SRP):</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title">
                  {formatRupiah(book.currentPrice)}
                </span>
              </div>

              {book.releaseDate && (
                <div>
                  <span className="text-[11px] font-mono text-editorial-faint block">Jadwal Rilis:</span>
                  <span className="text-xs sm:text-sm font-medium text-editorial-body flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gold" />
                    <span>{formatDateWIB(book.releaseDate)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border-subtle">
                <span className="text-[10px] font-mono text-editorial-faint block mb-1">Pengarang / Ilustrator</span>
                <span className="font-medium text-editorial-title">{book.authors.join(', ') || '-'}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border-subtle">
                <span className="text-[10px] font-mono text-editorial-faint block mb-1">Penerbit Resmi</span>
                <span className="font-medium text-editorial-title">{book.publisherShortName}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border-subtle">
                <span className="text-[10px] font-mono text-editorial-faint block mb-1">Nomor ISBN-13</span>
                <span className="font-mono text-editorial-title">{book.isbn13 || 'Tersedia saat rilis'}</span>
              </div>
            </div>

            {/* Synopsis / Description */}
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <h3 className="text-xs font-mono uppercase tracking-wider text-editorial-faint font-bold">
                Sinopsis &amp; Keterangan Rilis
              </h3>
              <p className="text-xs sm:text-sm text-editorial-body leading-relaxed whitespace-pre-line">
                {book.synopsis || 'Belum ada deskripsi resmi untuk rilis ini.'}
              </p>
            </div>

            {/* Series Link if Available */}
            {book.seriesId && (
              <div className="pt-2">
                <Link
                  href={`/series/${book.seriesId.replace('ser_', '')}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gold/10 border border-gold/25 text-gold hover:bg-gold/15 transition-all text-xs font-semibold"
                >
                  <Layers className="w-4 h-4" />
                  <span>Lihat Seluruh Volume Seri &quot;{book.seriesName}&quot;</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Series Volume Siblings */}
      {seriesSiblings.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-editorial text-editorial-title">
              Volume Lain dalam Seri Ini ({seriesSiblings.length} buku)
            </h2>
            {book.seriesId && (
              <Link
                href={`/series/${book.seriesId.replace('ser_', '')}`}
                className="text-xs text-gold hover:underline font-medium"
              >
                Buka Halaman Seri →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {seriesSiblings.map((sibling) => (
              <ReleaseCard key={sibling.id} book={sibling} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
