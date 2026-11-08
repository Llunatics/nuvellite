import { ReleaseFeedSkeleton } from '@/components/feed/release-feed';

export default function Loading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
      <ReleaseFeedSkeleton />
    </div>
  );
}
