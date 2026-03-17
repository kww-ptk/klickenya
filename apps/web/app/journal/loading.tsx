export default function JournalLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
      {/* Header skeleton */}
      <div className="mb-10">
        <div className="h-8 w-48 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-zinc-200 rounded-md animate-pulse mt-3" />
      </div>

      {/* Grid of 4 skeleton post cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {/* Image placeholder */}
            <div className="aspect-[16/10] bg-zinc-200 rounded-xl" />
            {/* Title */}
            <div className="h-5 w-3/4 bg-zinc-200 rounded-md mt-4" />
            {/* Description line 1 */}
            <div className="h-3.5 w-full bg-zinc-200 rounded-md mt-3" />
            {/* Description line 2 */}
            <div className="h-3.5 w-2/3 bg-zinc-300 rounded-md mt-2" />
            {/* Date */}
            <div className="h-3 w-24 bg-zinc-200 rounded-md mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
