import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAllBooks, getAllSeries } from '@/lib/catalog-service';
import { SearchResultsView } from '@/components/search/search-results-view';

export const metadata: Metadata = {
  title: 'Pencarian Katalog — nuvellite',
  description: 'Hasil pencarian manga, light novel, dan official merchandise resmi di Indonesia.',
};

export default function SearchPage() {
  const allBooks = getAllBooks();
  const popularTags = getAllSeries()
    .filter((s) => (s.totalVolumes || 0) >= 2)
    .slice(0, 8)
    .map((s) => s.name);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <Suspense
        fallback={
          <div className="py-24 text-center space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-mono text-editorial-muted">Memuat pencarian katalog...</p>
          </div>
        }
      >
        <SearchResultsView allBooks={allBooks} popularTags={popularTags} />
      </Suspense>
    </div>
  );
}
