'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Book, RecommendationItem } from '@/lib/types';
import { PriceSummary } from '@/lib/data/price-service';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import { cleanStorySynopsis, getSynopsisPreview } from '@/lib/data/synopsis-cleaner';
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
import { PriceChart } from '@/components/ui/price-chart';

interface BookDetailProps {
  book: Book;
  seriesSiblings: Book[];
  recommendations: RecommendationItem[];
  priceSummary: PriceSummary;
}

export function BookDetail({ book, seriesSiblings, recommendations, priceSummary }: BookDetailProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  const authorDisplay = (Array.isArray(book.authors) ? book.authors : []).join(', ') || 'Berbagai Penulis';
  const gramediaProductUrl = book.gramediaUrl || `https://www.gramedia.com/products/${book.slug}`;

  const hasDistinctSeries = Boolean(
    book.seriesId &&
    book.seriesName &&
    book.seriesName.trim().toLowerCase() !== book.title.trim().toLowerCase()
  );

  // Clean narrative synopsis
  const cleanedSynopsis = useMemo(() => cleanStorySynopsis(book.synopsis), [book.synopsis]);
  const { preview: synopsisPreview, isLong: isSynopsisLong } = useMemo(
    () => getSynopsisPreview(cleanedSynopsis, 260),
    [cleanedSynopsis]
  );

  return (
    <div className="space-y-10 pb-20 sm:pb-12">
      {/* 1. Back Navigation Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Katalog</span>
        </Link>
      </div>

      {/* 2. Main Editorial Book Hero */}
      <div className="relative overflow-hidden rounded-3xl liquid-glass p-6 sm:p-10 shadow-2xl border border-border-subtle">
        {/* Subtle Ambient Radial Highlight */}
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none ${
            book.category === 'Light Novel' ? 'bg-amber-500' : 'bg-sky-500'
          }`}
        />

        {/* Responsive Grid: Mobile-First Flex / Desktop 12-Cols */}
        <div className="relative z-10 flex flex-col md:grid md:grid-cols-12 gap-8 items-start">
          {/* Cover & Actions Column */}
          <div className="w-full md:col-span-5 lg:col-span-4 flex flex-col items-center">
            <div className="relative aspect-[3/4] w-full max-w-[280px] rounded-2xl overflow-hidden bg-surface-sunken shadow-2xl group border border-border-subtle cover-depth">
              {book.coverImage ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <BookOpen className="w-12 h-12 text-editorial-faint mb-3" />
                  <span className="text-xs text-editorial-muted font-medium">{book.title}</span>
                </div>
              )}

              {/* Floating Top Left: Format Capsule Badge */}
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <span
                  className={`px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase liquid-chip ${
                    book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'
                  }`}
                >
                  {book.category}
                </span>
              </div>

              {/* Floating Top Right: Volume Capsule Badge */}
              {book.volume !== null && book.volume !== undefined && (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <span className="px-3 py-1 rounded-full text-[9.5px] font-mono font-semibold tracking-wider liquid-chip text-slate-200">
                    Vol. {book.volume}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Quick Actions Below Cover */}
            <div className="hidden sm:flex w-full max-w-[280px] flex-col gap-2.5 mt-5">
              <a
                href={gramediaProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md hover:shadow-sky-500/20 transition-all group"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Beli di Gramedia.com</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                    owned
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-surface-elevated hover:bg-surface text-editorial-body border border-border-subtle'
                  }`}
                >
                  {owned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    wishlisted
                      ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                      : 'bg-surface-elevated hover:bg-surface text-editorial-muted hover:text-editorial-title border-border-subtle'
                  }`}
                  aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
                  title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
                >
                  <Bookmark className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Identity & Metadata Column */}
          <div className="w-full md:col-span-7 lg:col-span-8 space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
                {/* Publisher as Clean Editorial Metadata */}
                <span className="font-semibold text-editorial-title">
                  {book.publisherName}
                </span>
                <span>•</span>
                <span className={book.category === 'Light Novel' ? 'text-amber-400 font-bold' : 'text-sky-400 font-bold'}>
                  {book.category}
                </span>
                {book.status === 'PREORDER' && (
                  <>
                    <span>•</span>
                    <span className="text-accent font-bold uppercase tracking-wider">PREORDER RESMI</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-editorial text-editorial-title tracking-tight leading-tight">
                {book.title}
              </h1>

              {book.originalTitle && book.originalTitle !== book.title && (
                <p className="text-xs sm:text-sm text-editorial-muted italic font-editorial">
                  Judul Asli: {book.originalTitle}
                </p>
              )}
            </div>

            {/* Price & Official Status Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated/40 border border-border-subtle flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                  {book.originalPrice && book.originalPrice > book.currentPrice ? 'Harga Diskon / Saat Ini' : 'Harga Resmi (SRP)'}
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-editorial-title">
                    {formatRupiah(book.currentPrice)}
                  </span>
                  {book.originalPrice && book.originalPrice > book.currentPrice && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-base font-mono text-editorial-faint line-through">
                        {formatRupiah(book.originalPrice)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/20 text-accent">
                        Hemat {Math.round(((book.originalPrice - book.currentPrice) / book.originalPrice) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {book.releaseDate && (
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                    Jadwal Rilis
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-editorial-body flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>{formatDateWIB(book.releaseDate)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-surface-elevated/30 border border-border-subtle">
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block mb-1">
                  Pengarang / Ilustrator
                </span>
                <span className="font-medium text-editorial-title block truncate">{authorDisplay}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-elevated/30 border border-border-subtle">
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block mb-1">
                  Penerbit Resmi
                </span>
                <span className="font-medium text-editorial-title block truncate">{book.publisherShortName}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-elevated/30 border border-border-subtle">
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block mb-1">
                  Nomor ISBN-13
                </span>
                <span className="font-mono text-editorial-title block truncate">
                  {book.isbn13 || 'Tersedia saat rilis'}
                </span>
              </div>
            </div>

            {/* Available Editions & Special Sets */}
            {book.availableEditions && book.availableEditions.length > 1 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Pilihan Edisi &amp; Paket Rilis Resmi</span>
                  </h3>
                  <span className="text-[10px] font-mono text-amber-300/80">
                    {book.availableEditions.length} Opsi Tersedia
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {book.availableEditions.map((edition, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface/80 border border-border-subtle flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-editorial-title block truncate">
                          {edition.name}
                        </span>
                        {edition.price ? (
                          <span className="text-xs font-mono font-bold text-accent">
                            {formatRupiah(edition.price)}
                          </span>
                        ) : null}
                      </div>
                      {edition.gramediaUrl && (
                        <a
                          href={edition.gramediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Beli</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Narrative Story Synopsis (Short + Expandable) */}
            <div className="space-y-2 pt-4 border-t border-border-subtle">
              <h3 className="text-xs font-mono uppercase tracking-wider text-editorial-faint font-bold">
                Sinopsis
              </h3>
              {cleanedSynopsis ? (
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm text-editorial-body leading-relaxed whitespace-pre-line font-sans">
                    {isSynopsisExpanded || !isSynopsisLong ? cleanedSynopsis : synopsisPreview}
                  </p>
                  {isSynopsisLong && (
                    <button
                      type="button"
                      onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                      className="text-xs font-mono text-accent hover:underline font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>{isSynopsisExpanded ? 'Sembunyikan ↑' : 'Lihat selengkapnya ↓'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-editorial-faint italic font-sans">
                  Belum ada sinopsis resmi untuk rilis ini.
                </p>
              )}
            </div>

            {/* Series Link if Distinct */}
            {hasDistinctSeries && (
              <div className="pt-2">
                <Link
                  href={`/series/${book.seriesId!.replace('ser_', '')}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-accent/30 text-accent transition-all text-xs font-semibold"
                >
                  <Layers className="w-4 h-4" />
                  <span>Semua Volume &quot;{book.seriesName}&quot;</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Real Price History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold font-editorial text-editorial-title flex items-center gap-2">
            <span>Riwayat &amp; Fluktuasi Harga Resmi</span>
          </h2>
          <span className="text-[11px] font-mono text-editorial-faint">Data Historis Tercatat</span>
        </div>

        <PriceChart summary={priceSummary} />
      </div>

      {/* 4. Related Releases (Neighboring volumes in same series) */}
      {seriesSiblings.length > 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold font-editorial text-editorial-title">
              Volume Terkait dalam Seri Ini ({seriesSiblings.length} buku)
            </h2>
            {book.seriesId && (
              <Link
                href={`/series/${book.seriesId.replace('ser_', '')}`}
                className="text-xs text-accent hover:underline font-medium"
              >
                Halaman Seri →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {seriesSiblings.map((sibling) => (
              <ReleaseCard key={sibling.id} book={sibling} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Explainable Recommendations ("Mungkin Anda Sukai") */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold font-editorial text-editorial-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Mungkin Anda Sukai</span>
            </h2>
            <span className="text-[11px] font-mono text-editorial-faint">
              Rekomendasi Berdasarkan Metadata
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {recommendations.map(({ book: recBook, explanation }) => (
              <div key={recBook.id} className="flex flex-col space-y-1.5">
                <ReleaseCard book={recBook} />
                <span className="text-[9px] font-mono text-editorial-faint line-clamp-1 px-1" title={explanation}>
                  {explanation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Sticky Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-border-subtle p-3 flex items-center gap-2 shadow-2xl">
        <a
          href={gramediaProductUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold bg-sky-600 text-white shadow-md active:scale-95 transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Beli di Gramedia</span>
        </a>

        <button
          type="button"
          onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            owned
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-surface-elevated text-editorial-body border-border-subtle'
          }`}
          aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
        >
          {owned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
          className={`p-2.5 rounded-xl border transition-all active:scale-95 ${
            wishlisted
              ? 'bg-accent/20 text-accent border-accent/40'
              : 'bg-surface-elevated text-editorial-muted border-border-subtle'
          }`}
          aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
        >
          <Bookmark className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}
