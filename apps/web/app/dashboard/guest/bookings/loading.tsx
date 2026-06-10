export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 max-w-3xl">
      <div>
        <div className="h-7 w-36 bg-border rounded-lg" />
        <div className="h-4 w-24 bg-surface rounded mt-2" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#F0EDE8] p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-5 w-2/3 bg-border rounded" />
                <div className="h-3 w-24 bg-surface rounded" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className="h-5 w-20 bg-surface rounded-full" />
                <div className="h-5 w-24 bg-surface rounded-full" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="h-4 w-36 bg-surface rounded" />
              <div className="h-4 w-36 bg-surface rounded" />
            </div>
            <div className="flex gap-6">
              <div className="h-4 w-32 bg-surface rounded" />
              <div className="h-4 w-28 bg-surface rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
