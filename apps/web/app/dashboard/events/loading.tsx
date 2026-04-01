export default function EventsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-[#E2DDD5] rounded-lg" />
          <div className="h-4 w-48 bg-[#F4F1EC] rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-[#F4F1EC] rounded-full" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl bg-white border border-[#E2DDD5] p-4 mb-4">
          <div className="shrink-0 w-16 h-16 md:w-28 md:h-20 rounded-xl bg-[#F4F1EC]" />
          <div className="flex-1">
            <div className="h-4 w-3/4 bg-[#E2DDD5] rounded" />
            <div className="h-3 w-1/3 bg-[#F4F1EC] rounded mt-2" />
            <div className="h-5 w-14 bg-[#F4F1EC] rounded-full mt-2" />
          </div>
          <div className="shrink-0 flex flex-col gap-2">
            <div className="h-8 w-16 bg-[#F4F1EC] rounded-lg" />
            <div className="h-8 w-24 bg-[#F4F1EC] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
