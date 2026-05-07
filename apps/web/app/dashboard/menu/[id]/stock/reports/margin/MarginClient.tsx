"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface MarginRow {
  menu_item_id: string;
  menu_item_name: string;
  portions_sold: number;
  revenue: number;
  cogs: number;
  margin_kes: number;
  margin_pct: number;
  food_cost_pct: number;
  refreshed_at: string;
}

type SortKey = "margin_kes" | "margin_pct" | "revenue" | "portions" | "name";

function fmtKES(n: number): string {
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

export function MarginClient({ menuId, rows }: { menuId: string; rows: MarginRow[] }) {
  const [sort, setSort] = useState<SortKey>("margin_kes");

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      switch (sort) {
        case "margin_kes": return Number(b.margin_kes) - Number(a.margin_kes);
        case "margin_pct": return Number(b.margin_pct) - Number(a.margin_pct);
        case "revenue":    return Number(b.revenue) - Number(a.revenue);
        case "portions":   return Number(b.portions_sold) - Number(a.portions_sold);
        case "name":       return a.menu_item_name.localeCompare(b.menu_item_name);
      }
    });
    return copy;
  }, [rows, sort]);

  // Top 10 by absolute margin in KES (positive). Used for the bar chart.
  const top10 = useMemo(
    () => [...rows].sort((a, b) => Math.abs(Number(b.margin_kes)) - Math.abs(Number(a.margin_kes))).slice(0, 10),
    [rows],
  );
  const max = Math.max(0.001, ...top10.map((r) => Math.abs(Number(r.margin_kes))));

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center">
        <p className="text-[40px] mb-2">📊</p>
        <p className="font-display text-[16px] font-bold text-[#16130C]">No margin data yet</p>
        <p className="text-[13px] text-[#9C9485] mt-1">
          Once orders move through &apos;preparing&apos; and stock auto-deducts, margins will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bar chart — pure CSS, no chart lib */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-5">
        <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wide mb-3">
          Top 10 dishes by margin (KES, last 30d)
        </p>
        <ul className="space-y-1.5">
          {top10.map((r) => {
            const pct = (Math.abs(Number(r.margin_kes)) / max) * 100;
            const isLoss = Number(r.margin_kes) < 0;
            return (
              <li key={r.menu_item_id} className="grid grid-cols-[1fr_120px] gap-3 items-center">
                <Link
                  href={`/dashboard/menu/${menuId}/items/${r.menu_item_id}`}
                  className="text-[13px] font-semibold text-[#16130C] truncate hover:text-[#E8A020]"
                  title={r.menu_item_name}
                >
                  {r.menu_item_name}
                </Link>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-5 bg-[#F4F1EC] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isLoss ? "bg-rose-500" : "bg-[#E8A020]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold w-[68px] text-right ${isLoss ? "text-rose-700" : "text-[#16130C]"}`}>
                    {fmtKES(Number(r.margin_kes))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sort + table */}
      <div className="flex items-center justify-between">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-[#E2DDD5] rounded-xl px-3 py-2.5 text-[14px] bg-white focus:outline-none focus:border-[#E8A020]"
        >
          <option value="margin_kes">Sort: margin KES</option>
          <option value="margin_pct">Sort: margin %</option>
          <option value="revenue">Sort: revenue</option>
          <option value="portions">Sort: portions sold</option>
          <option value="name">Sort: name</option>
        </select>
        <p className="text-[11px] text-[#9C9485]">
          {rows[0]?.refreshed_at
            ? `Refreshed ${new Date(rows[0].refreshed_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
            : ""}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2DDD5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#FAFAF8] border-b border-[#E2DDD5]">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                <th className="px-4 py-2.5">Dish</th>
                <th className="px-4 py-2.5 text-right">Sold</th>
                <th className="px-4 py-2.5 text-right hidden sm:table-cell">Revenue</th>
                <th className="px-4 py-2.5 text-right hidden sm:table-cell">COGS</th>
                <th className="px-4 py-2.5 text-right">Margin</th>
                <th className="px-4 py-2.5 text-right">FC %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F1EC]">
              {sorted.map((r) => {
                const fc = Number(r.food_cost_pct);
                const fcHigh = fc > 35;
                return (
                  <tr key={r.menu_item_id} className="text-[13px]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/menu/${menuId}/items/${r.menu_item_id}`}
                        className="font-semibold text-[#16130C] hover:text-[#E8A020]"
                      >
                        {r.menu_item_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-[#5E5848]">
                      {Number(r.portions_sold).toLocaleString("en-KE")}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-[#5E5848] hidden sm:table-cell">
                      {fmtKES(Number(r.revenue))}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-[#5E5848] hidden sm:table-cell">
                      {fmtKES(Number(r.cogs))}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-[#16130C]">
                      {fmtKES(Number(r.margin_kes))}
                      <p className="text-[11px] font-semibold text-[#9C9485]">
                        {Number(r.margin_pct).toFixed(0)}%
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${fcHigh ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {fc.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
