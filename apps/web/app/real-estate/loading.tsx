export default function RealEstateLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-56 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-zinc-200 rounded-md animate-pulse mt-3" />
      </div>

      {/* Grid of 6 skeleton property cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {/* Image placeholder */}
            <div className="aspect-[4/3] bg-zinc-200 rounded-xl" />
            {/* Title */}
            <div className="h-5 w-3/4 bg-zinc-200 rounded-md mt-4" />
            {/* Price line */}
            <div className="h-4 w-32 bg-zinc-300 rounded-md mt-2.5" />
            {/* Specs row: beds / baths / sqft */}
            <div className="flex items-center gap-3 mt-3">
              <div className="h-3.5 w-14 bg-zinc-200 rounded-md" />
              <div className="h-3.5 w-14 bg-zinc-200 rounded-md" />
              <div className="h-3.5 w-16 bg-zinc-200 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
