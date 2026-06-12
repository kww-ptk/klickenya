export default function ReservationsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Stats strip skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl lg:rounded-2xl border border-border p-4 shadow-sm">
            <div className="h-3 bg-surface rounded w-2/3 mb-3" />
            <div className="h-7 bg-surface rounded w-1/2" />
          </div>
        ))}
      </div>
      {/* Sub-tab skeleton */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-surface rounded-full" />
        ))}
      </div>
      {/* List skeleton */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <div className="flex gap-4 items-center">
              <div className="w-14 space-y-1">
                <div className="h-6 bg-surface rounded" />
                <div className="h-3 bg-surface rounded" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-surface rounded w-1/3" />
                <div className="h-3 bg-surface rounded w-2/3" />
              </div>
              <div className="h-6 w-16 bg-surface rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
