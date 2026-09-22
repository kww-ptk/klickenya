/**
 * Shown while a restaurant page under /manage/listings/[id] fetches — most
 * often the live order queue. The listing header and tab strip come from
 * layout.tsx and stay put; this only stands in for the page body.
 */
export default function ManageListingLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div>
        <div className="h-3 w-32 bg-[#EDE9E2] rounded" />
        <div className="h-7 w-56 bg-[#EDE9E2] rounded-lg mt-3" />
        <div className="h-3 w-72 max-w-full bg-[#EDE9E2] rounded mt-2.5" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-[#E2DDD5] bg-white p-4">
            <div className="h-4 w-1/3 bg-[#EDE9E2] rounded" />
            <div className="h-3 w-1/2 bg-[#EDE9E2] rounded mt-2.5" />
            <div className="h-3 w-full bg-[#EDE9E2] rounded mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
