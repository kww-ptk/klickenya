/** /eat/[city] skeleton — project rule: instant visual feedback on every route. */
export default function Loading() {
  return (
    <>
      <div className="bg-dark">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 pt-[120px] pb-12 md:pb-14">
          <div className="h-3 w-24 rounded bg-white/10 mb-5" />
          <div className="h-3 w-32 rounded bg-white/10 mb-4" />
          <div className="h-10 w-80 max-w-full rounded bg-white/10 mb-4" />
          <div className="h-4 w-full max-w-[560px] rounded bg-white/10" />
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-10 md:py-14">
        <div className="flex flex-wrap gap-2 mb-7">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 w-24 rounded-full bg-surface2" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-x-[22px] sm:gap-y-7">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[4/3] rounded-[22px] bg-surface2" />
              <div className="h-4 w-3/4 rounded bg-surface2 mt-3" />
              <div className="h-3 w-1/2 rounded bg-surface2 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
