import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArchiveEntryBySlug } from '@/lib/kki-service';
import { CoverImage } from '@/components/books/cover-image';
import { Archive, ArrowLeft, ExternalLink, Languages } from 'lucide-react';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getArchiveEntryBySlug(slug);
  if (!entry) return { title: 'Arsip Tidak Ditemukan — nuvellite' };
  return {
    title: `${entry.title} (Arsip) — nuvellite`,
    description: `Arsip seri ${entry.title} terbitan ${entry.publisherId || 'Indonesia'} — tidak tersedia di Gramedia.`,
  };
}

export default async function ArchiveDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entry = getArchiveEntryBySlug(slug);

  if (!entry) {
    notFound();
  }

  const cover = entry.mu?.status === 'ok' ? entry.mu.cover : undefined;
  const synopsisId = entry.mu?.descriptionId;
  const synopsisEn = entry.mu?.descriptionEn;

  const facts: Array<[string, string | null | undefined]> = [
    ['Pengarang', entry.author],
    ['Ilustrator', entry.illustrator],
    ['Penerbit Indonesia', entry.publisherId],
    ['Demografi', entry.demographic],
    ['Volume (INA)', entry.volumesId ? `${entry.volumesId} vol` : null],
    ['Status (INA)', entry.statusId],
    ['Vol. 1 Terbit', entry.yearFirstVol],
    ['Jenis Kertas', entry.paperType],
    [
      'Rentang Harga',
      entry.priceMin && entry.priceMax
        ? `${entry.priceMin} – ${entry.priceMax}`
        : entry.priceMax || entry.priceMin,
    ],
    ['Penerbit Jepang', entry.publisherJp],
    ['Volume (Jepang)', entry.volumesJp],
    ['Status (Jepang)', entry.statusJp],
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href="/arsip"
        className="inline-flex items-center gap-1.5 text-xs text-editorial-muted hover:text-editorial-title transition-colors mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Arsip
      </Link>

      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
        {/* Cover */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <div className="relative w-48 sm:w-56 aspect-[3/4.2] rounded-2xl overflow-hidden bg-surface-sunken cover-depth">
            {cover ? (
              <CoverImage
                src={cover}
                alt={entry.title}
                width={224}
                height={298}
                imgClassName="w-full h-full object-cover"
                fallbackIconClassName="w-8 h-8 text-editorial-faint"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface-elevated/40">
                <span className="font-editorial text-5xl text-editorial-faint">
                  {entry.title.charAt(0).toUpperCase()}
                </span>
                <span className="text-[11px] text-editorial-muted line-clamp-3 mt-2">{entry.title}</span>
              </div>
            )}
            <div className="absolute top-2.5 left-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-wide uppercase bg-black/60 backdrop-blur-md border border-white/10 text-amber-300">
                Arsip
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-5 min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-editorial-muted mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 text-[10px] uppercase font-semibold">
                <Archive className="w-3 h-3" /> Arsip — tidak tersedia di Gramedia
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-semibold border ${
                  entry.medium === 'LIGHT_NOVEL'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                    : 'bg-sky-500/10 text-sky-300 border-sky-500/25'
                }`}
              >
                {entry.medium === 'LIGHT_NOVEL' ? 'Light Novel' : 'Manga'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-editorial font-normal text-editorial-title tracking-tight leading-[1.15]">
              {entry.title}
            </h1>

            {/* Synopsis */}
            {(synopsisId || synopsisEn) && (
              <div className="mt-4 max-w-2xl">
                {synopsisId ? (
                  <>
                    <p className="text-xs sm:text-sm text-editorial-body/90 leading-relaxed font-sans whitespace-pre-line">
                      {synopsisId}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono text-editorial-faint">
                      <Languages className="w-3 h-3" />
                      Diterjemahkan otomatis dari MangaUpdates
                    </p>
                  </>
                ) : (
                  <p className="text-xs sm:text-sm text-editorial-body/90 leading-relaxed font-sans whitespace-pre-line">
                    {synopsisEn}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Facts */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 max-w-2xl">
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
              {facts
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[10px] font-mono uppercase tracking-wide text-editorial-faint">
                      {label}
                    </dt>
                    <dd className="text-xs text-editorial-title font-medium truncate" title={value as string}>
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center gap-x-4 gap-y-1">
              {entry.mangaupdatesUrl && (
                <a
                  href={entry.mangaupdatesUrl}
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

          {entry.notes && (
            <p className="text-[11px] text-editorial-muted max-w-2xl font-sans">
              <span className="font-mono text-editorial-faint uppercase text-[10px]">Catatan: </span>
              {entry.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
