import { getAllBooks, getPublishers, getStats } from '@/lib/catalog-service';
import { ReleaseFeed } from '@/components/feed/release-feed';

export default function HomePage() {
  const books = getAllBooks();
  const publishers = getPublishers();
  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ReleaseFeed initialBooks={books} publishers={publishers} stats={stats} />
    </div>
  );
}
