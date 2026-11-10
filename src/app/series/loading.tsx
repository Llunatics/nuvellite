export default function SeriesLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      {/* Header */}
      <div className="space-y-2 border-b border-white/[0.06] pb-6">
        <div className="h-3.5 w-32 bg-white/[0.03] border border-white/[0.06]" />
        <div className="h-8 w-64 bg-white/[0.03] border border-white/[0.06]" />
        <div className="h-3.5 w-96 max-w-full bg-white/[0.03]" />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-white/[0.03] border border-white/[0.06]" />
        ))}
        <div className="h-8 flex-1 min-w-40 bg-white/[0.03] border border-white/[0.06]" />
      </div>

      {/* Series grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 mt-8">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4.2] w-full cover-skeleton-flat border border-white/[0.06]" />
            <div className="space-y-2 px-0.5">
              <div className="h-3 w-full bg-white/[0.03]" />
              <div className="h-3 w-1/2 bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
