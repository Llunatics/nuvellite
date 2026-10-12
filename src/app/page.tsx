import { getAllBooks, getPublishers } from '@/lib/catalog-service';
import { ReleaseFeed } from '@/components/feed/release-feed';

export default function HomePage() {
  const books = getAllBooks();
  const publishers = getPublishers();

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
      <ReleaseFeed initialBooks={books} publishers={publishers} />
    </div>
  );
}
