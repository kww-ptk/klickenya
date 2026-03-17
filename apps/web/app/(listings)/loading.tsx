export default function ListingsLoading() {
  return (
    <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-4 w-48 bg-zinc-200 rounded-md animate-pulse mt-3" />
      </div>

      {/* Grid of 8 skeleton cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            {/* Image placeholder */}
            <div className="aspect-[4/3] bg-zinc-200 rounded-xl" />
            {/* Title line */}
            <div className="h-4 w-3/4 bg-zinc-200 rounded-md mt-3.5" />
            {/* Subtitle line */}
            <div className="h-3.5 w-1/2 bg-zinc-300 rounded-md mt-2.5" />
            {/* Tag */}
            <div className="h-5 w-16 bg-zinc-200 rounded-full mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
