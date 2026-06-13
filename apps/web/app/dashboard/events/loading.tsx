export default function EventsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-border rounded-lg" />
          <div className="h-4 w-48 bg-surface rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-surface rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl bg-white border border-border p-4 mb-4">
          <div className="shrink-0 w-16 h-16 md:w-28 md:h-20 rounded-xl bg-surface" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-border rounded" />
            <div className="h-3 w-1/3 bg-surface rounded mt-2" />
            <div className="h-5 w-14 bg-surface rounded-full mt-2" />
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <div className="h-8 w-16 bg-surface rounded-lg" />
            <div className="h-8 w-24 bg-surface rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
