export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-28 bg-surface rounded" />
      <div>
        <div className="h-7 w-48 bg-border rounded-lg" />
        <div className="h-4 w-36 bg-surface rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F0EDE8]">
                <div className="h-5 w-28 bg-border rounded" />
              </div>
              <div className="divide-y divide-[#F0EDE8]">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center justify-between gap-4 px-6 py-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-48 bg-border rounded" />
                      <div className="h-3 w-36 bg-surface rounded" />
                    </div>
                    <div className="h-5 w-20 bg-surface rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <div className="h-5 w-20 bg-border rounded" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-12 bg-surface rounded" />
                <div className="h-4 w-40 bg-border rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
