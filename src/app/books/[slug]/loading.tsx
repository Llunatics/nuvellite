export default function BookDetailLoading() {
  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 sm:py-8">
      {/* Zone 1: context bar with volume stepper */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div className="h-4 w-40 bg-white/[0.03]" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-14 bg-white/[0.03]" />
          <div className="h-4 w-16 bg-white/[0.03]" />
          <div className="h-4 w-14 bg-white/[0.03]" />
        </div>
      </div>

      {/* Zone 2: hero — cover frame + title block, no glass box */}
      <div className="grid md:grid-cols-12 gap-8 mt-8">
        <div className="md:col-span-4">
          <div className="border border-white/[0.06] bg-zinc-950 p-1.5 w-40 sm:w-56 md:w-full max-w-[260px]">
            <div className="aspect-[3/4.2] w-full cover-skeleton-flat" />
          </div>
          <div className="flex items-center gap-2 mt-4 max-w-[260px]">
            <div className="h-10 flex-1 bg-white/[0.03] border border-white/[0.06]" />
            <div className="h-10 w-10 bg-white/[0.03] border border-white/[0.06]" />
            <div className="h-10 w-10 bg-white/[0.03] border border-white/[0.06]" />
          </div>
        </div>
        <div className="md:col-span-8 space-y-4">
          <div className="h-3.5 w-52 bg-white/[0.03]" />
          <div className="h-9 w-2/3 bg-white/[0.03] border border-white/[0.06]" />
          <div className="h-4 w-40 bg-white/[0.03]" />
        </div>
      </div>

      {/* Zone 3: hairline ledger strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-white/[0.06] py-4 mt-10 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-16 bg-white/[0.03]" />
            <div className="h-5 w-24 bg-white/[0.03]" />
          </div>
        ))}
      </div>

      {/* Zone 4: synopsis lines */}
      <div className="space-y-2.5 mt-8 max-w-[65ch]">
        <div className="h-3.5 w-full bg-white/[0.03]" />
        <div className="h-3.5 w-full bg-white/[0.03]" />
        <div className="h-3.5 w-4/5 bg-white/[0.03]" />
        <div className="h-3.5 w-3/5 bg-white/[0.03]" />
      </div>

      {/* Zone 6: sibling volumes */}
      <div className="mt-12">
        <div className="h-5 w-48 bg-white/[0.03] mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4.2] cover-skeleton-flat border border-white/[0.06]" />
          ))}
        </div>
      </div>
    </div>
  );
}
