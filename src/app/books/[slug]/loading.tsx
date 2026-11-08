import { ReleaseCardSkeleton } from '@/components/books/book-card';

export default function BookDetailLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8 space-y-12 animate-pulse">
      <div className="h-4 w-24 bg-white/[0.05] rounded" />
      <div className="relative overflow-hidden rounded-3xl bg-surface-elevated/40 border border-white/[0.06] p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 aspect-[3/4.2] w-52 sm:w-64 mx-auto lg:mx-0 rounded-2xl bg-white/[0.06]" />
          <div className="lg:col-span-8 space-y-4">
            <div className="h-4 w-28 bg-white/[0.05] rounded" />
            <div className="h-8 w-80 bg-white/[0.08] rounded" />
            <div className="h-4 w-40 bg-white/[0.05] rounded" />
            <div className="h-6 w-32 bg-white/[0.07] rounded mt-2" />
            <div className="h-28 w-full bg-white/[0.04] rounded mt-4" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 bg-white/[0.06] rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReleaseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
