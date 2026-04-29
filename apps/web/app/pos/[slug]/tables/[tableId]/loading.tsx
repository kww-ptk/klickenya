/**
 * Session detail skeleton — the heaviest page in the POS. Shown while the
 * server component resolves the table + the active session id, before
 * PosSessionDetail (client) starts its own fetches.
 */
export default function PosSessionDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col animate-pulse">
      {/* Header */}
      <header className="h-14 border-b border-[#2A2520] bg-[#1A170F] flex items-center justify-between px-4">
        <div className="h-4 w-32 rounded bg-[#252019]" />
        <div className="h-8 w-20 rounded-full bg-[#252019]" />
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 pt-3 pb-24">
        {/* Top bar: back + table + status */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#252019] shrink-0" />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="h-3 w-12 rounded bg-[#252019]" />
            <div className="h-5 w-32 rounded bg-[#252019]" />
          </div>
          <div className="h-6 w-14 rounded-full bg-[#252019]" />
        </div>

        {/* Order entry split — menu (left) + draft (right). Matches md+ layout. */}
        <div className="md:grid md:grid-cols-5 md:gap-3 space-y-3 md:space-y-0">
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-3 space-y-3">
              <div className="h-10 rounded-lg bg-[#252019]" />
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 rounded-full bg-[#252019] shrink-0" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#252019]" />
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            {/* Current order draft */}
            <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 space-y-3">
              <div className="h-4 w-28 rounded bg-[#252019]" />
              <div className="h-16 rounded-lg bg-[#252019]" />
              <div className="h-11 rounded-full bg-[#252019]" />
            </div>

            {/* Session meta */}
            <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-12 rounded bg-[#252019]" />
                <div className="h-3 w-8 rounded bg-[#252019]" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-3 w-16 rounded bg-[#252019]" />
                <div className="h-3 w-12 rounded bg-[#252019]" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-full bg-[#252019]" />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Tab bar */}
      <div className="h-16 border-t border-[#2A2520] bg-[#1A170F]" />
    </div>
  );
}
