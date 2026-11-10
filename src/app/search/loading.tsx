export default function SearchLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
      {/* Search bar */}
      <div className="h-12 w-full bg-white/[0.03] border border-white/[0.06]" />
      <div className="mt-3 h-3.5 w-48 bg-white/[0.03]" />

      {/* Result grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 mt-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4.2] w-full cover-skeleton-flat border border-white/[0.06]" />
            <div className="space-y-2 px-0.5">
              <div className="h-3 w-full bg-white/[0.03]" />
              <div className="h-3 w-2/3 bg-white/[0.03]" />
              <div className="h-3 w-16 bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
