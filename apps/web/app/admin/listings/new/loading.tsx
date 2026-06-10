export default function NewListingLoading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="h-4 w-32 bg-border rounded-full animate-pulse" />
      <div>
        <div className="h-7 w-40 bg-border rounded-full animate-pulse mb-2" />
        <div className="h-4 w-72 bg-border rounded-full animate-pulse" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
          <div className="h-5 w-32 bg-border rounded-full animate-pulse" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j}>
              <div className="h-3 w-20 bg-border rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-[#F0EDE8] rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
