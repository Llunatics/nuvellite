export default function RadarLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
      <div className="mb-8 border-b border-white/[0.06] pb-6">
        <div className="h-3 w-28 border border-white/[0.06] bg-white/[0.03]" />
        <div className="mt-3 h-8 w-72 max-w-full border border-white/[0.06] bg-white/[0.03]" />
        <div className="mt-3 h-4 w-[65ch] max-w-full border border-white/[0.06] bg-white/[0.03]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 rounded-full bg-white/[0.04]" />
              <div className="h-3 w-16 rounded bg-white/[0.04]" />
            </div>
            <div className="flex gap-3">
              <div className="w-16 aspect-[3/4.2] shrink-0 rounded-xl bg-white/[0.04]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-white/[0.04]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
