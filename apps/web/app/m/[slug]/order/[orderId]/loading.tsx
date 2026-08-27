export default function Loading() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-border shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="size-10 bg-surface rounded-full mx-auto" />
          <div className="h-6 bg-surface rounded w-3/4 mx-auto" />
          <div className="h-4 bg-surface rounded w-1/2 mx-auto" />
          <div className="h-24 bg-surface rounded" />
        </div>
      </div>
    </div>
  );
}
