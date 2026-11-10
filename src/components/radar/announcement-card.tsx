'use client';

import React, { useState } from 'react';
import { CoverImage } from '@/components/books/cover-image';
import type { AnnouncementVerificationState, PublisherAnnouncement } from '@/lib/types';

export interface AnnouncementView {
  announcement: PublisherAnnouncement;
  state: AnnouncementVerificationState;
  badgeLabel: string;
  badgeClassName: string;
}

const MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatDateId(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getUTCDate()} ${MONTHS_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatSourceShortLabel(source: { sourceLabel: string; isProfileFallbackUrl?: boolean }): string {
  let label = source.sourceLabel || 'Sumber';
  label = label.replace(/\s*\(Profil Resmi.*?\)/i, '').trim();

  if (/kaori/i.test(label)) return 'KAORI Nusantara';
  if (/nippon club/i.test(label)) return 'Nippon Club';
  if (/comifuro.*(?:slide|panel)/i.test(label)) return 'Panel Comifuro 23';
  if (/rekap.*comifuro/i.test(label)) return 'Rekap Komunitas CF23';
  if (/m&c!.*pdkt/i.test(label)) return 'm&c! PDKT (@mncgramedia)';
  if (/pgi.*situs|pgi.*official|phoenixgramedia/i.test(label)) return 'PGI Official';
  if (/gramedia blog/i.test(label)) return 'Gramedia Blog';
  if (/elex media.*teaser|carousel teaser/i.test(label)) return 'Elex Media Teaser';
  if (/perpusnas/i.test(label)) return 'Perpusnas ISBN';

  if (label.length > 28) {
    const parts = label.split(/—|-|\|/);
    if (parts[0].trim().length >= 4) return parts[0].trim();
    return label.slice(0, 26) + '…';
  }
  return label;
}

export function cleanExpectedDate(raw?: string): string {
  if (!raw) return 'Segera';
  let cleaned = raw.replace(/^Pre-order\s+(?:Special\s+Set\s+)?(?:\d+[–\-]\d+\s+)?/i, '').trim();
  cleaned = cleaned.replace(/^Pre-order\s+/i, '').trim();
  cleaned = cleaned
    .replace(/Desember/i, 'Des')
    .replace(/November/i, 'Nov')
    .replace(/Oktober/i, 'Okt')
    .replace(/September/i, 'Sep')
    .replace(/Agustus/i, 'Agu')
    .replace(/Juli/i, 'Jul')
    .replace(/Juni/i, 'Jun')
    .replace(/Maret/i, 'Mar')
    .replace(/Januari/i, 'Jan');
  return cleaned || 'Segera';
}

export function getStatusBadgeStyle(state: AnnouncementVerificationState) {
  switch (state) {
    case 'OFFICIALLY_CONFIRMED':
      return {
        label: 'Resmi Penerbit',
        className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        dotClassName: 'bg-emerald-400',
      };
    case 'DATED_ISBN':
      return {
        label: 'Terdaftar ISBN',
        className: 'bg-accent/10 text-accent border border-accent/20',
        dotClassName: 'bg-accent',
      };
    case 'CORROBORATED':
      return {
        label: 'Terkonfirmasi',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        dotClassName: 'bg-amber-400',
      };
    case 'SPOTTED':
      return {
        label: 'Pantauan Awal',
        className: 'bg-white/[0.06] text-editorial-muted border border-dashed border-white/15',
        dotClassName: 'bg-zinc-400',
      };
    case 'RELEASED_GRADUATED':
      return {
        label: 'Sudah Terbit',
        className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        dotClassName: 'bg-emerald-400',
      };
    case 'STALE_HOLD':
    default:
      return {
        label: 'Belum Ada Kabar',
        className: 'bg-white/[0.04] text-editorial-faint border border-white/10',
        dotClassName: 'bg-zinc-500',
      };
  }
}

/**
 * Visual-First, Cover-Led Radar Card (Round 3.4 Directives #2 & #4).
 * Strictly 5 card-face elements:
 * 1. State badge
 * 2. Title
 * 3. Original title (if different from title)
 * 4. ONE meta line: publisher · format · expected date
 * 5. Pinned Source (N): attribution
 */
export function RadarCard({
  item: itemProp,
  view,
}: {
  item?: PublisherAnnouncement;
  view?: AnnouncementView;
  compact?: boolean;
}) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const item = itemProp || view?.announcement;

  if (!item) return null;

  const state = view?.state || item.state;
  const statusBadgeStyle = getStatusBadgeStyle(state);

  const publisherLabel = item.publisherShortName || (item.publisherId === 'pub_pgi' ? 'PGI' : item.publisherId === 'pub_mnc' ? 'm&c!' : 'Elex Media');
  const formatLabel = item.category;
  const expectedDateLabel = cleanExpectedDate(item.expectedReleaseWindow);

  const showOriginalTitle = !!(
    item.originalTitle &&
    item.originalTitle.toLowerCase() !== item.title.toLowerCase()
  );

  const visibleSources = sourcesExpanded ? item.sources : item.sources.slice(0, 2);
  const hiddenSourceCount = Math.max(0, item.sources.length - 2);

  return (
    <article
      data-testid="radar-card"
      className="group relative flex items-start gap-4 sm:gap-5 rounded-2xl border border-white/[0.06] bg-surface/60 hover:bg-surface/85 hover:border-white/[0.10] p-4 sm:p-5 transition-all duration-200"
    >
      {/* 1. Left Column: Book Cover Thumbnail (aspect-[3/4.2], sized like catalog book cards) */}
      <div
        data-testid="radar-card-cover"
        className="relative aspect-[3/4.2] w-24 sm:w-28 shrink-0 rounded-xl overflow-hidden bg-surface-sunken book-cover-elevated"
      >
        <CoverImage
          src={item.coverUrl || item.coverImage || undefined}
          alt={item.title}
          width={112}
          height={157}
          sizes="(max-width: 640px) 96px, 112px"
          imgClassName="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </div>

      {/* 2. Right Column: Strictly Minimal 5-Element Stack */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {/* Element 1: State Badge */}
          <div className="flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${statusBadgeStyle.className}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadgeStyle.dotClassName}`} />
              <span>{statusBadgeStyle.label}</span>
            </span>
          </div>

          {/* Element 2: Title */}
          <h3 className="mt-2 font-editorial text-lg sm:text-xl font-normal text-editorial-title leading-[1.22] tracking-tight line-clamp-2">
            {item.title}
          </h3>

          {/* Element 3: Original Title Small (only if present and distinct from title) */}
          {showOriginalTitle && (
            <p className="mt-1 text-[11px] sm:text-xs italic text-editorial-muted line-clamp-1">
              {item.originalTitle}
            </p>
          )}

          {/* Element 4: ONE Meta Line (publisher · format · expected date ONLY) */}
          <p
            data-testid="radar-card-meta"
            className="mt-2.5 text-xs font-mono text-editorial-body line-clamp-1"
          >
            {[publisherLabel, formatLabel, expectedDateLabel].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Element 5: Small "Source (N):" Line at the Bottom */}
        <div
          data-testid="radar-card-sources"
          className="mt-3 pt-2.5 border-t border-white/[0.05] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-editorial-muted"
        >
          <span className="font-mono text-[10px] text-editorial-faint">
            Source ({item.sources.length}):
          </span>
          {visibleSources.map((src, idx) => (
            <React.Fragment key={`${src.url}-${idx}`}>
              {idx > 0 && <span aria-hidden="true" className="text-white/20">·</span>}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={src.evidenceNote || src.sourceLabel}
                className="inline-flex items-center gap-0.5 text-[11px] text-editorial-body hover:text-accent underline decoration-white/15 hover:decoration-accent underline-offset-4 transition-colors"
              >
                <span>{formatSourceShortLabel(src)}</span>
                <span aria-hidden="true" className="text-[9px] text-editorial-muted">↗</span>
              </a>
            </React.Fragment>
          ))}
          {hiddenSourceCount > 0 && !sourcesExpanded && (
            <button
              type="button"
              onClick={() => setSourcesExpanded(true)}
              className="rounded-full bg-white/[0.05] hover:bg-white/[0.09] px-2 py-0.5 font-mono text-[10px] text-editorial-body transition-colors"
            >
              +{hiddenSourceCount}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export const AnnouncementCard = RadarCard;
