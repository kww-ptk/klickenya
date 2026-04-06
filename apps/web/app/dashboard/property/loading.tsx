export default function PropertyPMSLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-7 w-44 bg-[#E2DDD5] rounded-lg" />
          <div className="h-4 w-40 bg-[#F4F1EC] rounded mt-1.5" />
        </div>
        <div className="h-10 w-28 bg-[#E2DDD5] rounded-xl" />
      </div>

      {/* Calendar skeleton */}
      <div className="mb-10 bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        {/* Nav bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2DDD5] bg-[#FAFAF8]">
          <div className="h-5 w-24 bg-[#E2DDD5] rounded" />
          <div className="h-4 w-28 bg-[#F4F1EC] rounded" />
        </div>
        {/* Stats bar */}
        <div className="flex gap-3 px-4 py-3 border-b border-[#E2DDD5]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 flex-1 bg-[#F4F1EC] rounded-xl" />
          ))}
        </div>
        {/* Header row */}
        <div className="h-10 bg-[#FAFAF8] border-b border-[#E2DDD5]" />
        {/* Room rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 bg-white border-b border-[#E2DDD5]" />
        ))}
        {/* Legend */}
        <div className="h-9 bg-[#FAFAF8]" />
      </div>

      {/* My Properties heading */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-36 bg-[#E2DDD5] rounded" />
        <div className="h-4 w-12 bg-[#F4F1EC] rounded" />
      </div>

      {/* Property cards */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] p-4 shadow-sm">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-[64px] h-[64px] rounded-xl bg-[#F4F1EC]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-[#E2DDD5] rounded" />
                <div className="h-3 w-28 bg-[#F4F1EC] rounded" />
                <div className="h-3 w-36 bg-[#F4F1EC] rounded" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 h-9 bg-[#E2DDD5] rounded-lg" />
              <div className="flex-1 h-9 bg-[#F4F1EC] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
