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
  ExternalLink,
  Sparkles,
  ShoppingBag,
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

  // Safe formatting of author string to prevent [object Object]
  const authorNames = Array.isArray(book.authors)
    ? book.authors
        .map((a) => (typeof a === 'string' ? a : (a as any)?.name || ''))
        .filter(Boolean)
    : [];
  const authorDisplay = authorNames.join(', ');

  const gramediaProductUrl = book.gramediaUrl || `https://www.gramedia.com/products/${book.slug}`;
  const isMerch = book.category === 'Merchandise';

  // Only show series link if series exists and isn't just identical to the item's title
  const hasDistinctSeries = Boolean(
    book.seriesId &&
    book.seriesName &&
    book.seriesName.trim().toLowerCase() !== book.title.trim().toLowerCase()
  );

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
          {/* Left Column: Cover Image & Actions */}
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
                  {isMerch ? (
                    <Sparkles className="w-10 h-10 text-purple-400 mb-2" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-editorial-faint mb-2" />
                  )}
                  <span className="text-xs text-editorial-muted font-medium">{book.title}</span>
                </div>
              )}

              {/* Floating Top Left: Format Capsule Badge */}
              <div className="absolute top-2 left-2 z-10">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider uppercase backdrop-blur-md shadow-sm ${
                    book.category === 'Light Novel'
                      ? 'bg-amber-500/25 text-amber-200'
                      : isMerch
                      ? 'bg-purple-500/25 text-purple-200'
                      : 'bg-sky-500/25 text-sky-200'
                  }`}
                >
                  {book.category}
                </span>
              </div>

              {/* Floating Top Right: Volume Capsule Badge (Matching soft tinted border, NO stark white outline, NEVER for Merchandise) */}
              {!isMerch && book.volume !== null && book.volume !== undefined && (
                <div className="absolute top-2 right-2 z-10 pointer-events-none">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-semibold tracking-wider backdrop-blur-md shadow-sm ${
                      book.category === 'Light Novel'
                        ? 'bg-black/60 text-amber-200/90'
                        : 'bg-black/60 text-sky-200/90'
                    }`}
                  >
                    Vol. {book.volume}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons Below Cover */}
            <div className="w-full max-w-[260px] space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleOwned(book.id, book.seriesId)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                    owned
                      ? 'bg-emerald-500/25 text-emerald-400 shadow-xs'
                      : 'bg-accent text-white hover:bg-accent/90 shadow-xs'
                  }`}
                >
                  {owned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(book.id, book.seriesId)}
                  className={`p-2.5 rounded-xl transition-all ${
                    wishlisted
                      ? 'bg-accent/20 text-accent'
                      : 'bg-surface-raised hover:bg-surface text-editorial-muted hover:text-editorial-title'
                  }`}
                  aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

              {/* Official Gramedia.com Product Button */}
              <a
                href={gramediaProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm hover:shadow-sky-500/20 transition-all group"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Beli di Gramedia.com</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </a>
            </div>
          </div>

          {/* Right Column: Information & Metadata */}
          <div className="md:col-span-8 lg:col-span-9 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
                {isMerch ? (
                  <span className="font-semibold text-editorial-body flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                    <span>Disediakan oleh Gramedia</span>
                  </span>
                ) : (
                  <Link
                    href={`/publishers/${book.publisherId.replace('pub_', '')}`}
                    className="hover:text-accent transition-colors font-semibold"
                  >
                    {book.publisherName}
                  </Link>
                )}
                <span>•</span>
                <span className={isMerch ? 'text-purple-400 font-bold' : ''}>{book.category}</span>
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

            {/* Price & Official Status Banner with Gramedia Button */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised/60 border border-border-subtle flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono text-editorial-faint block">
                  {isMerch ? 'Harga Resmi:' : 'Harga Resmi (SRP):'}
                </span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title">
                  {formatRupiah(book.currentPrice)}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {book.releaseDate && (
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-editorial-faint block">
                      {isMerch ? 'Tanggal Tersedia:' : 'Jadwal Rilis:'}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-editorial-body flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-accent" />
                      <span>{formatDateWIB(book.releaseDate)}</span>
                    </span>
                  </div>
                )}

                <a
                  href={gramediaProductUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all group"
                  title="Buka halaman produk langsung di Gramedia.com"
                >
                  <span>Buka di Gramedia</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>

            {/* Metadata Grid (Tailored for Merch vs Manga/LN) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {/* Field 1: Creator / License */}
              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border-subtle">
                <span className="text-[10px] font-mono text-editorial-faint block mb-1">
                  {isMerch ? 'Produsen / Lisensi' : 'Pengarang / Ilustrator'}
                </span>
                <span className="font-medium text-editorial-title">
                  {authorDisplay || (isMerch ? 'MUSE Communication / Gramedia' : '-')}
                </span>
              </div>

              {/* Field 2: Provider / Publisher */}
              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border-subtle">
                <span className="text-[10px] font-mono text-editorial-faint block mb-1">
                  {isMerch ? 'Disediakan Oleh' : 'Penerbit Resmi'}
                </span>
                <span className="font-medium text-editorial-title">
                  {isMerch ? 'Gramedia' : book.publisherShortName}
                </span>
              </div>

              {/* Field 3: Format / ISBN */}
              <div className="p-3 rounded-xl bg-surface-raised/40 border border-border-subtle">
                <span className="text-[10px] font-mono text-editorial-faint block mb-1">
                  {isMerch ? 'Format Produk' : 'Nomor ISBN-13'}
                </span>
                <span className="font-mono text-editorial-title">
                  {isMerch ? 'Official Merchandise' : book.isbn13 || 'Tersedia saat rilis'}
                </span>
              </div>
            </div>

            {/* Synopsis / Description */}
            <div className="space-y-2 pt-2 border-t border-border-subtle">
              <h3 className="text-xs font-mono uppercase tracking-wider text-editorial-faint font-bold">
                {isMerch ? 'Keterangan Produk & Lisensi' : 'Sinopsis & Keterangan Rilis'}
              </h3>
              <p className="text-xs sm:text-sm text-editorial-body leading-relaxed whitespace-pre-line">
                {book.synopsis || (isMerch ? 'Official merchandise berlisensi resmi anime & manga, disediakan oleh Gramedia Official Store.' : 'Belum ada deskripsi resmi untuk rilis ini.')}
              </p>
            </div>

            {/* Series Link if Available and Distinct */}
            {hasDistinctSeries && (
              <div className="pt-2">
                <Link
                  href={`/series/${book.seriesId!.replace('ser_', '')}`}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/10 border border-accent/25 text-accent hover:bg-accent/15 transition-all text-xs font-semibold"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {isMerch
                      ? `Lihat Koleksi Seri "${book.seriesName}"`
                      : `Lihat Seluruh Volume Seri "${book.seriesName}"`}
                  </span>
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
              {isMerch
                ? `Item & Koleksi Terkait (${seriesSiblings.length} item)`
                : `Volume Lain dalam Seri Ini (${seriesSiblings.length} buku)`}
            </h2>
            {book.seriesId && (
              <Link
                href={`/series/${book.seriesId.replace('ser_', '')}`}
                className="text-xs text-accent hover:underline font-medium"
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
