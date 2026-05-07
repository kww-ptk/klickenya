"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface PORow {
  id: string;
  po_number: string | null;
  status: "draft" | "sent" | "partial" | "received" | "cancelled";
  supplier_id: string | null;
  expected_at: string | null;
  ordered_at: string | null;
  received_at: string | null;
  total_kes: number;
  received_total_kes: number;
  created_at: string;
}

export interface SupplierLite {
  id: string;
  name: string;
}

const TABS: Array<{ key: PORow["status"] | "all"; label: string }> = [
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "partial", label: "Partial" },
  { key: "received", label: "Received" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_PILL: Record<PORow["status"], string> = {
  draft: "bg-[#F4F1EC] text-[#5E5848]",
  sent: "bg-sky-100 text-sky-800",
  partial: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

function fmtKES(n: number): string {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}

const inputCls =
  "border border-[#E2DDD5] rounded-xl px-3 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white";

export function PurchasesClient({
  menuId,
  initialOrders,
  suppliers,
}: {
  menuId: string;
  initialOrders: PORow[];
  suppliers: SupplierLite[];
}) {
  const [tab, setTab] = useState<PORow["status"] | "all">("draft");
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const supplierName = useMemo(() => {
    const m = new Map<string, string>();
    suppliers.forEach((s) => m.set(s.id, s.name));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [suppliers]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: initialOrders.length };
    initialOrders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [initialOrders]);

  const filtered = useMemo(() => {
    return initialOrders.filter((o) => {
      if (tab !== "all" && o.status !== tab) return false;
      if (supplierFilter !== "all" && o.supplier_id !== supplierFilter) return false;
      if (search && !(o.po_number ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [initialOrders, tab, supplierFilter, search]);

  return (
    <div className="space-y-4">
      {/* Tabs — horizontally scrollable on mobile */}
      <div className="-mx-2 sm:mx-0 overflow-x-auto">
        <div className="flex gap-1.5 px-2 sm:px-0 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`h-11 px-4 rounded-full text-[13px] font-bold transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "bg-[#16130C] text-white"
                  : "bg-white border border-[#E2DDD5] text-[#5E5848]"
              }`}
            >
              {t.label}
              {counts[t.key] != null && (
                <span className={`ml-1.5 text-[11px] ${tab === t.key ? "opacity-70" : "text-[#9C9485]"}`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search + supplier filter */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by PO number…"
          className={`${inputCls} w-full`}
        />
        <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className={`${inputCls} w-full`}>
          <option value="all">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Empty / list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center text-[14px] text-[#9C9485]">
          No purchase orders match.
        </div>
      ) : (
        <>
          {/* Mobile cards (< md) */}
          <ul className="md:hidden space-y-2">
            {filtered.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/dashboard/menu/${menuId}/stock/purchases/${o.id}`}
                  className="block bg-white rounded-2xl border border-[#E2DDD5] p-4 active:bg-[#FAFAF8]"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[15px] font-bold text-[#16130C]">{o.po_number ?? "—"}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_PILL[o.status]}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#5E5848]">{supplierName(o.supplier_id)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[12px] text-[#9C9485]">Due {fmtDate(o.expected_at)}</p>
                    <p className="text-[14px] font-bold text-[#16130C]">{fmtKES(o.total_kes)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop table (≥ md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#E2DDD5] overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#FAFAF8] border-b border-[#E2DDD5]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                  <th className="px-4 py-2.5">PO #</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5">Expected</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EC]">
                {filtered.map((o) => (
                  <tr key={o.id} className="text-[13px] hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 font-bold text-[#16130C]">
                      <Link href={`/dashboard/menu/${menuId}/stock/purchases/${o.id}`} className="hover:text-[#E8A020]">
                        {o.po_number ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#5E5848]">{supplierName(o.supplier_id)}</td>
                    <td className="px-4 py-3 text-[#5E5848]">{fmtDate(o.expected_at)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#16130C]">{fmtKES(o.total_kes)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_PILL[o.status]}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
