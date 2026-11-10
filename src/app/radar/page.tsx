import type { Metadata } from 'next';
import {
  getActiveAnnouncements,
  getGraduatedAnnouncements,
  getStaleAnnouncements,
  toAnnouncementView,
} from '@/lib/announcement-service';
import { RadarList } from '@/components/radar/radar-list';

export const metadata: Metadata = {
  title: 'Radar Lisensi — Nuvellite',
  description:
    'Pengumuman lisensi manga & light novel baru dari PGI, m&c!, dan Elex Media, lengkap dengan tautan sumbernya.',
};

export default function RadarPage() {
  const now = new Date();
  const active = getActiveAnnouncements(now).map((a) => toAnnouncementView(a, now));
  const stale = getStaleAnnouncements(now).map((a) => toAnnouncementView(a, now));
  const graduated = getGraduatedAnnouncements(now).map((a) =>
    toAnnouncementView(a, now),
  );

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 nuv-view-enter">
      <header className="pt-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          RADAR LISENSI
        </p>
        <h1 className="mt-4 font-editorial text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-[1.12] text-editorial-title">
          Pengumuman Baru dari Penerbit
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-editorial-body leading-[1.7] font-sans">
          Lisensi manga &amp; light novel yang diumumkan PGI, m&amp;c!, dan Elex Media — dari panggung Comifuro, teaser PDKT, sampai pendaftaran ISBN, lengkap dengan tautan sumbernya.
        </p>
      </header>

      <RadarList active={active} stale={stale} graduated={graduated} />
    </div>
  );
}
