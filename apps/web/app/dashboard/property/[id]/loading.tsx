export default function PropertyDashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-5">
        <div className="h-4 w-28 bg-surface rounded mb-2" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="h-7 w-52 bg-border rounded-lg" />
            <div className="h-5 w-32 bg-surface rounded mt-1.5" />
          </div>
          <div className="h-9 w-20 bg-surface rounded-lg shrink-0" />
        </div>
      </div>

      {/* Today snapshot */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-border py-3 px-2 text-center shadow-sm">
            <div className="h-6 w-8 bg-border rounded mx-auto" />
            <div className="h-3 w-16 bg-surface rounded mx-auto mt-1.5" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="mb-8 bg-white rounded-xl lg:rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-canvas">
          <div className="h-5 w-24 bg-border rounded" />
          <div className="h-8 w-28 bg-[#4F46E5]/20 rounded-lg" />
        </div>
        <div className="h-10 bg-canvas border-b border-border" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 bg-white border-b border-border" />
        ))}
        <div className="h-8 bg-canvas" />
      </div>
    </div>
  );
}
