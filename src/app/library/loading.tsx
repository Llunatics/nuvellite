import { LibraryViewSkeleton } from '@/components/library/library-view';

export default function LibraryLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      <LibraryViewSkeleton />
    </div>
  );
}
