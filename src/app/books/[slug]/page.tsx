import { notFound } from 'next/navigation';
import { getBookBySlug, getBooksBySeries, getPriceSummary, getYouMayAlsoLike } from '@/lib/catalog-service';
import { getBookDetailBySlug } from '@/lib/catalog-detail-service';
import { BookDetail } from '@/components/books/book-detail';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) return { title: 'Buku Tidak Ditemukan — nuvellite' };

  return {
    title: `${book.title} — nuvellite`,
    description: `Rilisan ${book.category} terbitan ${book.publisherName}. Cek harga, tanggal rilis, sinopsis, dan volume buku.`,
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  // Use full detail data (with synopsis, editions, etc.) for the detail page
  const book = getBookDetailBySlug(slug);

  if (!book) {
    notFound();
  }

  // Full volume list (sorted by volume ascending) drives the prev/next
  // stepper; siblings exclude the current book itself (Round 2, Block 4).
  const allSeriesBooks = book.seriesId ? getBooksBySeries(book.seriesId) : [];
  const currentIndex = allSeriesBooks.findIndex((b) => b.id === book.id);
  const prevBook = currentIndex > 0 ? allSeriesBooks[currentIndex - 1] : null;
  const nextBook =
    currentIndex >= 0 && currentIndex < allSeriesBooks.length - 1
      ? allSeriesBooks[currentIndex + 1]
      : null;
  const seriesSiblings = allSeriesBooks.filter((b) => b.id !== book.id);
  const recommendations = getYouMayAlsoLike(book, 6);
  const priceSummary = getPriceSummary(book);

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 nuv-view-enter">
      <BookDetail
        book={book}
        seriesSiblings={seriesSiblings}
        prevBook={prevBook}
        nextBook={nextBook}
        recommendations={recommendations}
        priceSummary={priceSummary}
      />
    </div>
  );
}
