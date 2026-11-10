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

function StatusBadge({ state, label }: { state: AnnouncementVerificationState; label: string }) {
  switch (state) {
    case 'OFFICIALLY_CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {label}
        </span>
      );
    case 'DATED_ISBN':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {label}
        </span>
      );
    case 'CORROBORATED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {label}
        </span>
      );
    case 'SPOTTED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-editorial-muted border border-dashed border-white/15">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          {label}
        </span>
      );
    case 'RELEASED_GRADUATED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {label}
        </span>
      );
    case 'STALE_HOLD':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-editorial-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          {label}
        </span>
      );
  }
}

/**
 * Radar Lisensi card: calm editorial article row or compact shelf card.
 * 4-level hierarchy: status dot + date, title + romaji subtitle,
 * unified single metadata line, and compact quiet inline sources.
 */
export function AnnouncementCard({
  view,
  compact = false,
}: {
  view: AnnouncementView;
  compact?: boolean;
}) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const a = view.announcement;

  const metaItems: string[] = [];
  if (a.authors.length > 0) metaItems.push(a.authors.join(', '));
  metaItems.push(a.publisherShortName || a.publisherId);
  if (a.imprint) metaItems.push(a.imprint);
  metaItems.push(a.category);
  if (a.expectedReleaseWindow) metaItems.push(a.expectedReleaseWindow);
  if (a.eventOrCampaign) metaItems.push(a.eventOrCampaign);

  const visibleSources = sourcesExpanded ? a.sources : a.sources.slice(0, 2);
  const hiddenSourceCount = Math.max(0, a.sources.length - 2);

  return (
    <article
      className={
        compact
          ? 'rounded-2xl border border-white/[0.06] bg-surface/60 p-5 flex flex-col justify-between gap-3 transition-colors hover:border-white/[0.12] min-w-0'
          : 'py-6 sm:py-7 first:pt-6 last:pb-6 flex flex-col gap-3 min-w-0'
      }
    >
      {/* Row 1 — Status Dot + Verification Label & Date */}
      <div className="flex items-center justify-between gap-2">
        <StatusBadge state={view.state} label={view.badgeLabel} />
        <span className="font-mono text-xs text-editorial-muted">
          {formatDateId(a.firstSeenAt)}
        </span>
      </div>

      <div className="flex gap-4 sm:gap-5 items-start">
        {/* Cover thumbnail or compact badge (NEVER a black initials box) */}
        {a.coverImage ? (
          <div className="w-16 sm:w-20 aspect-[2/3] shrink-0 overflow-hidden rounded-xl shadow-md bg-surface-sunken">
            <CoverImage
              src={a.coverImage}
              alt={a.title}
              width={80}
              height={120}
              sizes="80px"
              imgClassName="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-accent/10 border border-accent/20 text-accent font-mono text-xs font-semibold flex items-center justify-center">
            {a.category === 'Light Novel' ? 'LN' : 'MGA'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Row 2 — Primary Title & Original Title */}
          <h3 className="font-editorial text-xl sm:text-2xl font-normal tracking-tight text-editorial-title leading-snug">
            {a.title}
          </h3>
          {a.originalTitle && a.originalTitle.toLowerCase() !== a.title.toLowerCase() && (
            <p className="mt-0.5 text-xs italic text-editorial-muted line-clamp-1" title={a.originalTitle}>
              {a.originalTitle}
            </p>
          )}

          {/* Row 3 — Unified Metadata Line */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-[13px] text-editorial-body">
            {metaItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span aria-hidden="true" className="text-editorial-faint/50">·</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>

          {/* Row 4 — Compact, Quiet Source Attribution */}
          {a.sources.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-editorial-muted">
              <span className="font-mono text-[10px] uppercase tracking-wider text-editorial-muted/70">
                Bukti ({a.sources.length}):
              </span>
              {visibleSources.map((src, idx) => (
                <React.Fragment key={`${src.url}-${idx}`}>
                  {idx > 0 && <span aria-hidden="true" className="text-white/20">·</span>}
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={src.evidenceNote || src.sourceLabel}
                    className="inline-flex items-center gap-1 text-xs text-editorial-body hover:text-accent underline decoration-white/15 hover:decoration-accent underline-offset-4 transition-colors"
                  >
                    <span>{formatSourceShortLabel(src)}</span>
                    <span aria-hidden="true" className="text-[10px] text-editorial-muted">↗</span>
                  </a>
                </React.Fragment>
              ))}
              {hiddenSourceCount > 0 && !sourcesExpanded && (
                <button
                  type="button"
                  onClick={() => setSourcesExpanded(true)}
                  className="ml-1 rounded-full bg-white/[0.05] hover:bg-white/[0.09] px-2 py-0.5 font-mono text-[10px] text-editorial-body transition-colors"
                >
                  +{hiddenSourceCount} lainnya
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
