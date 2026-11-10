'use client';

import { useState } from 'react';
import { AnnouncementCard, type AnnouncementView } from './announcement-card';

/**
 * /radar list (Round 2 §5.4): SPOTTED records stay hidden until the
 * "Tampilkan pantauan awal & teaser" toggle is on; STALE_HOLD records
 * collapse into the "Arsip Pengumuman Lama" footer section.
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
  const [showStale, setShowStale] = useState(false);

  const visible = active.filter(
    (v) => showSpotted || v.state !== 'SPOTTED',
  );
  const spottedCount = active.filter((v) => v.state === 'SPOTTED').length;

  return (
    <div className="flex flex-col gap-8">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-300 select-none">
        <button
          type="button"
          role="switch"
          aria-checked={showSpotted}
          onClick={() => setShowSpotted((v) => !v)}
          className={`relative h-5 w-9 shrink-0 border transition-colors ${
            showSpotted ? 'border-accent bg-accent/20' : 'border-zinc-700 bg-zinc-900'
          }`}
        >
          <span
            className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${
              showSpotted ? 'left-[18px] bg-accent' : 'left-0.5 bg-zinc-500'
            }`}
          />
        </button>
        <span>
          Tampilkan pantauan awal &amp; teaser
          {spottedCount > 0 && (
            <span className="ml-2 font-mono text-xs text-zinc-500">
              ({spottedCount} judul)
            </span>
          )}
        </span>
      </label>

      {visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((v) => (
            <AnnouncementCard key={v.announcement.id} view={v} />
          ))}
        </div>
      ) : (
        <p className="border border-white/[0.06] bg-white/[0.03] px-4 py-8 text-center text-sm text-zinc-400">
          Belum ada pengumuman yang terkonfirmasi saat ini.
        </p>
      )}

      {graduated.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs uppercase tracking-wider text-zinc-500">
            Sudah Terbit
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {graduated.map((v) => (
              <AnnouncementCard key={v.announcement.id} view={v} />
            ))}
          </div>
        </section>
      )}

      {stale.length > 0 && (
        <section className="border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowStale((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            aria-expanded={showStale}
          >
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              Arsip Pengumuman Lama (&gt;18 Bulan)
            </span>
            <span className="font-mono text-xs text-zinc-500">
              {showStale ? 'Ringkas ↑' : `Lihat (${stale.length}) ↓`}
            </span>
          </button>
          {showStale && (
            <div className="grid gap-4 border-t border-white/[0.06] p-4 sm:grid-cols-2 xl:grid-cols-3">
              {stale.map((v) => (
                <AnnouncementCard key={v.announcement.id} view={v} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
