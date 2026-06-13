"use client";

import { useEffect, useMemo, useState } from "react";

interface VarianceRow {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  cost_per_unit: number;
  starting_count: number;
  purchases_in: number;
  theoretical_used: number;
  expected_end: number;
}

function isoStartOf(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}
function isoEndOf(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}
function dateInputValue(d: Date): string {
  // YYYY-MM-DD in local time, what <input type="date"> wants.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmt(n: number, frac = 2): string {
  if (!isFinite(n)) return "—";
  return Number(n).toLocaleString("en-KE", { maximumFractionDigits: frac });
}
function fmtKES(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}KSh ${Math.abs(Math.round(n)).toLocaleString("en-KE")}`;
}

const inputCls =
  "border border-border rounded-xl px-3 py-2.5 text-[14px] text-dark bg-white focus:outline-none focus:border-amber";

export function VarianceClient() {
  // Default range: last 7 days (today inclusive).
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const [from, setFrom] = useState(dateInputValue(weekAgo));
  const [to, setTo] = useState(dateInputValue(today));
  const [rows, setRows] = useState<VarianceRow[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  /* ── Load when range changes ──────────────────────── */

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/stock/variance?start=${encodeURIComponent(isoStartOf(new Date(from)))}&end=${encodeURIComponent(isoEndOf(new Date(to)))}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error("Failed to load");
        const body = await res.json();
        setRows((body.rows ?? []) as VarianceRow[]);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [from, to]);

  /* ── Per-row computation (client-side off the loaded fields) ── */

  type Computed = VarianceRow & {
    actual_qty: number | null;     // null = no count entered yet
    variance_qty: number;          // actual - expected, signed
    variance_kes: number;          // variance_qty * cost_per_unit
    variance_pct: number | null;   // |variance| / theoretical_used (or null)
  };

  const computed: Computed[] = useMemo(() => {
    return rows.map((r) => {
      const raw = counts[r.ingredient_id];
      const actual = raw == null || raw === "" ? null : Number(raw);
      const variance_qty = actual == null ? 0 : actual - Number(r.expected_end);
      const variance_kes = variance_qty * Number(r.cost_per_unit);
      const variance_pct =
        actual != null && Math.abs(Number(r.theoretical_used)) > 0
          ? (variance_qty / Number(r.theoretical_used)) * 100
          : null;
      return {
        ...r,
        actual_qty: actual,
        variance_qty,
        variance_kes,
        variance_pct,
      };
    });
  }, [rows, counts]);

  // Sort by absolute KES variance descending. Rows with no count yet stay
  // at the bottom in alphabetical order.
  const sorted = useMemo(() => {
    return [...computed].sort((a, b) => {
      const aHas = a.actual_qty != null;
      const bHas = b.actual_qty != null;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas) {
        return Math.abs(b.variance_kes) - Math.abs(a.variance_kes);
      }
      return a.ingredient_name.localeCompare(b.ingredient_name);
    });
  }, [computed]);

  const headline = useMemo(() => {
    let total = 0;
    let countedRows = 0;
    for (const r of computed) {
      if (r.actual_qty == null) continue;
      total += r.variance_kes;
      countedRows += 1;
    }
    return { total, countedRows, totalRows: computed.length };
  }, [computed]);

  const headlineCls =
    headline.countedRows === 0
      ? "text-text2"
      : Math.abs(headline.total) < 1
        ? "text-emerald-700"
        : headline.total < 0
          ? "text-rose-700"
          : "text-amber-800";

  /* ── Save physical count ──────────────────────────── */

  async function save() {
    setErr(null);
    setSavedMessage(null);
    const list = computed
      .filter((r) => r.actual_qty != null)
      .map((r) => ({ ingredient_id: r.ingredient_id, actual_qty: r.actual_qty as number }));
    if (list.length === 0) {
      setErr("Enter at least one physical count to save.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/stock/variance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counts: list,
          count_at: isoEndOf(new Date(to)),
          reason: `Variance count ${from} → ${to}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save count");
      }
      const body = await res.json();
      setSavedMessage(
        body.adjustments === 0
          ? "All counts matched — nothing to reconcile."
          : `Saved. ${body.adjustments} ingredient${body.adjustments === 1 ? "" : "s"} reconciled with count_adjustment movements.`,
      );
      // Clear inputs and reload (the saved adjustments shift expected_end going forward).
      setCounts({});
      const reload = await fetch(
        `/api/stock/variance?start=${encodeURIComponent(isoStartOf(new Date(from)))}&end=${encodeURIComponent(isoEndOf(new Date(to)))}`,
      );
      if (reload.ok) {
        const data = await reload.json();
        setRows((data.rows ?? []) as VarianceRow[]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save count");
    } finally {
      setSaving(false);
    }
  }

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="space-y-4">
      {/* Range picker */}
      <div className="bg-white rounded-2xl border border-border p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full`} />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              const w = new Date();
              w.setDate(t.getDate() - 6);
              setFrom(dateInputValue(w));
              setTo(dateInputValue(t));
            }}
            className="h-11 px-3 rounded-full border border-border text-[12px] font-bold text-text2 hover:border-amber"
          >
            Last 7d
          </button>
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              const w = new Date();
              w.setDate(t.getDate() - 29);
              setFrom(dateInputValue(w));
              setTo(dateInputValue(t));
            }}
            className="h-11 px-3 rounded-full border border-border text-[12px] font-bold text-text2 hover:border-amber"
          >
            Last 30d
          </button>
        </div>
      </div>

      {/* Headline KPI */}
      <div className="bg-white rounded-2xl border border-border p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold text-text3 uppercase tracking-wide">Total variance ({from} → {to})</p>
          <p className={`font-display text-[28px] lg:text-[36px] font-bold tracking-[-0.02em] ${headlineCls}`}>
            {headline.countedRows === 0 ? "—" : fmtKES(headline.total)}
          </p>
          <p className="text-[12px] text-text3 mt-1">
            {headline.countedRows === 0
              ? "Enter physical counts below to compute variance."
              : `${headline.countedRows} of ${headline.totalRows} ingredients counted. Negative = lost stock.`}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || headline.countedRows === 0}
          className="bg-amber text-dark font-bold text-[14px] px-5 h-[48px] rounded-full hover:bg-[#d4911c] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save as count"}
        </button>
      </div>

      {savedMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-[13px] font-semibold">
          ✓ {savedMessage}
        </div>
      )}
      {err && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-[13px] font-semibold">
          {err}
        </div>
      )}

      {/* Per-ingredient table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-[14px] text-text3">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="p-6 text-center text-[14px] text-text3">No ingredients yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-canvas border-b border-border">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-text3">
                  <th className="px-4 py-2.5">Ingredient</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">Start</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">+ Purchases</th>
                  <th className="px-4 py-2.5 text-right hidden lg:table-cell">− Theoretical use</th>
                  <th className="px-4 py-2.5 text-right">Expected</th>
                  <th className="px-4 py-2.5 text-right">Actual</th>
                  <th className="px-4 py-2.5 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface">
                {sorted.map((r) => {
                  const hasCount = r.actual_qty != null;
                  const tone =
                    !hasCount
                      ? "text-text3"
                      : Math.abs(r.variance_kes) < 1
                        ? "text-emerald-700"
                        : r.variance_kes < 0
                          ? "text-rose-700"
                          : "text-amber-800";
                  return (
                    <tr key={r.ingredient_id} className="text-[13px]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-dark">{r.ingredient_name}</p>
                        <p className="text-[11px] text-text3">{fmtKES(Number(r.cost_per_unit))} / {r.unit}</p>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-text2 hidden md:table-cell">
                        {fmt(Number(r.starting_count))} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-emerald-700 hidden md:table-cell">
                        +{fmt(Number(r.purchases_in))}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-rose-700 hidden lg:table-cell">
                        −{fmt(Number(r.theoretical_used))}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-dark">
                        {fmt(Number(r.expected_end))} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={counts[r.ingredient_id] ?? ""}
                          onChange={(e) =>
                            setCounts((prev) => ({ ...prev, [r.ingredient_id]: e.target.value }))
                          }
                          placeholder={fmt(Number(r.expected_end))}
                          className="w-24 border border-border rounded-lg px-2 py-2 text-[13px] text-right bg-white focus:outline-none focus:border-amber"
                        />
                      </td>
                      <td className={`px-4 py-3 text-right whitespace-nowrap font-bold ${tone}`}>
                        {hasCount ? fmtKES(r.variance_kes) : "—"}
                        {hasCount && r.variance_pct != null && (
                          <p className="text-[11px] font-semibold opacity-70">
                            {r.variance_pct > 0 ? "+" : ""}
                            {r.variance_pct.toFixed(1)}%
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-text3">
        Saving writes one <code>count_adjustment</code> stock movement per ingredient where the
        physical count differs from expected. Past movements are not modified — the adjustment is
        appended.
      </p>
    </div>
  );
}
