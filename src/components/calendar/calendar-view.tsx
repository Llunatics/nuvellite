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
    <div className="space-y-12 pb-16">
      {/* 1. Header Banner */}
      <section className="space-y-3 pt-2 sm:pt-4 border-b border-white/[0.04] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
          <CalendarIcon className="w-3.5 h-3.5 text-accent" />
          <span>Radar Rilis Resmi</span>
          <span className="text-white/20">•</span>
          <span>{datedBooks.length.toLocaleString('id-ID')} Rilisan Terjadwal</span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
          Kalender &amp; Linimasa Rilis.
        </h1>

        <p className="text-sm text-editorial-body leading-relaxed max-w-2xl font-sans">
          Pantau jadwal resmi komik dan light novel mingguan di Indonesia. Ikuti tradisi Rabu Rilis Resmi
          dari Elex Media Komputindo, m&amp;c!, dan Phoenix Gramedia Indonesia.
        </p>
      </section>

      {/* 2. Timeline Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Time Horizon Segmented Pills */}
        <div className="flex flex-wrap items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
          {[
            { id: 'ALL', label: 'Semua Linimasa' },
            { id: 'WEDNESDAY', label: '★ Rabu Rilis' },
            { id: 'THIS_WEEK', label: 'Minggu Ini' },
            { id: 'THIS_MONTH', label: 'Bulan Ini' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeHorizon(t.id as any)}
              className={`px-3.5 py-1 rounded-full font-medium transition-all text-xs ${
                timeHorizon === t.id
                  ? t.id === 'WEDNESDAY'
                    ? 'bg-amber-400/20 text-amber-300 font-semibold shadow-xs'
                    : 'bg-white/[0.1] text-editorial-title font-semibold shadow-xs'
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
            className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer"
          >
            <option value="ALL" className="bg-surface text-editorial-title">Semua Format</option>
            <option value="Manga" className="bg-surface text-editorial-title">Manga</option>
            <option value="Light Novel" className="bg-surface text-editorial-title">Light Novel</option>
          </select>

          <select
            value={pubFilter}
            onChange={(e) => setPubFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer"
          >
            <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
            {publishers.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                {p.shortName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Magazine Date Timeline Groups */}
      {groupedByDate.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
          <CalendarIcon className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
          <h3 className="text-sm font-medium text-editorial-title">Tidak ada jadwal rilis yang sesuai</h3>
          <p className="text-xs text-editorial-muted">Coba ubah filter periode waktu, format, atau penerbit.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {groupedByDate.map(({ dateStr, items }) => {
            const dayName = getDayNameWIB(dateStr);
            const isWed = items[0]?.isWednesdayRelease;
            return (
              <div key={dateStr} className="space-y-6">
                {/* Floating Date Header Pill */}
                <div className="sticky top-16 z-20 py-2 px-4 rounded-full liquid-glass-pill flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-editorial-title">
                      {formatDateWIB(dateStr)}
                    </span>
                    {dayName && (
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                          isWed
                            ? 'bg-amber-400/20 text-amber-300 font-semibold'
                            : 'bg-white/[0.06] text-editorial-muted'
                        }`}
                      >
                        {dayName} {isWed ? '★ Rabu Rilis' : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-editorial-faint">
                    {items.length} judul
                  </span>
                </div>

                {/* Bookshelf for this Date */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
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
