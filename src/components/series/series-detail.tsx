'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Series, Book } from '@/lib/types';
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
}

type VolumeState = 'OWNED' | 'RELEASED' | 'UPCOMING' | 'UNKNOWN_GAP';

interface VolumeSlot {
  volNum: number;
  state: VolumeState;
  book?: Book;
}

export function SeriesDetail({ series, books }: SeriesDetailProps) {
  const { isOwned, isWishlisted, toggleOwned, toggleWishlist, isLoaded } = useCollection();
  const [activeTab, setActiveTab] = useState<'ALL' | 'MISSING' | 'SPECIAL'>('ALL');
  const [selectedSlot, setSelectedSlot] = useState<VolumeSlot | null>(null);

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

    for (const b of sortedBooks) {
      if (typeof b.volume === 'number' && b.volume > 0) {
        volMap.set(b.volume, b);
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
        {/* Subtle Ambient Glow */}
        {series.coverImage && (
          <div
            className="absolute -right-20 -top-20 w-[450px] h-[450px] bg-cover bg-center rounded-full blur-3xl opacity-10 pointer-events-none"
            style={{ backgroundImage: `url(${series.coverImage})` }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-10 items-start">
          {/* Series Cover */}
          <div className="relative aspect-[3/4.2] w-40 sm:w-48 shrink-0 book-cover-elevated overflow-hidden bg-surface-sunken">
            {series.coverImage ? (
              <img src={series.coverImage} alt={series.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                <Layers className="w-8 h-8 text-editorial-faint mb-2" />
                <span className="text-[11px] text-editorial-muted">{series.name}</span>
              </div>
            )}

            <div className="absolute top-2.5 left-2.5">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 ${
                  series.type === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
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
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'bg-white/[0.06] text-editorial-title border border-white/10'
                  }`}
                >
                  {series.status === 'COMPLETED' ? 'Tamat / Complete' : 'Ongoing'}
                </span>
                <span className="text-editorial-faint/60">•</span>
                <span>{sortedBooks.length} Volume Terdata</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-editorial font-normal text-editorial-title tracking-tight leading-[1.15]">
                {series.name}
              </h1>

              {series.originalTitle && series.originalTitle !== series.name && (
                <p className="text-xs sm:text-sm text-editorial-muted italic font-editorial mt-1">
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
            </div>

            {/* Collection Progress & Gap Recovery Matrix */}
            <div className="pt-4 border-t border-white/[0.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-mono text-editorial-title font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Progres Kelengkapan Koleksi</span>
                </span>
                <span className="font-mono text-xs text-editorial-muted">
                  <strong className="text-editorial-title font-semibold">{ownedBookIds.size}</strong> dari {sortedBooks.length} Volume ({progressPercent}%)
                </span>
              </div>

              {/* Minimal Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* 3. VISUAL GAP RECOVERY TIMELINE & SEQUENCE */}
              {volumeMatrix.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-editorial-faint">
                    <span>SEKUENS VOLUME &amp; STATUS:</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">●</span> Dimiliki
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-editorial-muted font-bold">○</span> Terbit
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-amber-400 font-bold">◌</span> Pra-pesan
                      </span>
                      {gapSlots.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-rose-400/80 font-bold">—</span> Gap Katalog
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Volume Matrix Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {volumeMatrix.map((slot) => {
                      const isSelected = selectedSlot?.volNum === slot.volNum;
                      return (
                        <button
                          key={slot.volNum}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-1 active:scale-95 ${
                            isSelected
                              ? 'ring-2 ring-white text-white bg-white/20'
                              : slot.state === 'OWNED'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : slot.state === 'UPCOMING'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 border-dashed hover:bg-amber-500/25'
                              : slot.state === 'UNKNOWN_GAP'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-rose-500/20'
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
              {selectedSlot && (
                <div className="mt-3 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-editorial-title">
                        Volume {selectedSlot.volNum}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold ${
                          selectedSlot.state === 'OWNED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : selectedSlot.state === 'UPCOMING'
                            ? 'bg-amber-500/20 text-amber-400'
                            : selectedSlot.state === 'UNKNOWN_GAP'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-white/10 text-editorial-muted'
                        }`}
                      >
                        {selectedSlot.state === 'OWNED' && 'Sudah Dimiliki'}
                        {selectedSlot.state === 'RELEASED' && 'Sudah Rilis (Belum Dimiliki)'}
                        {selectedSlot.state === 'UPCOMING' && 'Pra-Pesan / Segera Terbit'}
                        {selectedSlot.state === 'UNKNOWN_GAP' && 'Nomor Terlewati di Data Sumber'}
                      </span>
                    </div>

                    {selectedSlot.book ? (
                      <div className="text-xs text-editorial-muted space-y-0.5">
                        <p className="text-editorial-title font-medium">{selectedSlot.book.title}</p>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-editorial-faint">
                          <span>Harga: {formatRupiah(selectedSlot.book.currentPrice)}</span>
                          {selectedSlot.book.releaseDate && (
                            <>
                              <span>•</span>
                              <span>Rilis: {formatDateWIB(selectedSlot.book.releaseDate)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{selectedSlot.book.publisherShortName}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-editorial-muted">
                        Nomor volume ini belum ditemukan pada database Gramedia Indonesia.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedSlot.book && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleOwned(selectedSlot.book!.id, series.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95 ${
                            isLoaded && isOwned(selectedSlot.book.id)
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-white/[0.08] hover:bg-white/[0.12] text-editorial-title'
                          }`}
                        >
                          {isLoaded && isOwned(selectedSlot.book.id) ? (
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
                          href={`/books/${selectedSlot.book.slug}`}
                          className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-medium hover:bg-slate-100 transition-all flex items-center gap-1"
                        >
                          <span>Buka Detail</span>
                          <ExternalLink className="w-3 h-3" />
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
            Belum Anda Miliki ({missingFromCollection.length})
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
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-medium text-editorial-title">
              Seluruh volume pada kategori ini telah terpenuhi
            </h3>
            <p className="text-xs text-editorial-muted">Koleksi seri ini sudah lengkap di perpustakaan Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
            {displayedBooks.map((book) => (
              <ReleaseCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
