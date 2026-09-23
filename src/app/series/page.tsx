import { getAllSeries, getAllBooks } from '@/lib/catalog-service';
import { SeriesDirectoryView } from '@/components/series/series-directory-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Direktori Seri Manga & Light Novel — nuvellite',
  description: 'Daftar lengkap seri komik dan light novel dari Elex Media Komputindo, m&c!, dan Phoenix Gramedia Indonesia.',
};

export default function SeriesDirectoryPage() {
  const allSeries = getAllSeries();
  const allBooks = getAllBooks();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SeriesDirectoryView allSeries={allSeries} allBooks={allBooks} />
    </div>
  );
}
