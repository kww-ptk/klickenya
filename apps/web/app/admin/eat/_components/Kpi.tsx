export function Kpi({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  hint?: string;
  /** "alert" is for numbers that mean someone has to do something. */
  tone?: "plain" | "alert" | "good";
}) {
  const ring =
    tone === "alert"
      ? "border-amber-300 bg-amber-50"
      : tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : "border-zinc-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${ring}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="font-display text-[26px] font-bold leading-none text-zinc-900 mt-1.5">
        {value}
      </p>
      {hint && <p className="text-[12px] text-zinc-500 mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}
