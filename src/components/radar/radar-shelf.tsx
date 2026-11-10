import Link from 'next/link';
import { AnnouncementCard, type AnnouncementView } from './announcement-card';

/**
 * Homepage shelf (Round 2 §5.7): compact 4-card strip above the catalog,
 * corroborated-or-stronger records only, with a link to the full /radar.
 */
export function RadarShelf({ views }: { views: AnnouncementView[] }) {
  if (views.length === 0) return null;
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-editorial text-xl sm:text-2xl font-normal text-editorial-title tracking-tight">
          Radar Lisensi &amp; Pengumuman Baru
        </h2>
        <Link
          href="/radar"
          className="shrink-0 font-mono text-xs text-editorial-muted transition-colors hover:text-accent"
        >
          Semua Pengumuman →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {views.map((v) => (
          <AnnouncementCard key={v.announcement.id} view={v} compact />
        ))}
      </div>
    </section>
  );
}
