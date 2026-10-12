import { getArchiveEntries, getArchivePublishers, getArchiveCount } from '@/lib/kki-service';
import { ArchiveDirectoryView } from '@/components/archive/archive-directory-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Arsip Komik Indonesia — nuvellite',
  description:
    'Arsip seri manga & light novel yang pernah terbit di Indonesia namun tidak terdata di katalog Gramedia. Bersumber dari Database Komunitas Kolektor Komik Indonesia.',
};

export default function ArchivePage() {
  const entries = getArchiveEntries();
  const publishers = getArchivePublishers();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ArchiveDirectoryView entries={entries} publishers={publishers} />
    </div>
  );
}
