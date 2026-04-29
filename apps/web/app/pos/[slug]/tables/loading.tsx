/**
 * Tables grid skeleton — shown while the page fetches the active table list
 * and the client polls for live sessions. Mirrors the real grid layout so
 * the transition feels instant even on a cold cache.
 */
export default function PosTablesLoading() {
  return (
    <div className="min-h-screen flex flex-col animate-pulse">
      {/* Header (matches PosHeader) */}
      <header className="h-14 border-b border-[#2A2520] bg-[#1A170F] flex items-center justify-between px-4">
        <div className="h-4 w-32 rounded bg-[#252019]" />
        <div className="h-8 w-20 rounded-full bg-[#252019]" />
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 pt-3 pb-24">
        {/* Search + status filter row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-11 rounded-full bg-[#1A170F]" />
          <div className="h-11 w-24 rounded-full bg-[#1A170F]" />
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-[#1A170F]" />
          ))}
        </div>

        {/* Table cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="h-3 w-12 rounded bg-[#252019]" />
                <div className="h-6 w-20 rounded bg-[#252019]" />
              </div>
              <div className="h-3 w-16 rounded bg-[#252019]" />
            </div>
          ))}
        </div>
      </main>

      {/* Tab bar (matches PosTabBar) */}
      <div className="h-16 border-t border-[#2A2520] bg-[#1A170F]" />
    </div>
  );
}
