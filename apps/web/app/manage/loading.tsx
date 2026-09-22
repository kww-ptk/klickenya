/**
 * Shown while a /manage page fetches. The sidebar, mobile header and bottom
 * nav come from layout.tsx and stay put; this only stands in for the page
 * body — a heading and three cards on the light manage ground.
 */
export default function ManageLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-[220px] bg-[#EDE9E2] rounded-lg mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-[#E2DDD5]" />
        ))}
      </div>
    </div>
  );
}
