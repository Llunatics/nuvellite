'use client';

import React from 'react';
import Link from 'next/link';
import { CoverImage } from '../books/cover-image';
import type { Series } from '@/lib/types';
import { Archive, ArrowLeft, ExternalLink, Languages, ShoppingBag } from 'lucide-react';

interface ArchiveSeriesDetailProps {
  series: Series;
}

/**
 * Detail view for KKI archive entries inside the unified /series/[slug] route.
 * The "Beli di Gramedia" button is intentionally DISABLED — archive titles
 * are not listed on gramedia.com.
 */
export function ArchiveSeriesDetail({ series }: ArchiveSeriesDetailProps) {
  const entry = series.archiveEntry;
  const cover = series.coverImage;
  const synopsisId = entry?.mu?.descriptionId;
  const synopsisEn = entry?.mu?.descriptionEn;

  const facts: Array<[string, string | null | undefined]> = [
    ['Pengarang', series.author],
    ['Ilustrator', series.illustrator],
    ['Penerbit Indonesia', series.publisherName],
    ['Demografi', entry?.demographic],
    ['Volume (INA)', entry?.volumesId ? `${entry.volumesId} vol` : null],
    ['Status (INA)', entry?.statusId],
    ['Vol. 1 Terbit', entry?.yearFirstVol],
    ['Jenis Kertas', entry?.paperType],
    [
      'Rentang Harga',
      entry?.priceMin && entry?.priceMax
        ? `${entry.priceMin} – ${entry.priceMax}`
        : entry?.priceMax || entry?.priceMin,
    ],
    ['Penerbit Jepang', entry?.publisherJp],
    ['Volume (Jepang)', entry?.volumesJp],
    ['Status (Jepang)', entry?.statusJp],
  ];

  return (
    <div className="space-y-6 pb-16">
      <div>
        <Link
          href="/series"
          className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Direktori Seri</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        {/* Cover */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="relative w-48 sm:w-56 aspect-[3/4.2] rounded-2xl overflow-hidden bg-surface-sunken cover-depth">
            {cover ? (
              <CoverImage
                src={cover}
                alt={series.name}
                width={224}
                height={298}
                imgClassName="w-full h-full object-cover"
                fallbackIconClassName="w-8 h-8 text-editorial-faint"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-5 text-center bg-gradient-to-br from-amber-500/[0.08] via-white/[0.04] to-white/[0.01]">
                <span className="font-editorial text-6xl text-editorial-muted leading-none">
                  {series.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <span className="text-[11px] text-editorial-muted line-clamp-3 mt-3 leading-snug">
                  {series.name}
                </span>
                {series.author && (
                  <span className="text-[10px] text-editorial-faint truncate mt-1 max-w-full">
                    {series.author}
                  </span>
                )}
              </div>
            )}
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 text-amber-300">
                Arsip
              </span>
            </div>
          </div>

          {/* Disabled Gramedia button — archive titles are not on gramedia.com */}
          <div className="mt-4 w-full max-w-[224px]">
            <button
              type="button"
              disabled
              title="Judul arsip ini tidak tersedia di Gramedia.com"
              aria-disabled="true"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full text-xs font-medium bg-white/[0.06] text-editorial-faint border border-white/[0.08] cursor-not-allowed opacity-60 select-none"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Beli di Gramedia.com</span>
            </button>
            <p className="mt-2 text-[10px] font-mono text-editorial-faint text-center leading-relaxed">
              Tidak tersedia di Gramedia
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-5 min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[10px] uppercase font-semibold">
                <Archive className="w-3 h-3" /> Arsip — tidak tersedia di Gramedia
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-semibold border ${
                  series.type === 'LIGHT_NOVEL'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                }`}
              >
                {series.type === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-editorial font-normal text-editorial-title tracking-tight leading-[1.15]">
              {series.name}
            </h1>

            {series.author && (
              <p className="text-xs text-editorial-muted mt-2 font-sans">
                Pengarang: <span className="text-editorial-title font-medium">{series.author}</span>
              </p>
            )}

            {/* Synopsis */}
            {(synopsisId || synopsisEn) && (
              <div className="mt-4 max-w-2xl">
                {synopsisId ? (
                  <>
                    <p className="text-xs sm:text-sm text-editorial-body/90 leading-relaxed font-sans whitespace-pre-line">
                      {synopsisId}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono text-editorial-faint">
                      <Languages className="w-3 h-3" />
                      Diterjemahkan otomatis dari MangaUpdates
                    </p>
                  </>
                ) : (
                  <p className="text-xs sm:text-sm text-editorial-body/90 leading-relaxed font-sans whitespace-pre-line">
                    {synopsisEn}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Facts */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 max-w-2xl">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
              {facts
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-wide text-editorial-faint">
                      {label}
                    </dt>
                    <dd className="text-xs text-editorial-title font-medium truncate" title={value as string}>
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center gap-x-4 gap-y-1">
              {entry?.mangaupdatesUrl && (
                <a
                  href={entry.mangaupdatesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-sky-300/90 hover:text-sky-200 transition-colors"
                >
                  MangaUpdates <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <span className="text-[10px] text-editorial-faint font-mono">
                Sumber: Database Komunitas Kolektor Komik Indonesia
              </span>
            </div>
          </div>

          {entry?.notes && (
            <p className="text-[11px] text-editorial-muted max-w-2xl font-sans">
              <span className="font-mono text-editorial-faint uppercase text-[10px]">Catatan: </span>
              {entry.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
