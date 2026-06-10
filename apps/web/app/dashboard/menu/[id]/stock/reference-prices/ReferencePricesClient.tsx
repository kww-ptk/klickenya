"use client";

import { useMemo, useState } from "react";

export interface PlatformPriceRow {
  canonical_name: string;
  unit: string;
  restaurant_count: number;
  sample_size: number;
  median_kes: number;
  p25_kes: number | null;
  p75_kes: number | null;
  min_kes: number | null;
  max_kes: number | null;
  last_seen_at: string | null;
}

interface AiPriceRow {
  canonical_name: string;
  unit: "g" | "ml";
  median_kes: number;
  p25_kes: number | null;
  p75_kes: number | null;
  notes: string | null;
  source: "ai_estimate";
}

type Row =
  | (PlatformPriceRow & { source: "platform" })
  | AiPriceRow;

function fmtKES(n: number | null, frac = 2): string {
  if (n == null || !isFinite(n)) return "—";
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: frac })}`;
}
function fmtPerKg(unitKes: number, unit: string): string {
  if (unit === "g") return `${fmtKES(unitKes * 1000, 0)} / kg`;
  if (unit === "ml") return `${fmtKES(unitKes * 1000, 0)} / l`;
  return `${fmtKES(unitKes)} / ${unit}`;
}

const inputCls =
  "border border-border rounded-xl px-3 py-2.5 text-[14px] text-dark placeholder:text-text3 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 bg-white";

export function ReferencePricesClient({ initial }: { initial: PlatformPriceRow[] }) {
  const [search, setSearch] = useState("");
  const [aiRows, setAiRows] = useState<AiPriceRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const platformRows: Row[] = useMemo(
    () => initial.map((r) => ({ ...r, source: "platform" as const })),
    [initial],
  );

  const merged: Row[] = useMemo(() => {
    // Platform rows take precedence over AI rows when there's overlap.
    const seen = new Set(platformRows.map((r) => `${r.canonical_name}|${r.unit}`));
    const aiOnly = aiRows.filter((r) => !seen.has(`${r.canonical_name}|${r.unit}`));
    const all = [...platformRows, ...aiOnly];
    const s = search.trim().toLowerCase();
    const filtered = s ? all.filter((r) => r.canonical_name.includes(s)) : all;
    return filtered.sort((a, b) => a.canonical_name.localeCompare(b.canonical_name));
  }, [platformRows, aiRows, search]);

  async function generate() {
    setGenerating(true);
    setErr(null);
    try {
      const res = await fetch("/api/stock/reference-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to generate suggestions");
      setAiRows(body.rows ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to generate suggestions");
    } finally {
      setGenerating(false);
    }
  }

  const platformCount = platformRows.length;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients…"
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="bg-white border border-amber/40 text-amber font-bold text-[13px] px-5 h-[46px] rounded-full hover:bg-amber/5 disabled:opacity-50 shrink-0"
        >
          {generating ? "Asking AI…" : aiRows.length === 0 ? "✨ Suggest common prices" : "✨ Refresh AI suggestions"}
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-[13px] font-semibold">
          {err}
        </div>
      )}

      {/* Empty state for platform aggregates */}
      {platformCount === 0 && aiRows.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-6">
          <p className="font-display text-[16px] font-bold text-dark mb-1">
            No platform data yet
          </p>
          <p className="text-[13px] text-text2 leading-snug">
            Cross-restaurant averages appear once at least <strong>3 different restaurants</strong> have logged purchases for the same ingredient (last 180 days). Until then, tap <span className="font-semibold">✨ Suggest common prices</span> to see AI estimates for typical Kenyan coastal kitchen ingredients.
          </p>
        </div>
      )}

      {/* Source legend */}
      {(platformCount > 0 || aiRows.length > 0) && (
        <div className="flex flex-wrap gap-3 text-[11px] text-text3">
          {platformCount > 0 && (
            <span>
              <span className="inline-block size-2 rounded-full bg-emerald-500 align-middle mr-1.5" />
              <strong className="text-dark">{platformCount}</strong> from real purchases
            </span>
          )}
          {aiRows.length > 0 && (
            <span>
              <span className="inline-block size-2 rounded-full bg-amber align-middle mr-1.5" />
              <strong className="text-dark">{aiRows.length}</strong> AI estimates
            </span>
          )}
          <span className="ml-auto">k-anonymised at ≥ 3 buyers</span>
        </div>
      )}

      {/* Table */}
      {merged.length > 0 && (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-canvas border-b border-border">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-text3">
                  <th className="px-4 py-2.5">Ingredient</th>
                  <th className="px-4 py-2.5 text-right">Median</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">Range (p25–p75)</th>
                  <th className="px-4 py-2.5 text-right hidden lg:table-cell">Per kg / l</th>
                  <th className="px-4 py-2.5 hidden sm:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {merged.map((r) => (
                  <tr key={`${r.source}|${r.canonical_name}|${r.unit}`} className="text-[13px]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-dark">
                        {r.canonical_name.replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                      <p className="text-[11px] text-text3">
                        unit: {r.unit}
                        {r.source === "ai_estimate" && r.notes && <> · {r.notes}</>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-dark">
                      {fmtKES(r.median_kes)}
                      <p className="text-[11px] font-normal text-text3">/ {r.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-text2 hidden md:table-cell">
                      {r.p25_kes != null && r.p75_kes != null ? (
                        <>
                          {fmtKES(r.p25_kes)} – {fmtKES(r.p75_kes)}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-text2 hidden lg:table-cell">
                      {fmtPerKg(Number(r.median_kes), r.unit)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {r.source === "platform" ? (
                        <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-emerald-100 text-emerald-700">
                          {r.restaurant_count} buyers · n={r.sample_size}
                        </span>
                      ) : (
                        <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-amber/10 text-amber">
                          AI estimate
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-text3 leading-relaxed">
        Platform medians come from real purchase orders and stock movements logged by Klickenya restaurants in the last 180 days. AI estimates are model-generated suggestions for common items and should be treated as ballparks — verify against your supplier.
      </p>
    </div>
  );
}
