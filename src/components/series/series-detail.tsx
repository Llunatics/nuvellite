'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CoverImage } from '../books/cover-image';
import { Series, Book, KkiEnrichment } from '@/lib/types';
import { KkiDataBlock } from './kki-data-block';
import { useCollection } from '@/hooks/use-collection';
import { ReleaseCard } from '@/components/books/release-card';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  ExternalLink,
  Bookmark,
  Check,
  Plus,
  BookOpen,
  Info,
  X,
} from 'lucide-react';

interface SeriesDetailProps {
  series: Series;
  books: Book[];
  kkiEnrichment?: KkiEnrichment;
  crossLink?: { href: string; label: string } | null;
}

type VolumeState = 'OWNED' | 'RELEASED' | 'UPCOMING' | 'UNKNOWN_GAP';

interface VolumeSlot {
  volNum: number;
  state: VolumeState;
  book?: Book;
}

export const SeriesDetail = React.memo(function SeriesDetail({ series, books, kkiEnrichment, crossLink }: SeriesDetailProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSING' | 'SPECIAL'>('ALL');
  const [selectedSlot, setSelectedSlot] = useState<VolumeSlot | null>(null);
  const [expandedGapRuns, setExpandedGapRuns] = useState<Set<string>>(new Set());

  // Sort books by volume number
  const sortedBooks = useMemo(() => {
    return [...books].sort((a, b) => (a.volume ?? 0) - (b.volume ?? 0));
  }, [books]);

  // Owned books in this series
  const ownedBookIds = useMemo(() => {
    if (!isLoaded) return new Set<string>();
    return new Set(sortedBooks.filter((b) => isOwned(b.id)).map((b) => b.id));
  }, [sortedBooks, isOwned, isLoaded]);

  // Missing volumes detection in user's collection
  const missingFromCollection = useMemo(() => {
    if (!isLoaded || sortedBooks.length === 0) return [];
    return sortedBooks.filter((b) => !isOwned(b.id));
  }, [sortedBooks, isOwned, isLoaded]);

  // Special edition variants
  const specialEditions = useMemo(() => {
    return sortedBooks.filter((b) => b.isSetVariant || (b.editionType && b.editionType !== 'REGULAR'));
  }, [sortedBooks]);

  const displayedBooks = useMemo(() => {
    if (activeTab === 'MISSING') return missingFromCollection;
    if (activeTab === 'SPECIAL') return specialEditions;
    return sortedBooks;
  }, [activeTab, sortedBooks, missingFromCollection, specialEditions]);

  const progressPercent = Math.min(
    100,
    sortedBooks.length > 0 ? Math.round((ownedBookIds.size / sortedBooks.length) * 100) : 0
  );

  // Gap Recovery Matrix: Calculate sequence from 1 to max volume
  const volumeMatrix = useMemo<VolumeSlot[]>(() => {
    const volMap = new Map<number, Book>();
    let maxVol = 0;

    const isVariant = (b: Book) =>
      b.isSetVariant || (b.editionType && b.editionType !== 'REGULAR') || !Number.isInteger(b.volume ?? 0);
    for (const b of sortedBooks) {
      if (typeof b.volume === 'number' && b.volume > 0) {
        const existing = volMap.get(b.volume);
        // Only overwrite when the new book is owned, or the stored entry was
        // a special/decimal variant that a regular volume should replace.
        if (!existing || (isLoaded && isOwned(b.id)) || (isVariant(existing) && !isVariant(b))) {
          volMap.set(b.volume, b);
        }
        if (b.volume > maxVol) maxVol = b.volume;
      }
    }

    if (maxVol === 0) return [];

    const slots: VolumeSlot[] = [];
    for (let v = 1; v <= maxVol; v++) {
      const book = volMap.get(v);
      if (book) {
        let state: VolumeState = 'RELEASED';
        if (isLoaded && isOwned(book.id)) {
          state = 'OWNED';
        } else if (book.status === 'PREORDER') {
          state = 'UPCOMING';
        }
        slots.push({ volNum: v, state, book });
      } else {
        // Gap in numbering
        slots.push({ volNum: v, state: 'UNKNOWN_GAP' });
      }
    }
    return slots;
  }, [sortedBooks, isOwned, isLoaded]);

  const gapSlots = useMemo(() => {
    return volumeMatrix.filter((s) => s.state === 'UNKNOWN_GAP');
  }, [volumeMatrix]);

  // Render list for the matrix: when there are many gaps, long contiguous
  // UNKNOWN_GAP runs collapse into a single expandable summary chip instead
  // of a wall of individual red buttons (Block 6).
  type MatrixItem =
    | { kind: 'slot'; slot: VolumeSlot }
    | { kind: 'gaprun'; start: number; end: number; count: number };
  const matrixItems = useMemo<MatrixItem[]>(() => {
    if (gapSlots.length <= 12) {
      return volumeMatrix.map((slot) => ({ kind: 'slot' as const, slot }));
    }
    const items: MatrixItem[] = [];
    let i = 0;
    while (i < volumeMatrix.length) {
      const slot = volumeMatrix[i];
      if (slot.state === 'UNKNOWN_GAP') {
        let j = i;
        while (j + 1 < volumeMatrix.length && volumeMatrix[j + 1].state === 'UNKNOWN_GAP') j++;
        const runLength = j - i + 1;
        if (runLength >= 5) {
          items.push({ kind: 'gaprun', start: slot.volNum, end: volumeMatrix[j].volNum, count: runLength });
        } else {
          for (let k = i; k <= j; k++) items.push({ kind: 'slot', slot: volumeMatrix[k] });
        }
        i = j + 1;
      } else {
        items.push({ kind: 'slot', slot });
        i++;
      }
    }
    return items;
  }, [volumeMatrix, gapSlots.length]);

  const toggleGapRun = (key: string) => {
    setExpandedGapRuns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // §5.5 Volume Matrix Drawer Live Sync: derive active slot from live volumeMatrix state
  const activeSlot = useMemo(() => {
    if (!selectedSlot) return null;
    return volumeMatrix.find((s) => s.volNum === selectedSlot.volNum) ?? selectedSlot;
  }, [selectedSlot, volumeMatrix]);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. Back Navigation */}
      <div>
        <Link
          href="/series"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Direktori Seri</span>
        </Link>
      </div>

      {/* 2. Series Editorial Header */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/40 border border-white/[0.06] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-10 items-start">
          {/* Series Cover */}
          <div className="relative aspect-[3/4.2] w-40 sm:w-48 shrink-0 book-cover-elevated overflow-hidden bg-surface-sunken">
            <CoverImage
              src={series.coverImage}
              alt={series.name}
              width={192}
              height={256}
              imgClassName="w-full h-full object-cover"
              fallbackIconClassName="w-8 h-8 text-editorial-faint"
            />

            <div className="absolute top-2.5 left-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase ${
                  series.type === 'LIGHT_NOVEL'
                    ? 'border border-white/20 bg-zinc-900 text-zinc-100'
                    : 'border border-white/10 bg-zinc-950/90 text-zinc-200'
                }`}
              >
                {series.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
              </span>
            </div>
          </div>

          {/* Series Editorial Information */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted mb-2">
                <span className="font-semibold text-editorial-title">{series.publisherName}</span>
                <span className="text-editorial-faint/60">•</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-semibold ${
                    series.status === 'COMPLETED'
                      ? 'bg-accent/15 text-accent border border-accent/25'
                      : 'bg-white/[0.06] text-editorial-title border border-white/10'
                  }`}
                >
                  {series.status === 'COMPLETED' ? 'Tamat' : 'Berjalan'}
                </span>
                <span className="text-editorial-faint/60">•</span>
                <span>{sortedBooks.length} Volume Terdata</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-sans font-semibold text-editorial-title tracking-tight leading-[1.15]">
                {series.name}
              </h1>

              {series.originalTitle && series.originalTitle !== series.name && (
                <p className="text-xs sm:text-sm text-editorial-muted mt-1">
                  {series.originalTitle}
                </p>
              )}

              {series.author && (
                <p className="text-xs text-editorial-muted mt-2 font-sans">
                  Pengarang: <span className="text-editorial-title font-medium">{series.author}</span>
                </p>
              )}

              {series.description && (
                <p className="text-xs sm:text-sm text-editorial-body/90 mt-3 line-clamp-3 leading-relaxed max-w-2xl font-sans">
                  {series.description}
                </p>
              )}

              {kkiEnrichment && <KkiDataBlock enrichment={kkiEnrichment} />}

              {crossLink && (
                <div className="mt-4">
                  <Link
                    href={crossLink.href}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-editorial-title transition-all active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{crossLink.label}</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Collection Progress & Gap Recovery Matrix */}
            <div className="pt-4 border-t border-white/[0.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-mono text-editorial-title font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  <span>Koleksi Seri Ini</span>
                </span>
                <span className="font-mono text-xs text-editorial-muted">
                  <strong className="text-editorial-title font-semibold">{ownedBookIds.size}</strong> dari {sortedBooks.length} Volume ({progressPercent}%)
                </span>
              </div>

              {/* Minimal Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 3. VISUAL GAP RECOVERY TIMELINE & SEQUENCE */}
              {volumeMatrix.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-editorial-faint">
                    <span>DAFTAR VOLUME:</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="text-accent font-bold">●</span> Dimiliki
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-editorial-muted font-bold">○</span> Terbit
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-red-400 font-bold">◌</span> Pre-order
                      </span>
                      {gapSlots.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-red-400/80 font-bold">—</span> Belum Terdata
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Volume Matrix Chips (long gap runs collapse into one chip) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {matrixItems.map((item) => {
                      if (item.kind === 'gaprun') {
                        const runKey = `${item.start}-${item.end}`;
                        const isExpanded = expandedGapRuns.has(runKey);
                        if (isExpanded) {
                          return (
                            <React.Fragment key={runKey}>
                              {volumeMatrix
                                .filter((s) => s.volNum >= item.start && s.volNum <= item.end)
                                .map((slot) => {
                                  const isSelected = selectedSlot?.volNum === slot.volNum;
                                  return (
                                    <button
                                      key={slot.volNum}
                                      type="button"
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                        isSelected
                                          ? 'ring-1 ring-accent text-accent bg-accent/10'
                                          : 'bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20'
                                      }`}
                                      title={`Vol. ${slot.volNum} (${slot.state}) - Klik untuk informasi`}
                                    >
                                      <span className="text-[10px]">—</span>
                                      <span className="font-semibold">{slot.volNum}</span>
                                    </button>
                                  );
                                })}
                              <button
                                type="button"
                                onClick={() => toggleGapRun(runKey)}
                                className="h-7 px-2 rounded-lg text-[10px] font-mono bg-white/[0.04] text-editorial-muted border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-95"
                              >
                                Ringkas ↑
                              </button>
                            </React.Fragment>
                          );
                        }
                        return (
                          <button
                            key={runKey}
                            type="button"
                            onClick={() => toggleGapRun(runKey)}
                            className="h-7 px-2.5 rounded-lg text-[11px] font-mono bg-red-500/10 text-red-300 border border-red-500/25 border-dashed hover:bg-red-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                            title={`${item.count} volume belum ada di katalog — klik untuk lihat`}
                          >
                            <span>—</span>
                            <span className="font-semibold">Vol. {item.start}–{item.end}</span>
                            <span className="text-red-300/70">(Arsip Lama · Klik untuk lihat)</span>
                          </button>
                        );
                      }

                      const slot = item.slot;
                      const isSelected = selectedSlot?.volNum === slot.volNum;
                      return (
                        <button
                          key={slot.volNum}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1 active:scale-95 ${
                            isSelected
                              ? 'ring-1 ring-accent text-accent bg-accent/10'
                              : slot.state === 'OWNED'
                              ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25'
                              : slot.state === 'UPCOMING'
                              ? 'bg-red-500/10 text-red-300 border border-red-500/30 border-dashed hover:bg-red-500/20'
                              : slot.state === 'UNKNOWN_GAP'
                              ? 'bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20'
                              : 'bg-white/[0.04] text-editorial-body border border-white/[0.08] hover:bg-white/[0.08]'
                          }`}
                          title={`Vol. ${slot.volNum} (${slot.state}) - Klik untuk informasi`}
                        >
                          <span className="text-[10px]">
                            {slot.state === 'OWNED' && '●'}
                            {slot.state === 'RELEASED' && '○'}
                            {slot.state === 'UPCOMING' && '◌'}
                            {slot.state === 'UNKNOWN_GAP' && '—'}
                          </span>
                          <span className="font-semibold">{slot.volNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contextual Drawer for Selected Volume in Matrix */}
              {activeSlot && (
                <div className="mt-3 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-editorial-title">
                        Volume {activeSlot.volNum}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${
                          activeSlot.state === 'OWNED'
                            ? 'bg-accent/20 text-accent'
                            : activeSlot.state === 'UPCOMING'
                            ? 'bg-red-500/20 text-red-400'
                            : activeSlot.state === 'UNKNOWN_GAP'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-white/10 text-editorial-muted'
                        }`}
                      >
                        {activeSlot.state === 'OWNED' && 'Sudah Dimiliki'}
                        {activeSlot.state === 'RELEASED' && 'Sudah Rilis (Belum Dimiliki)'}
                        {activeSlot.state === 'UPCOMING' && 'Pre-order / Segera Terbit'}
                        {activeSlot.state === 'UNKNOWN_GAP' && 'Belum Terdata di Katalog'}
                      </span>
                    </div>

                    {activeSlot.book ? (
                      <div className="text-xs text-editorial-muted space-y-0.5">
                        <p className="text-editorial-title font-medium">{activeSlot.book.title}</p>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-editorial-faint">
                          <span>Harga: {formatRupiah(activeSlot.book.currentPrice)}</span>
                          {activeSlot.book.releaseDate && (
                            <>
                              <span>•</span>
                              <span>Rilis: {formatDateWIB(activeSlot.book.releaseDate)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{activeSlot.book.publisherShortName}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-editorial-muted">
                        Volume ini belum tercatat di katalog Gramedia.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {activeSlot.book && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleOwned(activeSlot.book!.id, series.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                            isLoaded && isOwned(activeSlot.book.id)
                              ? 'bg-accent/20 text-accent border border-accent/30'
                              : 'bg-white/[0.08] hover:bg-white/[0.12] text-editorial-title'
                          }`}
                        >
                          {isLoaded && isOwned(activeSlot.book.id) ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Dimiliki</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Tandai Milik</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/books/${activeSlot.book.slug}`}
                          className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-medium hover:bg-slate-100 transition-all flex items-center gap-1"
                        >
                          <span>Buka Detail</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      className="p-1.5 rounded-full text-editorial-muted hover:text-editorial-title hover:bg-white/10"
                      aria-label="Tutup info"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Segmented Tabs for Archive */}
      <div className="flex items-center gap-1 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-1.5 rounded-full font-medium transition-all ${
            activeTab === 'ALL'
              ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
              : 'text-editorial-muted hover:text-editorial-title'
          }`}
        >
          Semua Volume ({sortedBooks.length})
        </button>

        {isLoaded && ownedBookIds.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('MISSING')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'MISSING'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            Belum Dimiliki ({missingFromCollection.length})
          </button>
        )}

        {specialEditions.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('SPECIAL')}
            className={`px-4 py-1.5 rounded-full font-medium transition-all ${
              activeTab === 'SPECIAL'
                ? 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
                : 'text-editorial-muted hover:text-editorial-title'
            }`}
          >
            Edisi Khusus / Set ({specialEditions.length})
          </button>
        )}
      </div>

      {/* 5. Volume Bookshelf Grid */}
      <div>
        {displayedBooks.length === 0 ? (
          <div className="py-20 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-accent mx-auto" />
            <h3 className="text-sm font-medium text-editorial-title">
              Semua volume di tab ini sudah terkumpul
            </h3>
            <p className="text-xs text-editorial-muted">Koleksi untuk seri ini sudah lengkap.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
            {displayedBooks.map((book) => (
              <ReleaseCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export function SeriesDetailSkeleton() {
  return (
    <div className="space-y-12 pb-16 animate-pulse">
      <div className="h-4 w-28 bg-white/[0.05] rounded" />
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/40 border border-white/[0.06] p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 xl:col-span-3 aspect-[3/4.2] w-48 sm:w-56 mx-auto lg:mx-0 rounded-2xl bg-white/[0.06]" />
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <div className="h-4 w-32 bg-white/[0.06] rounded" />
            <div className="h-8 w-64 bg-white/[0.08] rounded" />
            <div className="h-4 w-48 bg-white/[0.05] rounded" />
            <div className="h-20 w-full bg-white/[0.04] rounded mt-4" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4.2] rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}
