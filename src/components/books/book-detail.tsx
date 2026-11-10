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
  ArrowRight,
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

  const authorDisplay = (Array.isArray(book.authors) ? book.authors : []).join(', ') || '—';
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
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Zone 1 — Context bar with volume stepper */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3 mb-2 text-xs font-mono">
        {book.seriesId && book.seriesName ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 truncate">
            <Link
              href="/"
              className="text-editorial-muted hover:text-editorial-title transition-colors shrink-0"
            >
              Katalog
            </Link>
            <span className="text-editorial-faint" aria-hidden>/</span>
            <Link
              href={`/series/${book.seriesId.replace(/^ser_/, '')}`}
              className="text-editorial-muted hover:text-editorial-title transition-colors truncate"
            >
              {book.seriesName}
            </Link>
          </nav>
        ) : (
          <Link
            href="/"
            className="text-editorial-muted hover:text-editorial-title transition-colors truncate"
          >
            ← Katalog Utama
          </Link>
        )}
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

      {/* Zone 2 — Soft glass hero card (Round 3, E.1): cover + inline actions | identity */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/40 border border-white/[0.06] p-5 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl">
        <div
          className="absolute -right-20 -top-20 w-[500px] h-[500px] bg-cover bg-center rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundImage: book.coverImage ? `url(${book.coverImage})` : undefined }}
        />
      <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cover & Actions Column */}
        <div className="w-full md:col-span-4 flex flex-col items-center md:items-start">
          <div className="relative aspect-[3/4.2] w-44 sm:w-56 md:w-full max-w-[260px] rounded-2xl overflow-hidden book-cover-elevated mx-auto md:mx-0">
            <CoverImage
              src={book.coverImage}
              alt={book.title}
              width={280}
              height={392}
              priority
              imgClassName="w-full h-full object-cover"
            />
            <span
              className={`absolute top-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 ${
                book.category === 'Light Novel' ? 'text-amber-300' : 'text-sky-300'
              }`}
            >
              {book.category}
            </span>
            {book.volume !== null && book.volume !== undefined && (
              <span className="absolute top-2.5 right-2.5 z-10 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wider bg-black/60 backdrop-blur-md border border-white/10 text-zinc-100">
                Vol. {book.volume}
              </span>
            )}
            {book.status === 'PREORDER' && (
              <span className="absolute bottom-2.5 left-2.5 z-10 px-2.5 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-accent text-white">
                Pre-Order
              </span>
            )}
          </div>

          {/* Action bar — inline beneath the cover on every viewport, so it
              never collides with the floating MobileNav */}
          <div className="flex items-center gap-2 w-full max-w-[260px] pt-4">
            <a
              href={gramediaProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full text-xs font-medium bg-[rgb(var(--editorial-title))] text-[rgb(var(--bg-rgb))] hover:opacity-90 transition-all active:scale-[0.98]"
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
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted">
              <span className="font-semibold text-editorial-title">{book.publisherShortName}</span>
              <span className="text-editorial-faint/60">•</span>
              <span>{book.category}</span>
              <span className="text-editorial-faint/60">•</span>
              <span>{book.volume != null ? `Vol. ${book.volume}` : 'Oneshot'}</span>
              {book.isBindUp && (
                <Link
                  href="/bind-up"
                  className="px-2 py-0.5 rounded-full border border-accent/40 text-accent text-[10px] uppercase tracking-wider hover:bg-accent/10 transition-colors"
                  title={`Edisi ${book.bindUpLabel || 'bind-up'}: beberapa volume original dalam satu buku`}
                >
                  {book.bindUpLabel || 'BIND-UP'}
                </Link>
              )}
              {book.status === 'PREORDER' && (
                <span className="px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-semibold uppercase tracking-wider">
                  PRE-ORDER
                </span>
              )}
            </div>

            <h1 className="mt-3 text-2xl sm:text-4xl lg:text-5xl font-editorial font-normal text-editorial-title tracking-tight leading-tight">
              {book.title}
            </h1>

            {showOriginalTitle && (
              <p className="mt-3 text-xs sm:text-sm text-editorial-muted">
                Judul Asli: {book.originalTitle}
              </p>
            )}
          </div>

          {/* Zone 3 — Unified 4-cell hairline data ledger */}
          <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 my-6 gap-4 font-mono">
            <div className="pr-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                Harga
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-lg font-semibold text-editorial-title tabular-nums">
                  {formatRupiah(book.currentPrice)}
                </span>
                {discountPercent !== null && (
                  <>
                    <span className="text-xs text-editorial-faint line-through tabular-nums">
                      {formatRupiah(book.originalPrice!)}
                    </span>
                    <span className="text-xs font-semibold text-[rgb(var(--semantic-red-rgb))]">-{discountPercent}%</span>
                  </>
                )}
              </div>
            </div>

            <div className="sm:px-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                Tanggal Terbit
              </span>
              <span className="text-xs text-editorial-title tabular-nums flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-editorial-faint shrink-0" />
                {book.releaseDate ? formatDateWIB(book.releaseDate) : '—'}
              </span>
            </div>

            <div className="sm:px-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                Pengarang
              </span>
              <span className="font-sans text-xs text-editorial-title block truncate" title={authorDisplay}>
                {authorDisplay}
              </span>
            </div>

            <div className="sm:pl-4">
              <span className="text-[10px] text-editorial-faint uppercase tracking-wider block mb-1.5">
                ISBN-13
              </span>
              <span className="text-xs text-editorial-title tabular-nums block truncate">
                {book.isbn13 || 'Belum tercatat'}
              </span>
            </div>
          </div>

          {/* Available Editions & Special Sets */}
          {book.availableEditions && book.availableEditions.length > 1 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
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
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
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
                        className="shrink-0 px-2.5 py-1 rounded-full border border-white/[0.12] hover:bg-white/[0.06] text-editorial-title text-[11px] font-mono flex items-center gap-1 transition-colors"
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
                <p className="max-w-[65ch] text-sm leading-[1.75] text-editorial-body whitespace-pre-line">
                  {cleanedSynopsis}
                </p>
              ) : (
                <div className="space-y-2">
                  {!isSynopsisExpanded && (
                    <p className="max-w-[65ch] text-sm leading-[1.75] text-editorial-body whitespace-pre-line line-clamp-4">
                      {cleanedSynopsis}
                    </p>
                  )}
                  <div className="nuv-collapse-grid" data-open={isSynopsisExpanded ? 'true' : 'false'}>
                    <div className="nuv-collapse-inner">
                      <p className="max-w-[65ch] text-sm leading-[1.75] text-editorial-body whitespace-pre-line">
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
                Belum ada sinopsis untuk volume ini.
              </p>
            )}
          </div>

          {/* Series page link */}
          {hasDistinctSeries && (
            <div className="pt-1">
              <Link
                href={`/series/${book.seriesId!.replace('ser_', '')}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] hover:border-white/[0.16] text-editorial-title hover:text-accent transition-all text-xs font-medium"
              >
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Lihat seluruh volume seri &quot;{book.seriesName}&quot;</span>
              </Link>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Zone 5 — Price history (heading only when there is real history) */}
      <div className="space-y-4">
        {hasPriceHistory && (
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15]">
                Riwayat Harga
              </h2>
              <p className="mt-1.5 text-xs font-mono text-editorial-muted">
                {priceSummary.snapshots.length} pencatatan
              </p>
            </div>
          </div>
        )}
        <PriceChart summary={priceSummary} />
      </div>

      {/* Zone 6 — Sibling volumes (current book excluded, capped at 12) */}
      {seriesSiblings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15]">
                Volume Lain di Seri Ini
              </h2>
              <p className="mt-1.5 text-xs font-mono text-editorial-muted">
                {seriesSiblings.length} volume
              </p>
            </div>
            {book.seriesId && (
              <div className="shrink-0 flex items-center gap-3 pl-2">
                <Link
                  href={`/series/${book.seriesId.replace('ser_', '')}`}
                  className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-medium text-editorial-body hover:text-accent transition-colors py-1"
                >
                  <span>Halaman Seri</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-9 sm:gap-y-12">
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
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Judul Serupa</span>
              </h2>
              <p className="mt-1.5 text-xs font-mono text-editorial-muted">
                Genre &amp; penerbit sejenis
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-9 sm:gap-y-12">
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
