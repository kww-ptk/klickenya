export default function PropertyDashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-5">
        <div className="h-4 w-28 bg-[#F4F1EC] rounded mb-2" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="h-7 w-52 bg-[#E2DDD5] rounded-lg" />
            <div className="h-5 w-32 bg-[#F4F1EC] rounded mt-1.5" />
          </div>
          <div className="h-9 w-20 bg-[#F4F1EC] rounded-lg shrink-0" />
        </div>
      </div>

      {/* Today snapshot */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] py-3 px-2 text-center shadow-sm">
            <div className="h-6 w-8 bg-[#E2DDD5] rounded mx-auto" />
            <div className="h-3 w-16 bg-[#F4F1EC] rounded mx-auto mt-1.5" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="mb-8 bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2DDD5] bg-[#FAFAF8]">
          <div className="h-5 w-24 bg-[#E2DDD5] rounded" />
          <div className="h-8 w-28 bg-[#4F46E5]/20 rounded-lg" />
        </div>
        <div className="h-10 bg-[#FAFAF8] border-b border-[#E2DDD5]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 bg-white border-b border-[#E2DDD5]" />
        ))}
        <div className="h-8 bg-[#FAFAF8]" />
      </div>
    </div>
  );
}
