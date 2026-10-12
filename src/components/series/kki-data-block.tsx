'use client';

import React from 'react';
import { ExternalLink, Database } from 'lucide-react';
import type { KkiEnrichment } from '@/lib/types';

interface KkiDataBlockProps {
  enrichment: KkiEnrichment;
}

/**
 * "Data Kolektor" — community database enrichment from KKI
 * (Komunitas Kolektor Komik Indonesia).
 */
export function KkiDataBlock({ enrichment: e }: KkiDataBlockProps) {
  const rows: Array<[string, string]> = [];
  if (e.demographic) rows.push(['Demografi', e.demographic]);
  if (e.publisherJp) rows.push(['Penerbit Jepang', e.publisherJp]);
  if (e.volumesJp) rows.push(['Volume (Jepang)', e.volumesJp]);
  if (e.statusJp) rows.push(['Status (Jepang)', e.statusJp]);
  if (e.paperType) rows.push(['Jenis Kertas', e.paperType]);
  if (e.yearFirstVol) rows.push(['Vol. 1 Terbit', e.yearFirstVol]);
  const price =
    e.priceMin && e.priceMax
      ? `${e.priceMin} – ${e.priceMax}`
      : e.priceMax || e.priceMin;
  if (price) rows.push(['Rentang Harga', price]);

  if (rows.length === 0 && !e.mangaupdatesUrl) return null;

  return (
    <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 max-w-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-3.5 h-3.5 text-editorial-muted" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-editorial-muted">
          Data Kolektor
        </span>
      </div>

      {rows.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-mono uppercase tracking-wide text-editorial-faint">
                {label}
              </dt>
              <dd className="text-xs text-editorial-title font-medium truncate" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center gap-x-4 gap-y-1">
        {e.mangaupdatesUrl && (
          <a
            href={e.mangaupdatesUrl}
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
  );
}
