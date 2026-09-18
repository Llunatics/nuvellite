'use client';

import React, { useState, useMemo } from 'react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { formatDateWIB, getDayNameWIB } from '@/lib/formatters';
import { Calendar as CalendarIcon, Sparkles, Filter } from 'lucide-react';

interface CalendarViewProps {
  books: Book[];
  publishers: Publisher[];
}

export function CalendarView({ books, publishers }: CalendarViewProps) {
  const [wednesdayOnly, setWednesdayOnly] = useState(true);
  const [pubFilter, setPubFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');

  // Filter books with release dates
  const datedBooks = useMemo(() => {
    return books
      .filter((b) => {
        if (!b.releaseDate) return false;
        if (wednesdayOnly && !b.isWednesdayRelease) return false;
        if (pubFilter !== 'ALL' && b.publisherId !== pubFilter) return false;
        if (formatFilter !== 'ALL' && b.category !== formatFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.releaseDate!).getTime();
        const dateB = new Date(b.releaseDate!).getTime();
        return dateB - dateA;
      });
  }, [books, wednesdayOnly, pubFilter, formatFilter]);

  // Group by Date String
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Book[]>();
    for (const b of datedBooks) {
      const dateKey = b.releaseDate!.slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(b);
    }
    return Array.from(map.entries()).map(([dateStr, items]) => ({
      dateStr,
      items,
    }));
  }, [datedBooks]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-mono font-semibold">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Kalender Rilis &amp; Jadwal Terbit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          Jadwal Terbit Manga &amp; Light Novel
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted">
          Pantau tanggal rilis resmi komik dan light novel di Indonesia. Penerbit komik seperti Elex Media dan m&amp;c! secara rutin merilis judul baru setiap hari Rabu.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Wednesday Drop Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWednesdayOnly(!wednesdayOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
              wednesdayOnly
                ? 'bg-gold/15 text-gold border-gold/40 font-semibold'
                : 'bg-surface-raised border-border-subtle text-editorial-muted hover:text-editorial-title'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⭐ Hanya Jadwal Rabu Rilis</span>
          </button>
        </div>

        {/* Publisher & Format Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-border-subtle">
            {(['ALL', 'Manga', 'Light Novel'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(fmt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  formatFilter === fmt
                    ? 'bg-surface text-editorial-title font-semibold shadow-xs'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {fmt === 'ALL' ? 'Semua' : fmt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <select
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              className="bg-surface-raised border border-border-subtle text-editorial-body text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="ALL">Semua Penerbit</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Date Timeline Groups */}
      {groupedByDate.length === 0 ? (
        <div className="py-16 text-center bg-surface border border-border-subtle rounded-3xl space-y-2">
          <CalendarIcon className="w-8 h-8 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada jadwal rilis yang cocok</h3>
          <p className="text-xs text-editorial-muted">Coba ubah opsi &quot;Hanya Jadwal Rabu Rilis&quot; atau filter penerbit.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(({ dateStr, items }) => {
            const dayName = getDayNameWIB(dateStr);
            const isWed = dayName.toLowerCase().includes('rabu');
            return (
              <div key={dateStr} className="space-y-3">
                {/* Date Header Tag */}
                <div className="sticky top-14 z-20 py-2 bg-background/95 backdrop-blur-md flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                        isWed
                          ? 'bg-gold/15 text-gold border-gold/30'
                          : 'bg-surface-raised text-editorial-title border-border-subtle'
                      }`}
                    >
                      {formatDateWIB(dateStr)}
                    </span>
                    {dayName && (
                      <span className="text-xs font-semibold text-editorial-title">
                        {dayName} {isWed && '🔥 (Rabu Rilis)'}
                      </span>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span className="text-xs font-mono text-editorial-faint">{items.length} judul</span>
                </div>

                {/* Books for this Date */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {items.map((book) => (
                    <ReleaseCard key={book.id} book={book} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
