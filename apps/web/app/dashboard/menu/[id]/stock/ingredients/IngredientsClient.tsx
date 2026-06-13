"use client";

import { useMemo, useState } from "react";

export interface IngredientRow {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  default_yield: number;
  category: string | null;
  on_hand: number;
  low_stock_threshold: number | null;
  archived: boolean;
  updated_at: string;
}

const UNIT_HINTS = ["g", "kg", "ml", "l", "pcs", "ea", "tbsp", "tsp"];
const CATEGORY_HINTS = ["Produce", "Meat", "Dairy", "Dry", "Bev", "Other"];

const inputCls =
  "w-full border border-border rounded-xl px-3 py-2.5 text-[14px] text-dark placeholder:text-text3 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 bg-white";

function fmtKES(n: number): string {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

export function IngredientsClient({
  initial,
}: {
  menuId: string;
  initial: IngredientRow[];
}) {
  const [rows, setRows] = useState<IngredientRow[]>(initial);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(s) || (r.category ?? "").toLowerCase().includes(s),
    );
  }, [rows, search]);

  async function createIngredient(values: Partial<IngredientRow>) {
    setError(null);
    const res = await fetch("/api/stock/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add ingredient");
      return false;
    }
    const created: IngredientRow = await res.json();
    setRows((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return true;
  }

  async function updateIngredient(id: string, fields: Partial<IngredientRow>) {
    setError(null);
    // Optimistic
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...fields } : r)));
    const res = await fetch("/api/stock/ingredients", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update");
      // We don't have the previous values cached; refresh from server.
      const list = await fetch("/api/stock/ingredients").then((r) => r.json()).catch(() => ({ ingredients: [] }));
      setRows(list.ingredients ?? []);
      return false;
    }
    const updated: IngredientRow = await res.json();
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)).filter((r) => !r.archived));
    return true;
  }

  async function archiveIngredient(id: string) {
    if (!confirm("Archive this ingredient? It will be hidden from the list — recipes that use it will continue to work.")) return;
    await updateIngredient(id, { archived: true });
  }

  return (
    <div className="space-y-4">
      {/* Top bar: search + add */}
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
          onClick={() => {
            setShowAdd((s) => !s);
            setEditingId(null);
          }}
          className="bg-amber text-dark font-bold text-[14px] px-5 h-[46px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm shrink-0"
        >
          {showAdd ? "Cancel" : "+ New ingredient"}
        </button>
      </div>

      {/* Inline add form */}
      {showAdd && (
        <IngredientForm
          onSubmit={async (v) => {
            const ok = await createIngredient(v);
            if (ok) setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {error && (
        <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-3 text-[13px] text-[#DC2626]">
          {error}
        </div>
      )}

      {/* Table / list */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[14px] text-text3">
              {rows.length === 0
                ? 'No ingredients yet. Tap "+ New ingredient" to add your first.'
                : "No matches for that search."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-surface">
            {filtered.map((r) =>
              editingId === r.id ? (
                <li key={r.id} className="p-4">
                  <IngredientForm
                    initial={r}
                    onSubmit={async (v) => {
                      const ok = await updateIngredient(r.id, v);
                      if (ok) setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li
                  key={r.id}
                  className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
                >
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-[14px] font-semibold text-dark">{r.name}</p>
                    <p className="text-[12px] text-text3">
                      {r.category ?? "Uncategorised"} · {fmtKES(r.cost_per_unit)} / {r.unit} · yield {Math.round(r.default_yield * 100)}%
                    </p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-[12px] text-text3">On hand</p>
                    <p className="text-[14px] font-semibold text-dark">
                      {Number(r.on_hand).toLocaleString("en-KE", { maximumFractionDigits: 2 })} {r.unit}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(r.id);
                        setShowAdd(false);
                      }}
                      className="h-9 px-3 rounded-full text-[12px] font-semibold border border-border text-text2 hover:border-amber hover:text-amber transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => archiveIngredient(r.id)}
                      className="h-9 px-3 rounded-full text-[12px] font-semibold border border-border text-text2 hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Inline form (used for both create and edit) ─────── */

function IngredientForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<IngredientRow>;
  onSubmit: (values: {
    name: string;
    unit: string;
    cost_per_unit: number;
    default_yield: number;
    category: string | null;
    low_stock_threshold: number | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "g");
  const [cost, setCost] = useState(initial?.cost_per_unit?.toString() ?? "");
  const [yld, setYld] = useState(((initial?.default_yield ?? 1) * 100).toString());
  const [category, setCategory] = useState(initial?.category ?? "");
  const [threshold, setThreshold] = useState(
    initial?.low_stock_threshold != null ? String(initial.low_stock_threshold) : "",
  );
  const [busy, setBusy] = useState(false);

  const valid = name.trim().length > 0 && unit.trim().length > 0 && Number(cost) >= 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit: unit.trim(),
        cost_per_unit: Number(cost) || 0,
        default_yield: Math.min(1, Math.max(0.01, Number(yld) / 100 || 1)),
        category: category.trim() || null,
        low_stock_threshold: threshold === "" ? null : Number(threshold),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="border border-border rounded-2xl p-4 bg-canvas space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-dark mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Chicken thigh fillet"
            className={inputCls}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-dark mb-1">Category</label>
          <input
            type="text"
            list="ingredient-category-hints"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Produce / Meat / Dairy / Dry / Bev"
            className={inputCls}
          />
          <datalist id="ingredient-category-hints">
            {CATEGORY_HINTS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-dark mb-1">Unit *</label>
          <input
            type="text"
            list="ingredient-unit-hints"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className={inputCls}
            required
          />
          <datalist id="ingredient-unit-hints">
            {UNIT_HINTS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-dark mb-1">Cost / unit (KES)</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-dark mb-1">
            Default yield %
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max="100"
            step="1"
            value={yld}
            onChange={(e) => setYld(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-dark mb-1">
            Low-stock threshold
            <span className="text-text3 font-normal"> · optional</span>
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className={inputCls}
            placeholder={`In ${unit || "units"}`}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!valid || busy}
          className="bg-amber text-dark font-bold text-[13px] px-5 h-[40px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
        >
          {busy ? "Saving…" : initial?.id ? "Save changes" : "Add ingredient"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] font-semibold text-text3 hover:text-dark transition-colors px-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
