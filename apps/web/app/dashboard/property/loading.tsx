export default function PropertyPMSLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-7 w-44 bg-border rounded-lg" />
          <div className="h-4 w-40 bg-surface rounded mt-1.5" />
        </div>
        <div className="h-10 w-28 bg-border rounded-xl" />
      </div>

      {/* Calendar skeleton */}
      <div className="mb-10 bg-white rounded-xl lg:rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Nav bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-canvas">
          <div className="h-5 w-24 bg-border rounded" />
          <div className="h-4 w-28 bg-surface rounded" />
        </div>
        {/* Stats bar */}
        <div className="flex gap-3 px-4 py-3 border-b border-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 flex-1 bg-surface rounded-xl" />
          ))}
        </div>
        {/* Header row */}
        <div className="h-10 bg-canvas border-b border-border" />
        {/* Room rows */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 bg-white border-b border-border" />
        ))}
        {/* Legend */}
        <div className="h-9 bg-canvas" />
      </div>

      {/* My Properties heading */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-5 w-36 bg-border rounded" />
        <div className="h-4 w-12 bg-surface rounded" />
      </div>

      {/* Property cards */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-[64px] h-[64px] rounded-xl bg-surface" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-border rounded" />
                <div className="h-3 w-28 bg-surface rounded" />
                <div className="h-3 w-36 bg-surface rounded" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 h-9 bg-border rounded-lg" />
              <div className="flex-1 h-9 bg-surface rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
