export default function BindUpLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      {/* Header */}
      <div className="space-y-2 border-b border-white/[0.06] pb-6">
        <div className="h-3.5 w-32 bg-white/[0.03] border border-white/[0.06]" />
        <div className="h-8 w-64 bg-white/[0.03] border border-white/[0.06]" />
        <div className="h-3.5 w-96 max-w-full bg-white/[0.03]" />
      </div>

      {/* Filter row */}
      <div className="flex gap-2 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-white/[0.03] border border-white/[0.06]" />
        ))}
      </div>

      {/* Group rows */}
      <div className="mt-8 space-y-px border border-white/[0.06]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-zinc-950 p-4">
            <div className="flex -space-x-6 shrink-0">
              {Array.from({ length: 3 }).map((_, j) => (
                <div
                  key={j}
                  className="w-10 aspect-[3/4.2] cover-skeleton-flat border border-white/[0.06]"
                />
              ))}
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-56 max-w-full bg-white/[0.03]" />
              <div className="h-3 w-32 bg-white/[0.03]" />
            </div>
            <div className="h-6 w-16 bg-white/[0.03] border border-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  );
}
