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

/**
 * Radar Lisensi card (Round 2 §5.7): 1px border, monospace verification
 * pill, 56x80 cover thumb (or typographic initials), and a footer audit
 * trail where every source is a clickable monospace pill.
 */
export function AnnouncementCard({
  view,
  compact = false,
}: {
  view: AnnouncementView;
  compact?: boolean;
}) {
  const a = view.announcement;
  return (
    <article className="rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.10] p-4 flex flex-col gap-3 transition-colors min-w-0">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] tracking-wider ${view.badgeClassName}`}
        >
          {view.badgeLabel}
        </span>
        <span className="font-mono text-[11px] text-zinc-500">
          {formatDateId(a.firstSeenAt)}
        </span>
      </div>

      <div className="flex gap-3">
        <div className="w-16 aspect-[3/4.2] shrink-0 overflow-hidden rounded-xl cover-depth">
          <CoverImage
            src={a.coverImage}
            alt={a.title}
            width={56}
            height={80}
            sizes="56px"
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-sans font-semibold text-zinc-50 leading-snug">
            {a.title}
          </h3>
          {a.originalTitle && (
            <p className="text-xs text-zinc-500 truncate" title={a.originalTitle}>
              {a.originalTitle}
            </p>
          )}
          <p className="mt-1 text-xs text-zinc-400">
            {a.authors.length > 0 ? a.authors.join(', ') : '—'}
          </p>
          <p className="text-xs text-zinc-500">
            {a.publisherShortName}
            {a.imprint ? ` · ${a.imprint}` : ''} · {a.category}
            {a.expectedReleaseWindow ? ` · ${a.expectedReleaseWindow}` : ''}
          </p>
          {a.eventOrCampaign && (
            <p className="mt-1 inline-block rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-editorial-muted break-words max-w-full">
              {a.eventOrCampaign}
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <footer className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            Sumber:
          </span>
          {a.sources.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.evidenceNote ?? s.sourceLabel}
              className="inline-block max-w-full break-words rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-editorial-body transition-colors hover:border-accent hover:text-accent"
            >
              {s.sourceLabel}
              {s.isProfileFallbackUrl
                ? ' (Profil Resmi — Tautan Pos Spesifik Belum Diarsipkan)'
                : ''}{' '}
              <span aria-hidden>↗</span>
            </a>
          ))}
        </footer>
      )}
    </article>
  );
}
