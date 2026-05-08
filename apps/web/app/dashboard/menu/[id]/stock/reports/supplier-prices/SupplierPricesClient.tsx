"use client";

import { useState } from "react";

export interface IngredientPriceHistory {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  current_cost: number;
  points: Array<{
    at: string;
    unit_cost: number;
    qty: number;
    supplier_name: string | null;
  }>;
  alert_delta_pct?: number;
  alert_prev?: number;
  alert_recent?: number;
}

function fmtKES(n: number, frac = 2): string {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: frac })}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

/* ── Sparkline — pure SVG ───────────────────────────── */

function Sparkline({ points }: { points: Array<{ at: string; unit_cost: number }> }) {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return (
      <svg width="120" height="32" viewBox="0 0 120 32">
        <circle cx="60" cy="16" r="3" fill="#E8A020" />
      </svg>
    );
  }
  const ys = points.map((p) => p.unit_cost);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  // Map x to time; y to cost (inverted because SVG y grows down).
  const ts = points.map((p) => new Date(p.at).getTime());
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const tRange = tMax - tMin || 1;
  const W = 120, H = 32, P = 4;

  const xy = points.map((p) => {
    const x = P + ((new Date(p.at).getTime() - tMin) / tRange) * (W - 2 * P);
    const y = H - P - ((p.unit_cost - min) / range) * (H - 2 * P);
    return [x, y] as const;
  });
  const d = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];

  const isUp = ys[ys.length - 1] > ys[0];
  const stroke = isUp ? "#DC2626" : "#16A34A";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
    </svg>
  );
}

export function SupplierPricesClient({
  ingredients,
  alertCount,
}: {
  ingredients: IngredientPriceHistory[];
  alertCount: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (ingredients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center">
        <p className="text-[40px] mb-2">📦</p>
        <p className="font-display text-[16px] font-bold text-[#16130C]">No purchase data yet</p>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Receive a purchase order to start tracking supplier prices over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alertCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-900">
          ⚠️ {alertCount} ingredient{alertCount === 1 ? "" : "s"} have moved more than 10% month-over-month — listed at the top.
        </div>
      )}

      <ul className="bg-white rounded-2xl border border-[#E2DDD5] divide-y divide-[#F4F1EC] overflow-hidden">
        {ingredients.map((ing) => {
          const open = openId === ing.ingredient_id;
          const last = ing.points[ing.points.length - 1];
          const first = ing.points[0];
          const change =
            first && last && Number(first.unit_cost) > 0
              ? ((Number(last.unit_cost) - Number(first.unit_cost)) / Number(first.unit_cost)) * 100
              : null;
          const alertPct = ing.alert_delta_pct;
          return (
            <li key={ing.ingredient_id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : ing.ingredient_id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-[#FAFAF8] active:bg-[#F4F1EC] text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#16130C]">{ing.ingredient_name}</p>
                  <p className="text-[11px] text-[#9C9485]">
                    {ing.points.length} purchase{ing.points.length === 1 ? "" : "s"} · current {fmtKES(Number(ing.current_cost))} / {ing.unit}
                  </p>
                </div>
                <Sparkline points={ing.points} />
                <div className="text-right shrink-0 w-[88px]">
                  {alertPct != null && Math.abs(alertPct) >= 10 ? (
                    <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${alertPct > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {alertPct > 0 ? "+" : ""}
                      {Math.round(alertPct)}% MoM
                    </span>
                  ) : change != null ? (
                    <span className="text-[11px] font-semibold text-[#9C9485]">
                      {change > 0 ? "+" : ""}
                      {change.toFixed(0)}% all-time
                    </span>
                  ) : null}
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 -mt-2">
                  <table className="w-full text-[13px]">
                    <thead className="text-left text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                      <tr>
                        <th className="py-1">When</th>
                        <th className="py-1">Supplier</th>
                        <th className="py-1 text-right">Qty</th>
                        <th className="py-1 text-right">Unit cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F1EC]">
                      {ing.points.map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 text-[#5E5848]">{fmtDate(p.at)}</td>
                          <td className="py-1.5 text-[#5E5848]">{p.supplier_name ?? "—"}</td>
                          <td className="py-1.5 text-right text-[#5E5848]">{Number(p.qty).toLocaleString("en-KE")} {ing.unit}</td>
                          <td className="py-1.5 text-right font-semibold text-[#16130C]">{fmtKES(Number(p.unit_cost))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
