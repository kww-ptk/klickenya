export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 max-w-3xl">
      <div>
        <div className="h-7 w-40 bg-border rounded-lg" />
        <div className="h-4 w-32 bg-surface rounded mt-2" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F0EDE8] p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-5 w-3/4 bg-border rounded" />
                <div className="h-3 w-28 bg-surface rounded" />
              </div>
              <div className="h-6 w-32 bg-surface rounded-full shrink-0" />
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-36 bg-surface rounded" />
              <div className="h-4 w-36 bg-surface rounded" />
              <div className="h-4 w-16 bg-surface rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
