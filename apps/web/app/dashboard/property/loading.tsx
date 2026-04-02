export default function PropertyListLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="h-7 w-40 bg-[#E2DDD5] rounded-lg" />
          <div className="h-4 w-56 bg-[#F4F1EC] rounded mt-1.5" />
        </div>
        <div className="h-10 w-28 bg-[#E2DDD5] rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-xl bg-[#F4F1EC]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-[#E2DDD5] rounded" />
                <div className="h-3 w-32 bg-[#F4F1EC] rounded" />
                <div className="h-3 w-40 bg-[#F4F1EC] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
