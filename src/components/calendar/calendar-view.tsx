'use client';

import React, { useState, useMemo } from 'react';
import { Book, Publisher } from '@/lib/types';
import { ReleaseCard } from '@/components/books/release-card';
import { formatDateWIB, getDayNameWIB } from '@/lib/formatters';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';

interface CalendarViewProps {
  books: Book[];
  publishers: Publisher[];
}

export function CalendarView({ books, publishers }: CalendarViewProps) {
  const [pubFilter, setPubFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');
  const [timeHorizon, setTimeHorizon] = useState<'ALL' | 'THIS_WEEK' | 'THIS_MONTH' | 'WEDNESDAY'>('ALL');

  // Filter books with release dates
  const datedBooks = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return books
      .filter((b) => {
        if (!b.releaseDate) return false;
        if (pubFilter !== 'ALL' && b.publisherId !== pubFilter) return false;
        if (formatFilter !== 'ALL' && b.category !== formatFilter) return false;

        if (timeHorizon === 'WEDNESDAY' && !b.isWednesdayRelease) return false;

        const relDate = new Date(b.releaseDate);
        if (timeHorizon === 'THIS_WEEK') {
          if (relDate < startOfWeek || relDate > endOfWeek) return false;
        } else if (timeHorizon === 'THIS_MONTH') {
          if (relDate.getMonth() !== currentMonth || relDate.getFullYear() !== currentYear) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.releaseDate!).getTime();
        const dateB = new Date(b.releaseDate!).getTime();
        return dateB - dateA;
      });
  }, [books, pubFilter, formatFilter, timeHorizon]);

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
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl liquid-glass shadow-xl border border-white/5 space-y-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-chip text-slate-200 text-xs font-mono font-semibold tracking-wider">
            <CalendarIcon className="w-3.5 h-3.5 text-accent" />
            <span>RADAR RILIS RESMI</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-editorial text-editorial-title tracking-tight">
            Kalender &amp; Linimasa Rilis Indonesia
          </h1>
          <p className="text-xs sm:text-sm text-editorial-muted max-w-2xl leading-relaxed">
            Pantau jadwal resmi komik dan light novel setiap minggunya, termasuk tradisi Rabu Rilis Komik Indonesia dari Elex Media, m&amp;c!, dan PGI.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-white/5">
          {/* Time Horizon Filter Chips */}
          <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-xl liquid-glass">
            {[
              { id: 'ALL', label: 'Semua Linimasa' },
              { id: 'WEDNESDAY', label: '★ Rabu Rilis Radar' },
              { id: 'THIS_WEEK', label: 'Minggu Ini' },
              { id: 'THIS_MONTH', label: 'Bulan Ini' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeHorizon(t.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs ${
                  timeHorizon === t.id
                    ? t.id === 'WEDNESDAY'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold shadow-xs'
                      : 'bg-accent text-white font-semibold shadow-xs'
                    : 'text-editorial-muted hover:text-editorial-title'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Format & Publisher Filters */}
          <div className="flex items-center gap-2">
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl liquid-glass text-editorial-title focus:outline-none text-xs"
            >
              <option value="ALL">Semua Format</option>
              <option value="Manga">Manga</option>
              <option value="Light Novel">Light Novel</option>
            </select>

            <select
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl liquid-glass text-editorial-title focus:outline-none text-xs"
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
        <div className="py-20 text-center rounded-3xl liquid-glass space-y-3">
          <CalendarIcon className="w-10 h-10 text-editorial-faint mx-auto" />
          <h3 className="text-sm font-semibold text-editorial-title">Tidak ada jadwal rilis yang cocok</h3>
          <p className="text-xs text-editorial-muted">Coba ubah filter format, periode waktu, atau penerbit.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedByDate.map(({ dateStr, items }) => {
            const dayName = getDayNameWIB(dateStr);
            const isWed = items[0]?.isWednesdayRelease;
            return (
              <div key={dateStr} className="space-y-4">
                {/* Date Header Strip */}
                <div className="sticky top-16 z-20 py-2.5 px-4 rounded-2xl floating-nav flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-editorial-title">
                      {formatDateWIB(dateStr)}
                    </span>
                    {dayName && (
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isWed
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-white/5 text-editorial-muted'
                        }`}
                      >
                        {dayName} {isWed ? '★ Rabu Rilis' : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-editorial-faint font-semibold">
                    {items.length} judul rilis
                  </span>
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
