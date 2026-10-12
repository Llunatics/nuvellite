'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CoverImage } from '../books/cover-image';
import type { KkiArchiveEntry } from '@/lib/types';
import { Archive, Search, X, ChevronDown, BookOpen } from 'lucide-react';

interface ArchiveDirectoryViewProps {
  entries: KkiArchiveEntry[];
  publishers: string[];
}

function CoverThumb({ entry }: { entry: KkiArchiveEntry }) {
  const cover = entry.mu?.status === 'ok' ? entry.mu.cover : undefined;
  return (
    <div className="relative shrink-0 aspect-[3/4.2] rounded-xl overflow-hidden bg-surface-sunken cover-depth w-20 sm:w-24">
      {cover ? (
        <CoverImage
          src={cover}
          alt={entry.title}
          width={120}
          height={160}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          fallbackIconClassName="w-6 h-6 text-editorial-faint"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-elevated/40">
          <span className="font-editorial text-2xl text-editorial-faint">
            {entry.title.charAt(0).toUpperCase()}
          </span>
          <span className="text-[9px] text-editorial-muted line-clamp-2 mt-1">{entry.title}</span>
        </div>
      )}
      <div className="absolute top-1.5 left-1.5">
        <span
          className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 ${
            entry.medium === 'LIGHT_NOVEL' ? 'text-amber-300' : 'text-sky-300'
          }`}
        >
          {entry.medium === 'LIGHT_NOVEL' ? 'LN' : 'Manga'}
        </span>
      </div>
    </div>
  );
}

export function ArchiveDirectoryView({ entries, publishers }: ArchiveDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mediumFilter, setMediumFilter] = useState<'ALL' | 'MANGA' | 'LIGHT_NOVEL'>('ALL');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'year_desc' | 'year_asc'>('name');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return entries
      .filter((e) => {
        if (mediumFilter !== 'ALL' && e.medium !== mediumFilter) return false;
        if (pubFilter !== 'ALL' && e.publisherId !== pubFilter) return false;
        if (q) {
          const hay = `${e.title} ${e.author || ''} ${e.publisherId || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'year_desc') return (b.yearFirstVol || '').localeCompare(a.yearFirstVol || '');
        if (sortBy === 'year_asc') return (a.yearFirstVol || '').localeCompare(b.yearFirstVol || '');
        return a.title.localeCompare(b.title);
      });
  }, [entries, searchQuery, mediumFilter, pubFilter, sortBy]);

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      {/* 1. Header */}
      <section className="space-y-3 pt-2 sm:pt-4 border-b border-white/[0.04] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
          <Archive className="w-3 h-3 text-accent shrink-0" />
          <span>Arsip — tidak tersedia di Gramedia</span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
          Arsip Komik Indonesia.
        </h1>

        <p className="text-sm text-editorial-body leading-relaxed max-w-2xl font-sans">
          Seri manga &amp; light novel yang pernah terbit di Indonesia namun{' '}
          <span className="text-editorial-title font-medium">tidak terdata di katalog Gramedia</span>{' '}
          — kebanyakan terbitan lama atau sudah out-of-print. Data bersumber dari{' '}
          <span className="text-editorial-title font-medium">Database Komunitas Kolektor Komik Indonesia</span>,
          diperbarui berkala oleh komunitas.
        </p>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-editorial-muted">
          <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {entries.length} seri arsip
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {entries.filter((e) => e.medium === 'MANGA').length} manga
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {entries.filter((e) => e.medium === 'LIGHT_NOVEL').length} light novel
          </span>
        </div>
      </section>

      {/* 2. Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-editorial-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul seri arsip..."
            className="w-full h-10 pl-10 pr-9 rounded-full bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.06] border border-white/[0.06] focus:border-white/[0.15] text-editorial-title placeholder:text-editorial-faint focus:outline-none transition-all text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-editorial-faint hover:text-editorial-title p-1"
              aria-label="Hapus kata kunci"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="relative">
            <select
              value={mediumFilter}
              onChange={(e) => setMediumFilter(e.target.value as any)}
              className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
            >
              <option value="ALL" className="bg-surface text-editorial-title">Semua Media</option>
              <option value="MANGA" className="bg-surface text-editorial-title">Manga</option>
              <option value="LIGHT_NOVEL" className="bg-surface text-editorial-title">Light Novel</option>
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
                <option key={p} value={p} className="bg-surface text-editorial-title">
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
            >
              <option value="name" className="bg-surface text-editorial-title">Judul (A-Z)</option>
              <option value="year_desc" className="bg-surface text-editorial-title">Tahun Terbaru</option>
              <option value="year_asc" className="bg-surface text-editorial-title">Tahun Terlama</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Entry list */}
      <section className="space-y-3">
        <p className="text-[11px] font-mono text-editorial-muted">
          Menampilkan {filtered.length} dari {entries.length} seri
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.slice(0, 300).map((e) => (
            <Link
              key={e.id}
              href={`/arsip/${e.slug}`}
              className="group flex gap-3.5 p-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.045] hover:border-white/[0.12] transition-all"
            >
              <CoverThumb entry={e} />
              <div className="flex-1 min-w-0 py-0.5">
                <h3 className="text-sm font-medium text-editorial-title leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                  {e.title}
                </h3>
                {e.author && (
                  <p className="text-[11px] text-editorial-muted mt-1 truncate">{e.author}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[10px] font-mono text-editorial-faint">
                  {e.publisherId && <span>{e.publisherId}</span>}
                  {e.yearFirstVol && <span>• {e.yearFirstVol}</span>}
                  {e.volumesId && <span>• {e.volumesId} vol</span>}
                  {e.statusId && <span>• {e.statusId}</span>}
                </div>
                {e.demographic && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase border border-white/[0.08] bg-white/[0.03] text-editorial-muted">
                    {e.demographic}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
        {filtered.length > 300 && (
          <p className="text-[11px] font-mono text-editorial-faint text-center pt-2 flex items-center justify-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            {filtered.length - 300} seri lainnya — persempit dengan pencarian atau filter
          </p>
        )}
        {filtered.length === 0 && (
          <p className="text-sm text-editorial-muted text-center py-10">
            Tidak ada seri arsip yang cocok.
          </p>
        )}
      </section>
    </div>
  );
}
