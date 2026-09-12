/** /eat skeleton — project rule: every route gets instant visual feedback. */
export default function Loading() {
  return (
    <>
      <div className="min-h-[520px] md:min-h-[600px] bg-purple-dark" />
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="h-3 w-24 rounded bg-surface2 mb-3" />
        <div className="h-8 w-72 max-w-full rounded bg-surface2 mb-8" />
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
