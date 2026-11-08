import { SeriesDetailSkeleton } from '@/components/series/series-detail';

export default function SeriesSlugLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      <SeriesDetailSkeleton />
    </div>
  );
}
