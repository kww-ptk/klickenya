export default function AttendeesLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-[#F4F1EC] rounded mb-6" />
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-28 bg-[#E2DDD5] rounded-lg" />
          <div className="h-4 w-44 bg-[#F4F1EC] rounded mt-2" />
        </div>
        <div className="h-9 w-24 bg-[#F4F1EC] rounded-lg" />
      </div>
      <div className="rounded-xl border border-[#E2DDD5] overflow-hidden">
        <div className="bg-[#F4F1EC] px-4 py-3 flex gap-8">
          {["w-20", "w-24", "w-16", "w-14", "w-16"].map((w, i) => (
            <div key={i} className={`h-3 ${w} bg-[#E2DDD5] rounded hidden ${i < 2 || i === 3 ? "block" : "md:block"}`} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 px-4 py-3 border-t border-[#E2DDD5]">
            <div className="h-4 w-24 bg-[#F4F1EC] rounded" />
            <div className="h-4 w-32 bg-[#F4F1EC] rounded hidden md:block" />
            <div className="h-4 w-20 bg-[#F4F1EC] rounded hidden md:block" />
            <div className="h-5 w-16 bg-[#F4F1EC] rounded-full" />
            <div className="h-4 w-12 bg-[#F4F1EC] rounded hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
