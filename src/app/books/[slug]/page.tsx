import { notFound } from 'next/navigation';
import { getBookBySlug, getBookDetailBySlug, getBooksBySeries, getPriceSummary, getYouMayAlsoLike } from '@/lib/catalog-service';
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
    description: `Rilisan resmi ${book.category} terbitan ${book.publisherName}. Cek harga resmi, tanggal rilis, sinopsis, dan volume buku.`,
  };
}

export default async function BookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  // Use full detail data (with synopsis, editions, etc.) for the detail page
  const book = getBookDetailBySlug(slug);

  if (!book) {
    notFound();
  }

  const seriesSiblings = book.seriesId ? getBooksBySeries(book.seriesId) : [];
  const recommendations = getYouMayAlsoLike(book, 6);
  const priceSummary = getPriceSummary(book);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <BookDetail
        book={book}
        seriesSiblings={seriesSiblings}
        recommendations={recommendations}
        priceSummary={priceSummary}
      />
    </div>
  );
}
