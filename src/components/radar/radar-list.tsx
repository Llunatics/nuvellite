'use client';

import { useState } from 'react';
import { AnnouncementCard, type AnnouncementView } from './announcement-card';

/**
 * /radar list: calm editorial feed layout.
 * Filter bar with publisher pills (left) and sleek rounded-full teaser toggle (right).
 * Items rendered inside a seamless divide-y editorial container without heavy box cages.
 */
export function RadarList({
  active,
  stale,
  graduated,
}: {
  active: AnnouncementView[];
  stale: AnnouncementView[];
  graduated: AnnouncementView[];
}) {
  const [showSpotted, setShowSpotted] = useState(false);
  const [pubFilter, setPubFilter] = useState<'ALL' | 'pub_pgi' | 'pub_mnc' | 'pub_elex'>('ALL');
  const [showStale, setShowStale] = useState(false);

  const spottedCount = active.filter((v) => v.state === 'SPOTTED').length;

  const filterItems = (list: AnnouncementView[]) =>
    list.filter((v) => {
      if (!showSpotted && v.state === 'SPOTTED') return false;
      if (pubFilter !== 'ALL' && v.announcement.publisherId !== pubFilter) return false;
      return true;
    });

  const visible = filterItems(active);
  const visibleGraduated = filterItems(graduated);
  const visibleStale = filterItems(stale);

  return (
    <div className="flex flex-col gap-8">
      {/* Controls Bar: Publisher Filter Pills (Left) + Teaser Toggle Pill (Right) */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-y border-white/[0.06]">
        {/* Left side: subtle publisher filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'pub_pgi', label: 'PGI' },
            { id: 'pub_mnc', label: 'm&c!' },
            { id: 'pub_elex', label: 'Elex Media' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPubFilter(p.id as any)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                pubFilter === p.id
                  ? 'bg-accent text-zinc-950 font-semibold shadow-xs'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-editorial-body hover:text-editorial-title'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Right side: sleek rounded-full teaser toggle pill button */}
        <button
          type="button"
          role="switch"
          aria-checked={showSpotted}
          onClick={() => setShowSpotted((v) => !v)}
          className={`inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
            showSpotted
              ? 'border-accent/40 bg-accent/10 text-editorial-title'
              : 'border-white/[0.07] bg-white/[0.03] text-editorial-body hover:text-editorial-title'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full transition-colors ${
              showSpotted ? 'bg-accent' : 'bg-white/25'
            }`}
          />
          <span>Pantauan awal &amp; teaser</span>
          {spottedCount > 0 && (
            <span className="font-mono text-[11px] text-editorial-muted">
              ({spottedCount})
            </span>
          )}
        </button>
      </div>

      {/* Main Announcement Feed (Calm Editorial Feed Container) */}
      {visible.length > 0 ? (
        <div className="divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-surface/50 backdrop-blur-xl px-5 sm:px-8">
          {visible.map((v) => (
            <AnnouncementCard key={v.announcement.id} view={v} />
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-white/[0.06] bg-surface/50 backdrop-blur-xl px-6 py-12 text-center text-sm text-editorial-muted">
          Belum ada pengumuman yang sesuai dengan filter saat ini.
        </p>
      )}

      {/* Graduated Section ("Sudah Terbit") */}
      {visibleGraduated.length > 0 && (
        <section className="flex flex-col gap-3 pt-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-editorial-muted">
            Sudah Terbit
          </h2>
          <div className="divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-surface/50 backdrop-blur-xl px-5 sm:px-8">
            {visibleGraduated.map((v) => (
              <AnnouncementCard key={v.announcement.id} view={v} />
            ))}
          </div>
        </section>
      )}

      {/* Stale Section ("Arsip Pengumuman Lama") */}
      {stale.length > 0 && (
        <section className="rounded-3xl border border-white/[0.06] bg-surface/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowStale((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
            aria-expanded={showStale}
          >
            <span className="font-mono text-xs uppercase tracking-wider text-editorial-muted">
              Arsip Pengumuman Lama (&gt;18 Bulan)
            </span>
            <span className="font-mono text-xs text-editorial-muted">
              {showStale ? 'Ringkas ↑' : `Lihat (${stale.length}) ↓`}
            </span>
          </button>
          {showStale && (
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06] px-5 sm:px-8">
              {visibleStale.map((v) => (
                <AnnouncementCard key={v.announcement.id} view={v} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
