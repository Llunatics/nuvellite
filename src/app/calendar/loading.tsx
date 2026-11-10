export default function CalendarLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
      {/* Header: title + month navigation */}
      <div className="flex items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div className="space-y-2">
          <div className="h-3.5 w-28 bg-white/[0.03] border border-white/[0.06]" />
          <div className="h-8 w-56 bg-white/[0.03] border border-white/[0.06]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-white/[0.03] border border-white/[0.06]" />
          <div className="h-9 w-28 bg-white/[0.03] border border-white/[0.06]" />
          <div className="h-9 w-9 bg-white/[0.03] border border-white/[0.06]" />
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-px mt-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-white/[0.03]" />
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px bg-white/[0.06] border border-white/[0.06] mt-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-20 sm:h-24 bg-zinc-950 p-2">
            <div className="h-3 w-5 bg-white/[0.03]" />
            {i % 6 === 2 && <div className="mt-3 h-2 w-3/4 bg-white/[0.03]" />}
            {i % 9 === 4 && <div className="mt-2 h-2 w-1/2 bg-white/[0.03]" />}
          </div>
        ))}
      </div>

      {/* Selected-day panel */}
      <div className="mt-8 border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
        <div className="h-4 w-44 bg-white/[0.03]" />
        <div className="h-3.5 w-2/3 bg-white/[0.03]" />
        <div className="h-3.5 w-1/2 bg-white/[0.03]" />
      </div>
    </div>
  );
}
