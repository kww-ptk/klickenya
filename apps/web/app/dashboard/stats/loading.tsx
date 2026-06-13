export default function StatsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-16 bg-border rounded-lg" />
          <div className="h-4 w-40 bg-surface rounded mt-2" />
        </div>
        <div className="h-9 w-28 bg-surface rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4 text-center">
            <div className="h-7 w-10 bg-surface rounded mx-auto" />
            <div className="h-3 w-16 bg-surface rounded mx-auto mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <div className="h-5 w-32 bg-border rounded mb-4" />
        <div className="h-28 bg-surface rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F0EDE8]">
          <div className="h-5 w-24 bg-border rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-[#F0EDE8] last:border-0">
            <div className="h-4 w-32 bg-surface rounded" />
            <div className="flex gap-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 w-8 bg-surface rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
