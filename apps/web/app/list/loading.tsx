export default function ListLoading() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* Hero skeleton */}
      <div className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
          <div className="h-4 w-32 bg-border rounded-full animate-pulse mb-3" />
          <div className="h-8 w-80 bg-border rounded-full animate-pulse mb-3" />
          <div className="h-4 w-64 bg-border rounded-full animate-pulse" />
        </div>
      </div>

      {/* Form skeleton */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8">
          {/* Step dots */}
          <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-border animate-pulse" />
                {i < 5 && <div className="h-0.5 w-6 bg-border" />}
              </div>
            ))}
          </div>

          <div className="h-6 w-48 bg-border rounded-full animate-pulse mb-2" />
          <div className="h-4 w-72 bg-border rounded-full animate-pulse mb-8" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[#F0EDE8] animate-pulse" />
            ))}
          </div>

          <div className="h-12 rounded-xl bg-border animate-pulse" />
        </div>
      </div>
    </main>
  );
}
