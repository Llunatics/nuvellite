import { getAllBooks } from '@/lib/catalog-service';
import { getUnifiedSeries } from '@/lib/kki-service';
import { SeriesDirectoryView } from '@/components/series/series-directory-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Direktori Seri Manga & Light Novel — nuvellite',
  description: 'Daftar lengkap seri komik dan light novel dari Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia, termasuk arsip terbitan lama dari Database Komunitas Kolektor Komik Indonesia.',
};

export default function SeriesDirectoryPage() {
  const allSeries = getUnifiedSeries();
  const allBooks = getAllBooks();

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      <SeriesDirectoryView allSeries={allSeries} allBooks={allBooks} />
    </div>
  );
}
