export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-4 w-36 bg-[#F4F1EC] rounded" />
      <div>
        <div className="h-7 w-56 bg-[#E2DDD5] rounded-lg" />
        <div className="h-4 w-72 bg-[#F4F1EC] rounded mt-2" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
              <div className="h-5 w-24 bg-[#E2DDD5] rounded" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-3 w-16 bg-[#F4F1EC] rounded" />
                    <div className="h-4 w-40 bg-[#E2DDD5] rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <div className="h-5 w-24 bg-[#E2DDD5] rounded" />
            {[1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 bg-[#F4F1EC] rounded" />
                <div className="h-4 w-32 bg-[#E2DDD5] rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
