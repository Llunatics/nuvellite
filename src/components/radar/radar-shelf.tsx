import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnnouncementCard, type AnnouncementView } from './announcement-card';

/**
 * Homepage shelf: compact 4-card strip above the catalog,
 * corroborated-or-stronger records only, with a link to the full /radar.
 */
export function RadarShelf({ views }: { views: AnnouncementView[] }) {
  if (views.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-4 mb-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
            RADAR LISENSI
          </p>
          <h2 className="mt-1 font-editorial text-2xl sm:text-3xl font-normal tracking-tight text-editorial-title leading-[1.15]">
            Pengumuman Baru dari Penerbit
          </h2>
          <p className="mt-1.5 text-xs font-mono text-editorial-muted">
            {views.length} pengumuman terkini
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3 pl-2">
          <Link
            href="/radar"
            className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-medium text-editorial-body hover:text-accent transition-colors py-1"
          >
            <span>Semua Pengumuman</span>
            <ArrowRight className="w-3.5 h-3.5 text-accent" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {views.slice(0, 4).map((v) => (
          <AnnouncementCard key={v.announcement.id} view={v} compact />
        ))}
      </div>
    </section>
  );
}
