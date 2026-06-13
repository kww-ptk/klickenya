export default function EnquiriesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-border rounded-lg" />
          <div className="h-4 w-44 bg-surface rounded mt-2" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-4 mb-3">
          <div className="flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-surface" />
            <div className="flex-1">
              <div className="h-4 w-1/2 bg-border rounded" />
              <div className="h-3 w-1/3 bg-surface rounded mt-2" />
              <div className="h-3 w-full bg-surface rounded mt-3" />
              <div className="h-3 w-2/3 bg-surface rounded mt-1" />
            </div>
            <div className="h-3 w-16 bg-surface rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
