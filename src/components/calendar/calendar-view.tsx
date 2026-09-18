'use client';

import React, { useState, useMemo } from 'react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { formatDateWIB, getDayNameWIB } from '@/lib/formatters';
import { Calendar as CalendarIcon, Filter, Layers } from 'lucide-react';

interface CalendarViewProps {
  books: Book[];
  publishers: Publisher[];
}

export function CalendarView({ books, publishers }: CalendarViewProps) {
  const [pubFilter, setPubFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel' | 'Merchandise'>('ALL');

  // Filter books with release dates
  const datedBooks = useMemo(() => {
    return books
      .filter((b) => {
        if (!b.releaseDate) return false;
        if (pubFilter !== 'ALL' && b.publisherId !== pubFilter) return false;
        if (formatFilter !== 'ALL' && b.category !== formatFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.releaseDate!).getTime();
        const dateB = new Date(b.releaseDate!).getTime();
        return dateB - dateA;
      });
  }, [books, pubFilter, formatFilter]);

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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-mono font-semibold tracking-wider shadow-xs">
          <CalendarIcon className="w-3.5 h-3.5 text-accent" />
          <span>Kalender Rilis Resmi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-editorial-title">
          Jadwal Terbit Manga, Light Novel &amp; Merchandise
        </h1>
        <p className="text-xs sm:text-sm text-editorial-muted">
          Linimasa rilis resmi komik, light novel, dan official merchandise di Indonesia.
        </p>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl bg-surface border border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Format Pills */}
        <div className="flex items-center gap-1 bg-surface-raised p-1 rounded-xl border border-border-subtle overflow-x-auto">
          {(['ALL', 'Manga', 'Light Novel', 'Merchandise'] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormatFilter(fmt)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                formatFilter === fmt
                  ? 'bg-surface text-editorial-title font-semibold shadow-xs'
                  : 'text-editorial-muted hover:text-editorial-title'
              }`}
            >
              {fmt === 'ALL'
                ? 'Semua Format'
                : fmt === 'Manga'
                ? 'Manga'
                : fmt === 'Light Novel'
                ? 'Light Novel'
                : 'Merchandise'}
            </button>
          ))}
        </div>

        {/* Publisher Filter */}
        <div className="flex items-center gap-2">
          <span className="text-editorial-faint text-[11px] font-mono">Penerbit / Penyedia:</span>
          <select
            value={pubFilter}
            onChange={(e) => setPubFilter(e.target.value)}
            className="bg-surface-raised border border-border-subtle text-editorial-body text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">Semua Penerbit &amp; Penyedia</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Timeline Groups */}
      {groupedByDate.length === 0 ? (
        <div className="py-16 text-center bg-surface border border-border-subtle rounded-3xl space-y-2">
          <CalendarIcon className="w-8 h-8 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada jadwal rilis yang cocok</h3>
          <p className="text-xs text-editorial-muted">Coba ubah filter format atau penerbit untuk melihat katalog lainnya.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByDate.map(({ dateStr, items }) => {
            const dayName = getDayNameWIB(dateStr);
            return (
              <div key={dateStr} className="space-y-3">
                {/* Date Header Tag */}
                <div className="sticky top-14 z-20 py-2.5 bg-background/95 backdrop-blur-md flex items-center gap-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-surface-raised text-editorial-title border border-border-subtle">
                      {formatDateWIB(dateStr)}
                    </span>
                    {dayName && (
                      <span className="text-xs font-semibold text-editorial-muted">
                        {dayName}
                      </span>
                    )}
                  </div>
                  <div className="h-px flex-1 bg-border-subtle/50" />
                  <span className="text-xs font-mono text-editorial-faint">{items.length} judul</span>
                </div>

                {/* Books for this Date */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
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
