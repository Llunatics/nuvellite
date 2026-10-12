import { getAllBooks, getAllSeries } from '@/lib/catalog-service';
import { LibraryView } from '@/components/library/library-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Koleksi & Wishlist Saya — nuvellite',
  description: 'Kelola koleksi komik dan light novel pribadi Anda serta deteksi volume yang belum Anda miliki.',
};

export default function LibraryPage() {
  const allBooks = getAllBooks();
  const allSeries = getAllSeries();

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      <LibraryView allBooks={allBooks} allSeries={allSeries} />
    </div>
  );
}
