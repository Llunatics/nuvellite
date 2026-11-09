'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CoverImage } from './cover-image';
import { Book, RecommendationItem } from '@/lib/types';
import { PriceSummary } from '@/lib/data/price-service';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { useCollection } from '@/hooks/use-collection';
import { cleanStorySynopsis } from '@/lib/data/synopsis-cleaner';
import { normalizeSeriesName } from '@/lib/series-consistency';
import {
  Check,
  Plus,
  Bookmark,
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
  prevBook?: Book | null;
  nextBook?: Book | null;
  recommendations: RecommendationItem[];
  priceSummary: PriceSummary;
}

const SIBLING_INITIAL_COUNT = 12;

export const BookDetail = React.memo(function BookDetail({
  book,
  seriesSiblings,
  prevBook,
  nextBook,
  recommendations,
  priceSummary,
}: BookDetailProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [showAllSiblings, setShowAllSiblings] = useState(false);

  const owned = isLoaded && isOwned(book.id);
  const wishlisted = isLoaded && isWishlisted(book.id);

  const authorDisplay = (Array.isArray(book.authors) ? book.authors : []).join(', ') || 'Berbagai Penulis';
  const gramediaProductUrl = book.gramediaUrl || `https://www.gramedia.com/products/${book.slug}`;

  const hasDistinctSeries = Boolean(
    book.seriesId &&
    book.seriesName &&
    book.seriesName.trim().toLowerCase() !== book.title.trim().toLowerCase()
  );

  // Judul Asli is only meaningful when it differs from both the localized
  // title and the series name (auto-sync often duplicates the series name).
  const showOriginalTitle = Boolean(
    book.originalTitle &&
    normalizeSeriesName(book.originalTitle) !== normalizeSeriesName(book.title) &&
    normalizeSeriesName(book.originalTitle) !== normalizeSeriesName(book.seriesName || book.title)
  );

  // Clean narrative synopsis (full text; expansion is animated, not sliced)
  const cleanedSynopsis = useMemo(() => cleanStorySynopsis(book.synopsis), [book.synopsis]);
  const isSynopsisLong = (cleanedSynopsis?.length ?? 0) > 260;

  const discountPercent =
    book.originalPrice && book.originalPrice > book.currentPrice
      ? Math.round(((book.originalPrice - book.currentPrice) / book.originalPrice) * 100)
      : null;

  const hasPriceHistory = priceSummary.hasHistoricalFluctuation && priceSummary.snapshots.length >= 2;

  // Sibling window: first 12 centered on the current book's position in the
  // full sorted volume list, expandable to the whole series (Zone 6).
  const visibleSiblings = useMemo(() => {
    if (showAllSiblings || seriesSiblings.length <= SIBLING_INITIAL_COUNT) {
      return seriesSiblings;
    }
    const currentPos = seriesSiblings.findIndex((s) => (s.volume ?? 0) > (book.volume ?? 0));
    const insertAt = currentPos === -1 ? seriesSiblings.length : currentPos;
    const start = Math.min(
      Math.max(0, insertAt - Math.floor(SIBLING_INITIAL_COUNT / 2)),
      seriesSiblings.length - SIBLING_INITIAL_COUNT
    );
    return seriesSiblings.slice(start, start + SIBLING_INITIAL_COUNT);
  }, [seriesSiblings, showAllSiblings, book.volume]);

  return (
    <div className="space-y-10 pb-16">
      {/* Zone 1 — Context bar with volume stepper */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3 mb-2 text-xs font-mono">
        <Link
          href={book.seriesId ? `/series/${book.seriesId.replace(/^ser_/, '')}` : '/'}
          className="text-editorial-muted hover:text-editorial-title transition-colors truncate"
        >
          ← {book.seriesName || 'Katalog'}
        </Link>
        {(prevBook || nextBook) && (
          <div className="flex items-center gap-3 shrink-0">
            {prevBook && (
              <Link
                href={`/books/${prevBook.slug}`}
                className="text-editorial-muted hover:text-editorial-title transition-colors"
              >
                ← Vol. {prevBook.volume}
              </Link>
            )}
            <span className="text-accent font-semibold">VOL. {book.volume ?? '—'}</span>
            {nextBook && (
              <Link
                href={`/books/${nextBook.slug}`}
                className="text-editorial-muted hover:text-editorial-title transition-colors"
              >
                Vol. {nextBook.volume} →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Zone 2 — Unboxed hero: cover + inline actions | identity */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cover & Actions Column */}
        <div className="w-full md:col-span-4 flex flex-col items-center md:items-start">
          <div className="relative aspect-[3/4.2] w-40 sm:w-56 md:w-full max-w-[260px] rounded-lg border border-white/[0.08] bg-zinc-950 p-1.5 overflow-hidden mx-auto md:mx-0">
            <CoverImage
              src={book.coverImage}
              alt={book.title}
              width={280}
              height={392}
              priority
              imgClassName="w-full h-full object-cover rounded-[4px]"
            />
          </div>

          {/* Action bar — inline beneath the cover on every viewport, so it
              never collides with the floating MobileNav */}
          <div className="flex items-center gap-2 w-full max-w-[260px] pt-4">
            <a
              href={gramediaProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-medium bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Beli di Gramedia</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>

            <button
              type="button"
              onClick={() => toggleOwned(book.id, book.seriesId || undefined)}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                owned
                  ? 'bg-accent/15 text-accent border-accent/40'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title border-white/[0.08]'
              }`}
              aria-label={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
              title={owned ? 'Sudah Dimiliki' : 'Tambah ke Koleksi'}
            >
              {owned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(book.id, book.seriesId || undefined)}
              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center border transition-all active:scale-95 ${
                wishlisted
                  ? 'bg-accent/15 text-accent border-accent/40'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-editorial-muted hover:text-editorial-title border-white/[0.08]'
              }`}
              aria-label={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
              title={wishlisted ? 'Hapus dari Wishlist' : 'Tambah ke Wishlist'}
            >
              <Bookmark className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>

        </div>

        {/* Identity Column */}
        <div className="w-full md:col-span-8 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
              <span className="font-semibold text-editorial-title">{book.publisherShortName}</span>
              <span className="text-editorial-faint/60">•</span>
              <span>{book.category}</span>
              <span className="text-editorial-faint/60">•</span>
              <span>{book.volume != null ? `Vol. ${book.volume}` : 'Oneshot'}</span>
              {book.isBindUp && (
                <Link
                  href="/bind-up"
                  className="px-2 py-0.5 border border-accent/40 text-accent text-[10px] uppercase tracking-wider hover:bg-accent/10 transition-colors"
                  title={`Edisi ${book.bindUpLabel || 'bind-up'}: beberapa volume original dalam satu buku`}
                >
                  {book.bindUpLabel || 'BIND-UP'}
                </Link>
              )}
              {book.status === 'PREORDER' && (
                <span className="px-2 py-0.5 border border-red-500/40 text-red-400 text-[10px] uppercase tracking-wider">
                  PRE-ORDER
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-sans font-semibold text-editorial-title tracking-tight leading-tight">
              {book.title}
            </h1>

            {showOriginalTitle && (
              <p className="text-xs sm:text-sm text-editorial-muted">
                Judul Asli: {book.originalTitle}
              </p>
            )}
          </div>

          {/* Zone 3 — Unified 4-cell hairline data ledger */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-white/[0.08] py-4 my-6 gap-y-4 sm:gap-y-0 sm:divide-x sm:divide-white/[0.08] font-mono">
            <div className="pr-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                Harga
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-lg font-semibold text-zinc-100 tabular-nums">
                  {formatRupiah(book.currentPrice)}
                </span>
                {discountPercent !== null && (
                  <>
                    <span className="text-xs text-editorial-faint line-through tabular-nums">
                      {formatRupiah(book.originalPrice!)}
                    </span>
                    <span className="text-xs font-semibold text-red-400">-{discountPercent}%</span>
                  </>
                )}
              </div>
            </div>

            <div className="sm:px-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                Tanggal Terbit
              </span>
              <span className="text-xs text-zinc-200 tabular-nums flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-editorial-faint shrink-0" />
                {book.releaseDate ? formatDateWIB(book.releaseDate) : '—'}
              </span>
            </div>

            <div className="sm:px-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                Pengarang
              </span>
              <span className="font-sans text-xs text-zinc-200 block truncate" title={authorDisplay}>
                {authorDisplay === 'Berbagai Penulis' ? '—' : authorDisplay}
              </span>
            </div>

            <div className="sm:pl-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                ISBN-13
              </span>
              <span className="text-xs text-zinc-200 tabular-nums block truncate">
                {book.isbn13 || 'Belum tercatat'}
              </span>
            </div>
          </div>

          {/* Available Editions & Special Sets */}
          {book.availableEditions && book.availableEditions.length > 1 && (
            <div className="border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-editorial-muted font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pilihan Edisi &amp; Varian</span>
                </h3>
                <span className="text-[10px] font-mono text-editorial-faint">
                  {book.availableEditions.length} Pilihan
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {book.availableEditions.map((edition, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-editorial-title block truncate">
                        {edition.name}
                      </span>
                      {edition.price ? (
                        <span className="text-xs font-mono font-semibold text-editorial-title tabular-nums">
                          {formatRupiah(edition.price)}
                        </span>
                      ) : null}
                    </div>
                    {edition.gramediaUrl && (
                      <a
                        href={edition.gramediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-2.5 py-1 border border-white/[0.12] hover:bg-white/[0.06] text-editorial-title text-[11px] font-mono flex items-center gap-1 transition-colors"
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

          {/* Zone 4 — Smooth collapsible synopsis */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-editorial-faint font-semibold">
              Sinopsis
            </h3>
            {cleanedSynopsis ? (
              !isSynopsisLong ? (
                <p className="max-w-[65ch] text-sm leading-[1.7] text-zinc-300 whitespace-pre-line">
                  {cleanedSynopsis}
                </p>
              ) : (
                <div className="space-y-2">
                  {!isSynopsisExpanded && (
                    <p className="max-w-[65ch] text-sm leading-[1.7] text-zinc-300 whitespace-pre-line line-clamp-4">
                      {cleanedSynopsis}
                    </p>
                  )}
                  <div className="nuv-collapse-grid" data-open={isSynopsisExpanded ? 'true' : 'false'}>
                    <div className="nuv-collapse-inner">
                      <p className="max-w-[65ch] text-sm leading-[1.7] text-zinc-300 whitespace-pre-line">
                        {cleanedSynopsis}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                    className="text-xs font-mono text-accent hover:underline font-medium transition-colors"
                  >
                    {isSynopsisExpanded ? 'Sembunyikan [-]' : 'Baca selengkapnya [+]'}
                  </button>
                </div>
              )
            ) : (
              <p className="text-sm text-editorial-faint">
                Belum ada sinopsis yang tercatat untuk rilis ini.
              </p>
            )}
          </div>

          {/* Series page link */}
          {hasDistinctSeries && (
            <div className="pt-1">
              <Link
                href={`/series/${book.seriesId!.replace('ser_', '')}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-white/[0.08] hover:border-white/[0.16] text-editorial-title hover:text-accent transition-all text-xs font-medium"
              >
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Lihat seluruh volume seri &quot;{book.seriesName}&quot;</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Zone 5 — Price history (heading only when there is real history) */}
      <div className="space-y-4">
        {hasPriceHistory && (
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-lg sm:text-xl font-sans font-semibold text-editorial-title">
              Riwayat Harga
            </h2>
            <span className="text-[11px] font-mono text-editorial-faint">
              {priceSummary.snapshots.length} pencatatan
            </span>
          </div>
        )}
        <PriceChart summary={priceSummary} />
      </div>

      {/* Zone 6 — Sibling volumes (current book excluded, capped at 12) */}
      {seriesSiblings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-lg sm:text-xl font-sans font-semibold text-editorial-title">
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
            {visibleSiblings.map((sibling) => (
              <ReleaseCard key={sibling.id} book={sibling} />
            ))}
          </div>

          {seriesSiblings.length > SIBLING_INITIAL_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllSiblings((prev) => !prev)}
              className="text-xs font-mono text-accent hover:underline font-medium transition-colors"
            >
              {showAllSiblings
                ? 'Tampilkan lebih sedikit'
                : `Tampilkan semua (${seriesSiblings.length} volume)`}
            </button>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="text-lg sm:text-xl font-sans font-semibold text-editorial-title flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Rekomendasi Terkait</span>
            </h2>
            <span className="text-[11px] font-mono text-editorial-faint">
              Genre &amp; penerbit serupa
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
    </div>
  );
});
