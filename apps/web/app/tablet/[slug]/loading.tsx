/**
 * Shown while a /tablet/[slug] screen fetches. Dark shell to match the
 * terminal, then the light panel the order queue renders on — so the page
 * does not flash from dark to light when the real content lands.
 */
export default function TabletLoading() {
  return (
    <div className="min-h-screen bg-[#0F0D08] animate-pulse">
      <div className="h-16 bg-[#16130C] border-b border-[#2A2520] px-4 sm:px-6 flex items-center justify-between gap-2">
        <div className="h-3 w-40 bg-[#2A2520] rounded" />
        <div className="flex items-center gap-1">
          <div className="h-9 w-20 bg-[#2A2520] rounded-full" />
          <div className="h-9 w-20 bg-[#2A2520] rounded-full" />
        </div>
      </div>
      <div className="bg-[#FAF8F5] min-h-[calc(100vh-64px)] p-4 lg:p-6">
        <div className="h-6 w-24 bg-[#EDE9E2] rounded-lg mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#E2DDD5] bg-white p-4">
              <div className="h-4 w-1/3 bg-[#EDE9E2] rounded" />
              <div className="h-3 w-1/2 bg-[#EDE9E2] rounded mt-2.5" />
              <div className="h-3 w-full bg-[#EDE9E2] rounded mt-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
