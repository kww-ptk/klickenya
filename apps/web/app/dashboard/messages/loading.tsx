export default function MessagesLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-7 w-32 bg-border rounded-lg" />
        <div className="h-4 w-56 bg-surface rounded mt-2" />
      </div>
      <div className="h-4 w-40 bg-border rounded mb-3" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-4 mb-3">
          <div className="flex-1">
            <div className="h-4 w-1/3 bg-border rounded" />
            <div className="h-3 w-1/4 bg-surface rounded mt-2" />
            <div className="h-3 w-full bg-surface rounded mt-3" />
            <div className="h-3 w-2/3 bg-surface rounded mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
