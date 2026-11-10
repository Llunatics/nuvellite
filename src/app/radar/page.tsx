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
    'Pengumuman lisensi manga & light novel baru dari PGI, m&c!, dan Elex Media, lengkap dengan bukti sumbernya.',
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
      <header className="mb-8 border-b border-white/[0.06] pb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
          Radar Lisensi
        </p>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-zinc-50 sm:text-3xl">
          Pengumuman Baru dari Penerbit
        </h1>
        <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-zinc-400">
          Lisensi manga &amp; light novel yang diumumkan PGI, m&amp;c!, dan Elex
          Media — dari slide panggung Comifuro, teaser PDKT, sampai pendaftaran
          ISBN. Setiap judul membawa bukti sumbernya, jadi rumor nggak ketuker
          sama kabar resmi.
        </p>
      </header>

      <RadarList active={active} stale={stale} graduated={graduated} />
    </div>
  );
}
