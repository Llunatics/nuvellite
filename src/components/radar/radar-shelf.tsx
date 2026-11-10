import Link from 'next/link';
import { AnnouncementCard, type AnnouncementView } from './announcement-card';

/**
 * Homepage shelf: compact 4-card strip above the catalog,
 * corroborated-or-stronger records only, with a link to the full /radar.
 */
export function RadarShelf({ views }: { views: AnnouncementView[] }) {
  if (views.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            RADAR LISENSI
          </p>
          <h2 className="mt-1 font-editorial text-2xl sm:text-3xl font-normal text-editorial-title tracking-tight">
            Pengumuman Baru dari Penerbit
          </h2>
        </div>
        <Link
          href="/radar"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-3.5 py-1.5 text-xs font-medium text-editorial-body hover:text-editorial-title transition-colors"
        >
          <span>Lihat semua pengumuman</span>
          <span aria-hidden="true" className="text-accent">→</span>
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {views.slice(0, 4).map((v) => (
          <AnnouncementCard key={v.announcement.id} view={v} compact />
        ))}
      </div>
    </section>
  );
}
