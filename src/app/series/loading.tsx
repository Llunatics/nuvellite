import { CatalogGridSkeleton } from '@/components/books/book-card';

export default function SeriesLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 space-y-8 animate-pulse">
      <div className="space-y-2 border-b border-white/[0.04] pb-6">
        <div className="h-4 w-32 bg-white/[0.05] rounded" />
        <div className="h-8 w-64 bg-white/[0.08] rounded" />
        <div className="h-3.5 w-96 bg-white/[0.04] rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-28 bg-white/[0.06] rounded-full" />
        <div className="h-8 w-28 bg-white/[0.06] rounded-full" />
        <div className="h-8 w-28 bg-white/[0.06] rounded-full" />
      </div>
      <CatalogGridSkeleton count={18} />
    </div>
  );
}
