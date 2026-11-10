import { Suspense } from 'react';
import { getAllBooks, getPublishers } from '@/lib/catalog-service';
import { getShelfAnnouncements, toAnnouncementView } from '@/lib/announcement-service';
import { ReleaseFeed, ReleaseFeedSkeleton } from '@/components/feed/release-feed';
import { RadarShelf } from '@/components/radar/radar-shelf';

export default function HomePage() {
  const books = getAllBooks();
  const publishers = getPublishers();
  const shelfViews = getShelfAnnouncements(4).map((a) => toAnnouncementView(a));

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 nuv-view-enter">
      <RadarShelf views={shelfViews} />
      <Suspense fallback={<ReleaseFeedSkeleton />}>
        <ReleaseFeed initialBooks={books} publishers={publishers} />
      </Suspense>
    </div>
  );
}
