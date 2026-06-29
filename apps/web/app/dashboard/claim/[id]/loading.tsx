export default function Loading() {
  return (
    <div className="max-w-xl animate-pulse">
      <div className="h-4 w-32 bg-border/60 rounded mb-5" />
      <div className="h-7 w-2/3 bg-border/60 rounded mb-2" />
      <div className="h-4 w-full bg-border/40 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
        <div className="h-10 bg-border/40 rounded-xl" />
        <div className="h-10 bg-border/40 rounded-xl" />
        <div className="h-10 bg-border/40 rounded-xl" />
        <div className="h-24 bg-border/30 rounded-xl" />
        <div className="h-11 bg-border/50 rounded-full" />
      </div>
    </div>
  );
}
