'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Book, Publisher } from '@/lib/types';
import { CoverImage } from '@/components/books/cover-image';
import { formatDateWIB, getDayNameWIB } from '@/lib/formatters';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface CalendarViewProps {
  books: Book[];
  publishers: Publisher[];
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayKey(): string {
  const n = new Date();
  return toKey(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Nearest date (preferring future) that has releases, for the initial selection. */
function nearestReleaseDay(datedByDay: Map<string, Book[]>): string {
  const t = todayKey();
  if (datedByDay.has(t)) return t;
  let future: string | null = null;
  let past: string | null = null;
  for (const k of datedByDay.keys()) {
    if (k > t && (future === null || k < future)) future = k;
    if (k < t && (past === null || k > past)) past = k;
  }
  return future ?? past ?? t;
}

export function CalendarView({ books, publishers }: CalendarViewProps) {
  const [pubFilter, setPubFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'Manga' | 'Light Novel'>('ALL');

  // All dated books, grouped by YYYY-MM-DD (filters applied).
  const datedByDay = useMemo(() => {
    const map = new Map<string, Book[]>();
    for (const b of books) {
      if (!b.releaseDate) continue;
      if (pubFilter !== 'ALL' && b.publisherId !== pubFilter) continue;
      if (formatFilter !== 'ALL' && b.category !== formatFilter) continue;
      const key = b.releaseDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    }
    return map;
  }, [books, pubFilter, formatFilter]);

  const initial = useMemo(() => nearestReleaseDay(datedByDay), [datedByDay]);
  const [selected, setSelected] = useState<string>(initial);
  const [viewYear, setViewYear] = useState(() => Number(initial.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(initial.slice(5, 7)) - 1);

  // Keep selection/month in sync when filters change the available days.
  const selectedBooks = datedByDay.get(selected) ?? [];

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(toKey(viewYear, viewMonth, d));
    return arr;
  }, [viewYear, viewMonth]);

  const goMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const goToday = () => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    const t = todayKey();
    setSelected(datedByDay.has(t) ? t : nearestReleaseDay(datedByDay));
  };

  const tKey = todayKey();
  const selDayName = getDayNameWIB(selected);

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* 1. Header */}
      <section className="space-y-3 pt-2 sm:pt-4 border-b border-white/[0.04] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
          <CalendarIcon className="w-3 h-3 text-accent shrink-0" />
          <span>Radar Rilis</span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
          Kalender Rilis.
        </h1>

        <p className="text-sm text-editorial-body leading-relaxed max-w-2xl font-sans">
          Jadwal terbit komik dan light novel di Indonesia dari Elex Media Komputindo,
          m&amp;c!, dan Phoenix Gramedia Indonesia. Tanggal bertitik punya rilisan —
          ketuk tanggalnya untuk melihat daftarnya.
        </p>
      </section>

      {/* 2. Controls */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Bulan sebelumnya"
              className="p-2 rounded-full text-editorial-muted hover:text-editorial-title hover:bg-white/[0.05] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-editorial text-lg sm:text-xl text-editorial-title min-w-[10rem] text-center">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Bulan berikutnya"
              className="p-2 rounded-full text-editorial-muted hover:text-editorial-title hover:bg-white/[0.05] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={goToday}
            className="px-3.5 py-1.5 rounded-full text-[11px] font-mono border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-editorial-muted hover:text-editorial-title transition-colors"
          >
            Hari ini
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="relative">
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as any)}
              className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
            >
              <option value="ALL" className="bg-surface text-editorial-title">Semua Format</option>
              <option value="Manga" className="bg-surface text-editorial-title">Manga</option>
              <option value="Light Novel" className="bg-surface text-editorial-title">Light Novel</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
            >
              <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                  {p.shortName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Month grid */}
      <section className="rounded-3xl border border-white/[0.04] bg-white/[0.015] p-3 sm:p-5">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-2 text-center text-[10px] font-mono uppercase tracking-widest text-editorial-faint"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`blank-${i}`} />;
            const dayBooks = datedByDay.get(key);
            const has = !!dayBooks?.length;
            const isToday = key === tKey;
            const isSel = key === selected;
            const dayNum = Number(key.slice(8, 10));
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={`${dayNum} ${MONTHS[viewMonth]}${has ? `, ${dayBooks!.length} rilisan` : ''}`}
                className={`relative flex flex-col items-center justify-start rounded-xl sm:rounded-2xl py-2 sm:py-2.5 min-h-[3.25rem] sm:min-h-[4rem] border transition-all duration-150 ${
                  isSel
                    ? 'bg-white/[0.08] border-white/[0.16]'
                    : has
                      ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1]'
                      : 'bg-transparent border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-mono w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${
                    isToday
                      ? 'bg-accent text-black font-semibold'
                      : has
                        ? 'text-editorial-title'
                        : 'text-editorial-faint'
                  }`}
                >
                  {dayNum}
                </span>
                <span className="flex items-center justify-center gap-1 h-2 mt-1">
                  {dayBooks?.slice(0, 3).map((b) => (
                    <span
                      key={b.id}
                      className={`w-1.5 h-1.5 rounded-full ${
                        b.category === 'Light Novel' ? 'bg-amber-300' : 'bg-lime-300'
                      }`}
                    />
                  ))}
                  {dayBooks && dayBooks.length > 3 && (
                    <span className="text-[8px] font-mono text-editorial-faint leading-none">
                      +{dayBooks.length - 3}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 pt-3 px-1 text-[10px] font-mono text-editorial-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-300" /> Manga
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" /> Light Novel
          </span>
        </div>
      </section>

      {/* 4. Selected date releases */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-editorial text-xl sm:text-2xl text-editorial-title">
            {formatDateWIB(selected)}
            {selDayName && (
              <span className="text-editorial-faint text-base sm:text-lg"> · {selDayName}</span>
            )}
          </h3>
          <span className="text-[11px] font-mono text-editorial-faint shrink-0">
            {selectedBooks.length} judul
          </span>
        </div>

        {selectedBooks.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
            <BookOpen className="w-8 h-8 text-editorial-faint mx-auto stroke-1" />
            <p className="text-xs text-editorial-muted">
              Tidak ada rilisan pada tanggal ini. Ketuk tanggal bertitik di kalender.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/[0.04] bg-white/[0.015] divide-y divide-white/[0.04] overflow-hidden">
            {selectedBooks.map((book) => (
              <Link key={book.id} href={`/books/${book.slug}`} className="block group">
                <div className="flex items-center gap-3.5 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
                  <div className="relative w-11 sm:w-12 shrink-0 aspect-[3/4.2] rounded-lg overflow-hidden bg-surface-sunken cover-depth">
                    {book.coverImage ? (
                      <CoverImage
                        src={book.coverImage}
                        alt={book.title}
                        width={96}
                        height={128}
                        imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                        fallbackIconClassName="w-5 h-5 text-editorial-faint"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-elevated/40">
                        <BookOpen className="w-5 h-5 text-editorial-faint" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-editorial-title truncate">
                      {book.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-1.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase whitespace-nowrap border border-white/[0.08] bg-white/[0.03] ${
                          book.category === 'Light Novel' ? 'text-amber-300/90' : 'text-lime-300/90'
                        }`}
                      >
                        {book.category === 'Light Novel' ? 'LN' : 'Manga'}
                      </span>
                      <span className="text-[11px] text-editorial-muted truncate">
                        {book.publisherShortName}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-editorial-faint group-hover:text-editorial-title group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
