"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Movement {
  id: string;
  ingredient_id: string;
  type: "purchase_in" | "recipe_out" | "waste" | "count_adjustment" | "transfer";
  qty: number;
  unit_cost: number | null;
  total_cost: number | null;
  source: string | null;
  reason: string | null;
  created_at: string;
}

export interface IngredientLite {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

const TYPE_FILTERS: Array<{ key: Movement["type"] | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "purchase_in", label: "Purchases" },
  { key: "recipe_out", label: "Deductions" },
  { key: "waste", label: "Waste" },
  { key: "count_adjustment", label: "Counts" },
];

const TYPE_BADGE: Record<Movement["type"], { label: string; cls: string }> = {
  purchase_in: { label: "Purchase", cls: "bg-emerald-100 text-emerald-700" },
  recipe_out: { label: "Deducted", cls: "bg-sky-100 text-sky-700" },
  waste: { label: "Waste", cls: "bg-rose-100 text-rose-700" },
  count_adjustment: { label: "Count", cls: "bg-amber-100 text-amber-800" },
  transfer: { label: "Transfer", cls: "bg-violet-100 text-violet-700" },
};

function fmtKES(n: number | null): string {
  if (n == null) return "—";
  return `KSh ${Math.abs(n).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const inputCls =
  "w-full border border-[#E2DDD5] rounded-xl px-3 py-2.5 text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white";

export function MovementsClient({
  initialMovements,
  ingredients,
  businessId,
}: {
  initialMovements: Movement[];
  ingredients: IngredientLite[];
  businessId: string;
}) {
  const [movements, setMovements] = useState<Movement[]>(initialMovements);
  const [typeFilter, setTypeFilter] = useState<Movement["type"] | "all">("all");
  const [ingredientFilter, setIngredientFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [showNew, setShowNew] = useState(false);

  const ingById = useMemo(() => {
    const m = new Map<string, IngredientLite>();
    ingredients.forEach((i) => m.set(i.id, i));
    return m;
  }, [ingredients]);

  /* ── Realtime subscription ───────────────────────── */

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current == null) supabaseRef.current = createClient();

  useEffect(() => {
    const supabase = supabaseRef.current!;
    const channel = supabase
      .channel(`stock_movements:${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stock_movements",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const row = payload.new as Movement;
          setMovements((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [row, ...prev].slice(0, 200);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  /* ── Local filtering ─────────────────────────────── */

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (ingredientFilter !== "all" && m.ingredient_id !== ingredientFilter) return false;
      if (from && new Date(m.created_at) < new Date(from)) return false;
      if (to && new Date(m.created_at) > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }, [movements, typeFilter, ingredientFilter, from, to]);

  function handleCreated(row: Movement) {
    // The realtime subscription will also fire — dedupe by id.
    setMovements((prev) => (prev.some((m) => m.id === row.id) ? prev : [row, ...prev]));
    setShowNew(false);
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`h-9 px-3 rounded-full text-[12px] font-bold transition-colors ${
                typeFilter === f.key
                  ? "bg-[#16130C] text-white"
                  : "bg-white border border-[#E2DDD5] text-[#5E5848] hover:border-[#9C9485]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          + New movement
        </button>
      </div>

      {/* Secondary filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">Ingredient</label>
          <select
            value={ingredientFilter}
            onChange={(e) => setIngredientFilter(e.target.value)}
            className={inputCls}
          >
            <option value="all">All ingredients</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
      </div>

      {/* Feed */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[14px] text-[#9C9485]">
            No movements match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAFAF8] border-b border-[#E2DDD5]">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[#9C9485]">
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">Ingredient</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right hidden md:table-cell">Unit cost</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5 hidden md:table-cell">Source</th>
                  <th className="px-3 py-2.5 hidden lg:table-cell">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1EC]">
                {filtered.map((m) => {
                  const ing = ingById.get(m.ingredient_id);
                  const badge = TYPE_BADGE[m.type];
                  const positive = Number(m.qty) > 0;
                  return (
                    <tr key={m.id} className="text-[13px]">
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#5E5848]">{fmtWhen(m.created_at)}</td>
                      <td className="px-3 py-2.5 font-semibold text-[#16130C]">
                        {ing?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right whitespace-nowrap font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>
                        {positive ? "+" : ""}{Number(m.qty).toLocaleString("en-KE", { maximumFractionDigits: 2 })} {ing?.unit ?? ""}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap hidden md:table-cell text-[#5E5848]">
                        {fmtKES(m.unit_cost)}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-[#16130C]">
                        {fmtKES(m.total_cost)}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-[#9C9485]">{m.source ?? "—"}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-[#9C9485] max-w-[260px] truncate">{m.reason ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewMovementModal
          ingredients={ingredients}
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

/* ── Modal: manual movement ──────────────────────────── */

function NewMovementModal({
  ingredients,
  onClose,
  onCreated,
}: {
  ingredients: IngredientLite[];
  onClose: () => void;
  onCreated: (row: Movement) => void;
}) {
  const [type, setType] = useState<"purchase_in" | "waste" | "count_adjustment">("purchase_in");
  const [ingredientId, setIngredientId] = useState<string>(ingredients[0]?.id ?? "");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ing = ingredients.find((i) => i.id === ingredientId) ?? null;
  const valid = !!ingredientId && Number(qty) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        ingredient_id: ingredientId,
        type,
        qty: Number(qty),
        reason: reason.trim() || null,
      };
      if (type === "purchase_in" && unitCost.trim()) {
        body.unit_cost = Number(unitCost);
      }
      const res = await fetch("/api/stock/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Failed to log movement");
      }
      const row: Movement = await res.json();
      onCreated(row);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to log movement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-[480px] sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#F4F1EC] flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-[#16130C]">New movement</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-9 rounded-full text-[#9C9485] hover:bg-[#F4F1EC] flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["purchase_in", "waste", "count_adjustment"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`h-12 rounded-xl text-[12px] font-bold transition-colors ${
                    type === t
                      ? "bg-[#16130C] text-white"
                      : "bg-[#F4F1EC] text-[#5E5848] hover:bg-[#E2DDD5]"
                  }`}
                >
                  {t === "purchase_in" ? "Purchase" : t === "waste" ? "Waste" : "Count"}
                </button>
              ))}
            </div>
          </div>

          {/* Ingredient */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Ingredient *</label>
            <select
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
              className={inputCls}
            >
              {ingredients.length === 0 && <option value="">No ingredients yet</option>}
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">
                Qty {ing ? `(${ing.unit})` : ""} *
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            {type === "purchase_in" && (
              <div>
                <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">
                  Unit cost (KES)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder={ing ? String(ing.cost_per_unit) : "0"}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">
              Note <span className="text-[#9C9485] font-normal">· optional</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder={
                type === "waste"
                  ? "e.g. spoiled overnight"
                  : type === "purchase_in"
                    ? "e.g. Soko market, 7 May"
                    : "e.g. fortnightly count"
              }
              className={inputCls}
            />
          </div>

          {err && (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-2.5 text-[13px] text-[#DC2626]">
              {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!valid || busy}
              className="bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-5 h-[44px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50 flex-1"
            >
              {busy ? "Saving…" : "Log movement"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors px-4 h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
