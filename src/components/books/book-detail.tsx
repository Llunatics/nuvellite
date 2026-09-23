'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className="space-y-14 pb-24 sm:pb-16">
      {/* 1. Back Navigation Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Katalog Utama</span>
        </Link>
      </div>

      {/* 2. Main Editorial Book Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/40 border border-white/[0.06] p-6 sm:p-10 lg:p-12 shadow-2xl backdrop-blur-xl">
        {/* Subtle Ambient Radial Highlight */}
        {book.coverImage && (
          <div
            className="absolute -right-20 -top-20 w-[500px] h-[500px] bg-cover bg-center rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundImage: `url(${book.coverImage})` }}
          />
        )}

        {/* Responsive Grid */}
        <div className="relative z-10 flex flex-col md:grid md:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Cover & Actions Column */}
          <div className="w-full md:col-span-5 lg:col-span-4 flex flex-col items-center">
            <div className="relative aspect-[3/4.2] w-full max-w-[280px] rounded-2xl overflow-hidden bg-surface-sunken book-cover-elevated">
              {book.coverImage ? (
                <Image
                  src={book.coverImage}
                  alt={book.title}
                  width={280}
                  height={392}
                  priority
                  className="w-full h-full object-cover transition-transform duration-500 ease-out"
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
                  className={`px-3 py-1 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 ${
                    book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'
                  }`}
                >
                  {book.category}
                </span>
              </div>

              {/* Floating Top Right: Volume Capsule Badge */}
              {book.volume !== null && book.volume !== undefined && (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                  <span className="px-3 py-1 rounded-full text-[9.5px] font-mono font-medium tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-white/90">
                    Vol. {book.volume}
                  </span>
                </div>
              )}

              {book.status === 'PREORDER' && (
                <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                  <span className="px-2.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-accent text-white shadow-md">
                    PRE-ORDER
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Actions Below Cover */}
            <div className="hidden sm:flex w-full max-w-[280px] flex-col gap-2.5 mt-6">
              <a
                href={gramediaProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-medium bg-white text-black hover:bg-slate-100 shadow-md transition-all group active:scale-95"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Beli di Gramedia.com</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full text-xs font-medium transition-all active:scale-95 ${
                    owned
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title border border-white/[0.06]'
                  }`}
                >
                  {owned ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                  <span>{owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                    wishlisted
                      ? 'bg-accent/20 text-accent border-accent/40 shadow-xs'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title border border-white/[0.06]'
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
                <span className="font-semibold text-editorial-title">
                  {book.publisherName}
                </span>
                <span className="text-editorial-faint/60">•</span>
                <span className={book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'}>
                  {book.category}
                </span>
                {book.status === 'PREORDER' && (
                  <>
                    <span className="text-editorial-faint/60">•</span>
                    <span className="text-accent font-semibold uppercase tracking-wider">PRE-ORDER</span>
                  </>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-editorial font-normal text-editorial-title tracking-tight leading-[1.15]">
                {book.title}
              </h1>

              {book.originalTitle && book.originalTitle !== book.title && (
                <p className="text-xs sm:text-sm text-editorial-muted italic font-editorial">
                  Judul Asli: {book.originalTitle}
                </p>
              )}
            </div>

            {/* Price & Official Status Banner */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                  {book.originalPrice && book.originalPrice > book.currentPrice ? 'Harga Promo' : 'Harga Normal (SRP)'}
                </span>
                <div className="flex items-baseline gap-2.5 mt-1">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-editorial-title tracking-tight">
                    {formatRupiah(book.currentPrice)}
                  </span>
                  {book.originalPrice && book.originalPrice > book.currentPrice && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-mono text-editorial-faint line-through">
                        {formatRupiah(book.originalPrice)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/20 text-accent border border-accent/30">
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
                  <span className="text-xs sm:text-sm font-medium text-editorial-title flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>{formatDateWIB(book.releaseDate)}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block mb-1">
                  Pengarang / Ilustrator
                </span>
                <span className="font-medium text-editorial-title block truncate">{authorDisplay}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block mb-1">
                  Penerbit
                </span>
                <span className="font-medium text-editorial-title block truncate">{book.publisherShortName}</span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
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
              <div className="p-5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pilihan Edisi &amp; Varian</span>
                  </h3>
                  <span className="text-[10px] font-mono text-amber-300/70">
                    {book.availableEditions.length} Pilihan
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {book.availableEditions.map((edition, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface/80 border border-white/[0.06] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-editorial-title block truncate">
                          {edition.name}
                        </span>
                        {edition.price ? (
                          <span className="text-xs font-mono font-semibold text-accent">
                            {formatRupiah(edition.price)}
                          </span>
                        ) : null}
                      </div>
                      {edition.gramediaUrl && (
                        <a
                          href={edition.gramediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-editorial-title text-[11px] font-mono flex items-center gap-1 transition-colors"
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

            {/* Clean Narrative Story Synopsis */}
            <div className="space-y-2 pt-4 border-t border-white/[0.04]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-editorial-faint font-semibold">
                Sinopsis Cerita
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
                      className="text-xs font-mono text-accent hover:underline font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>{isSynopsisExpanded ? 'Sembunyikan ↑' : 'Baca selengkapnya ↓'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-editorial-faint italic font-sans">
                  Belum ada sinopsis yang tercatat untuk rilis ini.
                </p>
              )}
            </div>

            {/* Distinct Series Link */}
            {hasDistinctSeries && (
              <div className="pt-2">
                <Link
                  href={`/series/${book.seriesId!.replace('ser_', '')}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-editorial-title hover:text-accent transition-all text-xs font-medium"
                >
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span>Lihat Seluruh Volume Seri &quot;{book.seriesName}&quot;</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Real Price History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <h2 className="text-xl sm:text-2xl font-editorial font-normal text-editorial-title">
            Riwayat &amp; Fluktuasi Harga
          </h2>
          <span className="text-[11px] font-mono text-editorial-faint">Data Historis Terverifikasi</span>
        </div>

        <PriceChart summary={priceSummary} />
      </div>

      {/* 4. Related Releases (Neighboring volumes in same series) */}
      {seriesSiblings.length > 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <h2 className="text-xl sm:text-2xl font-editorial font-normal text-editorial-title">
              Volume Lain dalam Seri Ini ({seriesSiblings.length} buku)
            </h2>
            {book.seriesId && (
              <Link
                href={`/series/${book.seriesId.replace('ser_', '')}`}
                className="text-xs font-mono text-editorial-muted hover:text-editorial-title transition-colors"
              >
                Halaman Seri →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
            {seriesSiblings.map((sibling) => (
              <ReleaseCard key={sibling.id} book={sibling} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Explainable Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <h2 className="text-xl sm:text-2xl font-editorial font-normal text-editorial-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Rekomendasi Terkait</span>
            </h2>
            <span className="text-[11px] font-mono text-editorial-faint">
              Korelasi Genre &amp; Penerbit
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
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

      {/* Mobile Sticky Floating Action Pill */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 max-w-sm mx-auto z-40 liquid-glass-pill rounded-full p-2 flex items-center gap-2 shadow-2xl border border-white/[0.08]">
        <a
          href={gramediaProductUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-medium bg-white text-black shadow-md active:scale-95 transition-all"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Beli Gramedia</span>
        </a>

        <button
          type="button"
          onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            owned
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-white/[0.06] text-editorial-muted hover:text-editorial-title border-white/[0.08]'
          }`}
          aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
        >
          {owned ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
          className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
            wishlisted
              ? 'bg-accent/20 text-accent border-accent/40'
              : 'bg-white/[0.06] text-editorial-muted hover:text-editorial-title border-white/[0.08]'
          }`}
          aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
        >
          <Bookmark className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}
