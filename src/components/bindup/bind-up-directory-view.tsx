'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CoverImage } from '../books/cover-image';
import type { BindUpSeriesGroup } from '@/lib/data/bind-up';
import type { Publisher } from '@/lib/types';
import { BookCopy, Search, X, ChevronDown, ChevronRight, Layers } from 'lucide-react';

interface BindUpDirectoryViewProps {
  groups: BindUpSeriesGroup[];
  publishers: Publisher[];
}

function LabelPill({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase whitespace-nowrap border border-white/[0.08] bg-white/[0.03] text-lime-300/90 ${className}`}
    >
      {label}
    </span>
  );
}

function CoverThumb({
  group,
  className,
  iconClassName,
}: {
  group: BindUpSeriesGroup;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={`relative shrink-0 aspect-[3/4.2] rounded-xl overflow-hidden bg-surface-sunken cover-depth ${className}`}>
      {group.coverImage ? (
        <CoverImage
          src={group.coverImage}
          alt={group.displayName}
          width={176}
          height={234}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          fallbackIconClassName={iconClassName}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-surface-elevated/40">
          <BookCopy className={`${iconClassName} text-editorial-faint mb-1`} />
          <span className="text-[9px] text-editorial-muted line-clamp-2">{group.displayName}</span>
        </div>
      )}
    </div>
  );
}

export function BindUpDirectoryView({ groups, publishers }: BindUpDirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pubFilter, setPubFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'volumes_high' | 'latest'>('name');

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return groups
      .filter((g) => {
        if (pubFilter !== 'ALL' && g.publisherId !== pubFilter) return false;
        if (q) {
          const hay = `${g.displayName} ${g.publisherName} ${g.label}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'volumes_high') return b.volumeCount - a.volumeCount;
        if (sortBy === 'latest') {
          return (b.latestReleaseDate || '').localeCompare(a.latestReleaseDate || '');
        }
        return a.displayName.localeCompare(b.displayName);
      });
  }, [groups, searchQuery, pubFilter, sortBy]);

  const totalBooks = groups.reduce((n, g) => n + g.volumeCount, 0);

  return (
    <div className="space-y-10 sm:space-y-12 pb-16">
      {/* 1. Header */}
      <section className="space-y-3 pt-2 sm:pt-4 border-b border-white/[0.04] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-editorial-muted text-[11px] font-mono">
          <BookCopy className="w-3 h-3 text-accent shrink-0" />
          <span>Edisi Bind-Up &amp; Omnibus</span>
        </div>

        <h1 className="font-editorial text-3xl sm:text-5xl font-normal text-editorial-title tracking-tight leading-[1.1]">
          Bind-Up &amp; Omnibus Indonesia.
        </h1>

        <p className="text-sm text-editorial-body leading-relaxed max-w-2xl font-sans">
          Beberapa volume original digabung dalam satu buku tebal — hemat rak, hemat kantong.
          Direktori ini <span className="text-editorial-title font-medium">terdeteksi otomatis</span>: setiap ada
          rilisan bind-up baru dari Elex Media, m&amp;c!, atau Phoenix Gramedia Indonesia, ia langsung
          masuk ke sini tanpa perlu didaftarkan manual.
        </p>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-editorial-muted">
          <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {groups.length} seri
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
            {totalBooks} buku
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
            placeholder="Cari judul seri bind-up..."
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

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="relative">
            <select
              value={pubFilter}
              onChange={(e) => setPubFilter(e.target.value)}
              className="w-full h-full py-2 pl-3.5 pr-8 rounded-full bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] text-editorial-title focus:outline-none text-xs cursor-pointer appearance-none truncate"
            >
              <option value="ALL" className="bg-surface text-editorial-title">Semua Penerbit</option>
              {publishers.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface text-editorial-title">
                  {p.shortName || p.name}
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
              <option value="volumes_high" className="bg-surface text-editorial-title">Vol. Terbanyak</option>
              <option value="latest" className="bg-surface text-editorial-title">Rilis Terbaru</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-editorial-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Directory list */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-white/[0.02] border border-white/[0.04] space-y-3">
          <BookCopy className="w-10 h-10 text-editorial-faint mx-auto stroke-1" />
          <h3 className="text-sm font-medium text-editorial-title">Tidak ada edisi bind-up yang sesuai</h3>
          <p className="text-xs text-editorial-muted">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-editorial-faint">
            Semua seri
          </p>
          <div className="rounded-3xl border border-white/[0.04] bg-white/[0.015] divide-y divide-white/[0.04] overflow-hidden">
            {filtered.map((group) => {
              const href = group.seriesSlug ? `/series/${group.seriesSlug}` : undefined;
              const row = (
                <div className="group flex items-center gap-3.5 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
                  <CoverThumb group={group} className="w-11 sm:w-12 !rounded-lg" iconClassName="w-5 h-5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-editorial-title truncate">
                      {group.displayName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-1.5">
                      <LabelPill label={group.label} />
                      <span className="text-[11px] font-mono text-editorial-muted">
                        {group.volumeCount} vol
                      </span>
                      <span className="text-[11px] text-editorial-faint">·</span>
                      <span className="text-[11px] text-editorial-muted truncate">
                        {group.publisherShortName}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-editorial-faint group-hover:text-editorial-title group-hover:translate-x-0.5 transition-all" />
                </div>
              );
              return href ? (
                <Link key={group.key} href={href} className="block">
                  {row}
                </Link>
              ) : (
                <div key={group.key}>{row}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. How it works */}
      <section className="rounded-3xl bg-white/[0.02] border border-white/[0.04] p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 text-editorial-title">
          <Layers className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-medium">Cara kerja deteksi otomatis</h2>
        </div>
        <p className="text-xs text-editorial-body leading-relaxed font-sans max-w-3xl">
          Setiap buku yang masuk katalog dipindai polanya — <span className="font-mono">bind up</span>,{' '}
          <span className="font-mono">omnibus</span>, <span className="font-mono">complete edition</span>,{' '}
          <span className="font-mono">ultimate</span>, <span className="font-mono">2-in-1 / 3-in-1</span>,{' '}
          <span className="font-mono">trilogi</span>, dan <span className="font-mono">edisi koleksi</span>.
          Begitu penerbit merilis edisi bind-up baru, ia otomatis terflag dan muncul di direktori ini pada
          sinkronisasi berikutnya. Edisi bundel biasa (complete set / box set) dan cetak ulang premium
          sengaja tidak dihitung sebagai bind-up.
        </p>
      </section>
    </div>
  );
}
