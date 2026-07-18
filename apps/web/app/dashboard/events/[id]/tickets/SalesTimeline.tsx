"use client";

export default function SalesTimeline({ data }: { data: { day: string; count: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <h2 className="font-bold">Sales</h2>
      <div className="mt-3 flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.count}`}>
            <div className="w-full rounded-t bg-amber-400" style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="text-[9px] text-neutral-400">{d.day.slice(5)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
