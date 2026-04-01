export default function ListingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-32 bg-[#E2DDD5] rounded-lg" />
          <div className="h-4 w-40 bg-[#F4F1EC] rounded mt-2" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] p-3 mb-3">
          <div className="flex gap-3">
            <div className="shrink-0 w-14 h-14 lg:w-20 lg:h-16 rounded-xl bg-[#F4F1EC]" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-[#E2DDD5] rounded" />
              <div className="h-3 w-1/3 bg-[#F4F1EC] rounded mt-2" />
              <div className="h-5 w-16 bg-[#F4F1EC] rounded-full mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
