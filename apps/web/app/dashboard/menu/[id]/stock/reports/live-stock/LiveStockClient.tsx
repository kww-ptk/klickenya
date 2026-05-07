"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface LiveStockRow {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  cost_per_unit: number;
  current_qty: number;
  current_value_kes: number;
  last_movement_at: string | null;
  avg_daily_consumption_14d: number;
  days_of_cover: number | null;
  low_stock_threshold: number | null;
}

type SortKey = "name" | "qty" | "value" | "cover";

function fmt(n: number, frac = 2): string {
  if (!isFinite(n)) return "—";
  return Number(n).toLocaleString("en-KE", { maximumFractionDigits: frac });
}
function fmtKES(n: number): string {
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}
function fmtRel(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (24 * 3600 * 1000));
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function coverTone(days: number | null, qty: number, threshold: number | null): {
  cls: string;
  label: string;
} {
  if (threshold != null && qty <= threshold) {
    return { cls: "bg-rose-100 text-rose-700", label: "Below threshold" };
  }
  if (days == null) return { cls: "bg-[#F4F1EC] text-[#5E5848]", label: "—" };
  if (days < 3) return { cls: "bg-rose-100 text-rose-700", label: `${days.toFixed(1)}d` };
  if (days < 7) return { cls: "bg-amber-100 text-amber-800", label: `${days.toFixed(1)}d` };
  if (days > 90) return { cls: "bg-emerald-100 text-emerald-700", label: "90d+" };
  return { cls: "bg-emerald-100 text-emerald-700", label: `${days.toFixed(1)}d` };
}

export function LiveStockClient({ menuId, rows }: { menuId: string; rows: LiveStockRow[] }) {
  const [sort, setSort] = useState<SortKey>("cover");
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) =>
      search ? r.ingredient_name.toLowerCase().includes(search.toLowerCase()) : true,
    );
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.ingredient_name.localeCompare(b.ingredient_name);
        case "qty":
          return Number(b.current_qty) - Number(a.current_qty);
        case "value":
          return Number(b.current_value_kes) - Number(a.current_value_kes);
        case "cover": {
          // Lowest cover first (most urgent), nulls last
          const av = a.days_of_cover == null ? Infinity : Number(a.days_of_cover);
          const bv = b.days_of_cover == null ? Infinity : Number(b.days_of_cover);
          return av - bv;
        }
      }
    });
    return copy;
  }, [rows, sort, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ingredients…"
          className="flex-1 border border-[#E2DDD5] rounded-xl px-3 py-3 text-[14px] bg-white focus:outline-none focus:border-[#E8A020]"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border border-[#E2DDD5] rounded-xl px-3 py-3 text-[14px] bg-white focus:outline-none focus:border-[#E8A020]"
        >
          <option value="cover">Sort: days of cover (low → high)</option>
          <option value="name">Sort: name</option>
          <option value="qty">Sort: quantity</option>
          <option value="value">Sort: value</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2DDD5] overflow-hidden">
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-[14px] text-[#9C9485]">No ingredients to show.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAFAF8] border-b border-[#E2DDD5]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                  <th className="px-4 py-2.5">Ingredient</th>
                  <th className="px-4 py-2.5 text-right">On hand</th>
                  <th className="px-4 py-2.5 text-right hidden sm:table-cell">Value</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">Daily use</th>
                  <th className="px-4 py-2.5 text-right">Days cover</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Last movement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EC]">
                {sorted.map((r) => {
                  const tone = coverTone(
                    r.days_of_cover == null ? null : Number(r.days_of_cover),
                    Number(r.current_qty),
                    r.low_stock_threshold == null ? null : Number(r.low_stock_threshold),
                  );
                  return (
                    <tr key={r.ingredient_id} className="text-[13px]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/menu/${menuId}/stock/movements?ingredient_id=${r.ingredient_id}`}
                          className="font-semibold text-[#16130C] hover:text-[#E8A020]"
                        >
                          {r.ingredient_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-[#16130C] font-semibold">
                        {fmt(Number(r.current_qty))} {r.unit}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-[#5E5848] hidden sm:table-cell">
                        {fmtKES(Number(r.current_value_kes))}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-[#9C9485] hidden md:table-cell">
                        {fmt(Number(r.avg_daily_consumption_14d))} {r.unit}/d
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${tone.cls}`}>
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#9C9485] hidden md:table-cell">
                        {fmtRel(r.last_movement_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
