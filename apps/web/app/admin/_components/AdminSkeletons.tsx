/** Reusable skeleton blocks for admin loading states */

export function AdminHeaderSkeleton({ width = "w-40" }: { width?: string }) {
  return (
    <div className="mb-6">
      <div className={`h-7 ${width} bg-[#E2DDD5] rounded-lg`} />
      <div className="h-4 w-52 bg-[#F4F1EC] rounded mt-2" />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-[#E2DDD5] overflow-hidden bg-white">
      <div className="flex gap-6 px-5 py-3 bg-[#F4F1EC]">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-3 rounded ${i === 0 ? "w-32" : "w-16"} bg-[#E2DDD5]`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-t border-[#E2DDD5]">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-4 rounded bg-[#F4F1EC] ${j === 0 ? "w-40" : "w-20"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AdminCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] p-4 text-center">
          <div className="h-7 w-10 bg-[#F4F1EC] rounded mx-auto" />
          <div className="h-3 w-16 bg-[#F4F1EC] rounded mx-auto mt-2" />
        </div>
      ))}
    </div>
  );
}

export function AdminListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#E2DDD5] p-4">
          <div className="flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-[#F4F1EC]" />
            <div className="flex-1">
              <div className="h-4 w-1/2 bg-[#E2DDD5] rounded" />
              <div className="h-3 w-1/3 bg-[#F4F1EC] rounded mt-2" />
              <div className="h-3 w-full bg-[#F4F1EC] rounded mt-3" />
            </div>
            <div className="h-6 w-16 bg-[#F4F1EC] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
