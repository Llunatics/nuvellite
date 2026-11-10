import announcementsData from '@/data/announcements.json';
import { normalizeSeriesName } from '@/lib/series-consistency';
import { detectBindUp } from '@/lib/data/edition-detector';
import type {
  AnnouncementVerificationState,
  PublisherAnnouncement,
} from '@/lib/types';

/**
 * Radar Lisensi service (Round 2 §5).
 *
 * Announcements live in src/data/announcements.json, fully separate from
 * catalog.json. This module is read-only: the tracker never mutates the
 * catalog and never runs grouping/repair scripts. Records graduate only
 * when the regular KKI / Gramedia sync matches them by isbn13 or by
 * (publisherId, seriesSlug, volume) — see §5.4.
 */

const announcements = announcementsData as PublisherAnnouncement[];

/** Days without any state upgrade before a record is treated as stale (§5.4). */
export const STALE_HOLD_DAYS = 540;

const STATE_ORDER: Record<AnnouncementVerificationState, number> = {
  DATED_ISBN: 0,
  OFFICIALLY_CONFIRMED: 1,
  CORROBORATED: 2,
  SPOTTED: 3,
  RELEASED_GRADUATED: 4,
  STALE_HOLD: 5,
};

function daysBetween(fromIsoDate: string, to: Date): number {
  const from = new Date(`${fromIsoDate}T00:00:00Z`).getTime();
  if (Number.isNaN(from)) return 0;
  return Math.floor((to.getTime() - from) / 86_400_000);
}

/**
 * Effective display state: a SPOTTED / CORROBORATED record with zero state
 * upgrades for more than 540 days since firstSeenAt collapses into
 * STALE_HOLD ("Arsip Pengumuman Lama"), per §5.4.
 */
export function effectiveState(
  a: PublisherAnnouncement,
  now: Date = new Date(),
): AnnouncementVerificationState {
  if (
    (a.state === 'SPOTTED' || a.state === 'CORROBORATED') &&
    daysBetween(a.firstSeenAt, now) > STALE_HOLD_DAYS
  ) {
    return 'STALE_HOLD';
  }
  return a.state;
}

export function getAllAnnouncements(now: Date = new Date()): PublisherAnnouncement[] {
  return [...announcements].sort((x, y) => {
    const byState =
      STATE_ORDER[effectiveState(x, now)] - STATE_ORDER[effectiveState(y, now)];
    if (byState !== 0) return byState;
    return y.firstSeenAt.localeCompare(x.firstSeenAt);
  });
}

/** Active radar records (not graduated, not stale), strongest evidence first. */
export function getActiveAnnouncements(now: Date = new Date()): PublisherAnnouncement[] {
  return getAllAnnouncements(now).filter((a) => {
    const s = effectiveState(a, now);
    return s !== 'RELEASED_GRADUATED' && s !== 'STALE_HOLD';
  });
}

export function getStaleAnnouncements(now: Date = new Date()): PublisherAnnouncement[] {
  return getAllAnnouncements(now).filter((a) => effectiveState(a, now) === 'STALE_HOLD');
}

export function getGraduatedAnnouncements(now: Date = new Date()): PublisherAnnouncement[] {
  return getAllAnnouncements(now).filter(
    (a) => effectiveState(a, now) === 'RELEASED_GRADUATED',
  );
}

/** Homepage shelf: up to `limit` corroborated-or-stronger active records. */
export function getShelfAnnouncements(
  limit = 4,
  now: Date = new Date(),
): PublisherAnnouncement[] {
  return getActiveAnnouncements(now)
    .filter((a) => effectiveState(a, now) !== 'SPOTTED')
    .slice(0, limit);
}

/**
 * Deterministic dedupe cluster key (§5.5). Five accounts posting about the
 * same stage slide resolve to one key; the pipeline appends each new source
 * to the existing record instead of creating a duplicate card.
 */
export function buildClusterKey(input: {
  publisherId: string;
  medium: 'MANGA' | 'LIGHT_NOVEL';
  editionType: string;
  anilistId?: number | string | null;
  canonicalTitle: string;
  volume?: number | string | null;
}): string {
  const work = input.anilistId ?? normalizeSeriesName(input.canonicalTitle);
  return `${input.publisherId}__${input.medium}${input.editionType}${work}__vol_${input.volume ?? 'series'}`;
}

/**
 * Bind-up-safe series linking (§5.5): an announcement may only link to a
 * series slug whose bind-up nature matches its editionKind. A regular
 * announcement never links to a bind-up series and vice versa, and a
 * light-novel announcement never links to a manga series (the -ln / -manga
 * slug suffix must agree with the category).
 */
export function isSafeSeriesLink(
  a: Pick<PublisherAnnouncement, 'editionKind' | 'category' | 'title'>,
  seriesSlug: string,
): boolean {
  const slugSaysBindUp = seriesSlug.includes('bind-up');
  const titleInfo = detectBindUp(a.title);
  const announcementIsBindUp = a.editionKind === 'BIND_UP' || titleInfo !== null;
  if (announcementIsBindUp !== slugSaysBindUp) return false;
  if (a.category === 'Light Novel' && !seriesSlug.endsWith('-ln')) return false;
  if (a.category === 'Manga' && seriesSlug.endsWith('-ln')) return false;
  return true;
}

/** Monospace badge label + style classes for a verification state (§5.4). */
export function stateBadge(
  a: PublisherAnnouncement,
  now: Date = new Date(),
): { label: string; className: string } {
  const s = effectiveState(a, now);
  const n = a.sources.length;
  switch (s) {
    case 'SPOTTED':
      return {
        label: 'TERPANTAU · 1 SUMBER',
        className: 'border-dashed border-zinc-700 text-zinc-400',
      };
    case 'CORROBORATED':
      return {
        label: `TERKONFIRMASI · ${n} SUMBER`,
        className: 'border-zinc-500 text-zinc-200',
      };
    case 'OFFICIALLY_CONFIRMED':
      return {
        label: 'RESMI PENERBIT',
        className: 'border-white/30 text-white',
      };
    case 'DATED_ISBN':
      return {
        label: 'TERJADWAL · ISBN',
        className: 'border-accent text-accent',
      };
    case 'RELEASED_GRADUATED':
      return { label: 'SUDAH TERBIT', className: 'border-zinc-600 text-zinc-400' };
    case 'STALE_HOLD':
      return { label: 'BELUM ADA KABAR', className: 'border-zinc-800 text-zinc-500' };
  }
}

/** Serializable view model for radar UI components. */
export interface AnnouncementViewModel {
  announcement: PublisherAnnouncement;
  state: AnnouncementVerificationState;
  badgeLabel: string;
  badgeClassName: string;
}

export function toAnnouncementView(
  a: PublisherAnnouncement,
  now: Date = new Date(),
): AnnouncementViewModel {
  const badge = stateBadge(a, now);
  return {
    announcement: a,
    state: effectiveState(a, now),
    badgeLabel: badge.label,
    badgeClassName: badge.className,
  };
}
