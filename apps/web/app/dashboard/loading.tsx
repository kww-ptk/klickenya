export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-7 w-48 bg-border rounded-lg" />
          <div className="h-4 w-32 bg-surface rounded mt-2" />
        </div>
        <div className="h-10 w-24 bg-surface rounded-xl" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border py-3 px-2 lg:p-4 text-center">
            <div className="h-6 w-8 bg-surface rounded mx-auto" />
            <div className="h-3 w-12 bg-surface rounded mx-auto mt-2" />
          </div>
        ))}
      </div>

      {/* Events section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-border rounded-lg" />
          <div className="h-4 w-20 bg-surface rounded" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-3 mb-3">
            <div className="flex gap-3 items-center">
              <div className="shrink-0 w-14 h-14 rounded-lg bg-surface" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-border rounded" />
                <div className="h-3 w-1/2 bg-surface rounded mt-2" />
                <div className="h-5 w-12 bg-surface rounded-full mt-2" />
              </div>
              <div className="h-8 w-16 bg-surface rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Listings section */}
      <div className="mb-5">
        <div className="h-5 w-28 bg-border rounded-lg mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-3 mb-3">
            <div className="flex gap-3">
              <div className="shrink-0 w-14 h-14 rounded-lg bg-surface" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-border rounded" />
                <div className="h-3 w-1/2 bg-surface rounded mt-2" />
                <div className="h-5 w-16 bg-surface rounded-full mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
