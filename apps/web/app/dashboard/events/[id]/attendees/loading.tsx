export default function AttendeesLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-surface rounded mb-6" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-border rounded-lg" />
          <div className="h-4 w-44 bg-surface rounded mt-2" />
        </div>
        <div className="h-9 w-24 bg-surface rounded-lg" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="bg-surface px-4 py-3 flex gap-8">
          {["w-20", "w-24", "w-16", "w-14", "w-16"].map((w, i) => (
            <div key={i} className={`h-3 ${w} bg-border rounded hidden ${i < 2 || i === 3 ? "block" : "md:block"}`} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-4 py-3 border-t border-border">
            <div className="h-4 w-24 bg-surface rounded" />
            <div className="h-4 w-32 bg-surface rounded hidden md:block" />
            <div className="h-4 w-20 bg-surface rounded hidden md:block" />
            <div className="h-5 w-16 bg-surface rounded-full" />
            <div className="h-4 w-12 bg-surface rounded hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
