"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface SupplierLite {
  id: string;
  name: string;
}
export interface IngredientLite {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
}

interface WorkingLine {
  key: string;
  ingredient_id: string | null;
  qty: string;
  unit_cost: string;
}

let lineCounter = 0;
const newKey = () => `line-${++lineCounter}-${Date.now()}`;

function fmtKES(n: number): string {
  if (!isFinite(n)) return "—";
  return `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

const inputCls =
  "w-full border border-[#E2DDD5] rounded-xl px-3 py-3 text-[15px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white";

export function NewPurchaseClient({
  menuId,
  suppliers: initialSuppliers,
  ingredients,
}: {
  menuId: string;
  suppliers: SupplierLite[];
  ingredients: IngredientLite[];
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierLite[]>(initialSuppliers);
  const [supplierId, setSupplierId] = useState<string | null>(initialSuppliers[0]?.id ?? null);
  const [expectedAt, setExpectedAt] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<WorkingLine[]>(() => [
    { key: newKey(), ingredient_id: null, qty: "", unit_cost: "" },
  ]);
  const [busy, setBusy] = useState<null | "draft" | "sent">(null);
  const [err, setErr] = useState<string | null>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const ingredientById = useMemo(() => {
    const m = new Map<string, IngredientLite>();
    ingredients.forEach((i) => m.set(i.id, i));
    return m;
  }, [ingredients]);

  const total = useMemo(() => {
    return lines.reduce((sum, l) => {
      const q = Number(l.qty) || 0;
      const c = Number(l.unit_cost) || 0;
      return sum + q * c;
    }, 0);
  }, [lines]);

  function updateLine(key: string, patch: Partial<WorkingLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickIngredient(key: string, id: string) {
    // Pre-fill unit_cost from the ingredient's last-known price.
    const ing = ingredientById.get(id);
    setLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? { ...l, ingredient_id: id, unit_cost: l.unit_cost || (ing ? String(ing.cost_per_unit) : "") }
          : l,
      ),
    );
  }

  const addLine = () =>
    setLines((prev) => [...prev, { key: newKey(), ingredient_id: null, qty: "", unit_cost: "" }]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

  async function save(status: "draft" | "sent") {
    setErr(null);
    const cleanLines = lines
      .filter((l) => l.ingredient_id && Number(l.qty) > 0 && Number(l.unit_cost) >= 0)
      .map((l) => ({
        ingredient_id: l.ingredient_id!,
        qty: Number(l.qty),
        unit_cost: Number(l.unit_cost),
      }));
    if (cleanLines.length === 0) {
      setErr("Add at least one line with a quantity > 0.");
      return;
    }

    setBusy(status);
    try {
      const res = await fetch("/api/stock/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          expected_at: expectedAt ? new Date(expectedAt).toISOString() : null,
          notes: notes.trim() || null,
          status,
          items: cleanLines,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }
      const order = await res.json();
      router.push(`/dashboard/menu/${menuId}/stock/purchases/${order.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function quickAddSupplier(values: { name: string; phone: string; email: string }) {
    const res = await fetch("/api/stock/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setErr((await res.json().catch(() => ({}))).error ?? "Failed to add supplier");
      return;
    }
    const created: SupplierLite = await res.json();
    setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setSupplierId(created.id);
    setShowAddSupplier(false);
  }

  if (ingredients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 text-center">
        <p className="text-[14px] text-[#5E5848] mb-3">
          You need at least one ingredient before you can create a purchase order.
        </p>
        <a
          href={`/dashboard/menu/${menuId}/stock/ingredients`}
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c]"
        >
          Add ingredients →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-4 sm:p-5 space-y-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Supplier</label>
          <div className="flex gap-2">
            <select
              value={supplierId ?? ""}
              onChange={(e) => setSupplierId(e.target.value || null)}
              className={`${inputCls} flex-1`}
            >
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddSupplier((v) => !v)}
              className="h-12 px-3 rounded-xl border border-[#E2DDD5] text-[13px] font-bold text-[#5E5848] hover:border-[#E8A020] hover:text-[#E8A020] whitespace-nowrap"
            >
              {showAddSupplier ? "Close" : "+ Add"}
            </button>
          </div>
          {showAddSupplier && <QuickSupplier onSubmit={quickAddSupplier} />}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Expected delivery</label>
            <input
              type="date"
              value={expectedAt}
              onChange={(e) => setExpectedAt(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="e.g. Soko run, deliver to back door"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] overflow-hidden">
        <div className="p-4 border-b border-[#F4F1EC] flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-[#16130C]">Items</h2>
          <span className="text-[12px] text-[#9C9485]">{lines.length} line{lines.length !== 1 ? "s" : ""}</span>
        </div>

        <ul className="divide-y divide-[#F4F1EC]">
          {lines.map((l) => {
            const ing = l.ingredient_id ? ingredientById.get(l.ingredient_id) : null;
            const lineTotal = (Number(l.qty) || 0) * (Number(l.unit_cost) || 0);
            return (
              <li key={l.key} className="p-3 sm:p-4">
                <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">Ingredient</label>
                    <select
                      value={l.ingredient_id ?? ""}
                      onChange={(e) => pickIngredient(l.key, e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Choose…</option>
                      {ingredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-5 sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">
                      Qty {ing ? `(${ing.unit})` : ""}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                      className={inputCls}
                      placeholder="0"
                    />
                  </div>

                  <div className="col-span-5 sm:col-span-3">
                    <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">Unit cost (KES)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={l.unit_cost}
                      onChange={(e) => updateLine(l.key, { unit_cost: e.target.value })}
                      className={inputCls}
                      placeholder={ing ? String(ing.cost_per_unit) : "0"}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2 text-right">
                    <p className="text-[11px] font-semibold text-[#9C9485] mb-1">Line</p>
                    <p className="text-[14px] font-bold text-[#16130C]">{fmtKES(lineTotal)}</p>
                  </div>

                  {lines.length > 1 && (
                    <div className="col-span-12 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        className="h-11 px-4 text-[12px] font-bold text-[#9C9485] hover:text-[#DC2626]"
                      >
                        Remove line
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={addLine}
          className="w-full text-left px-4 py-3.5 text-[14px] font-semibold text-[#E8A020] hover:bg-[#E8A020]/5 border-t border-[#F4F1EC]"
        >
          + Add line
        </button>

        <div className="flex items-center justify-between p-4 border-t border-[#F4F1EC] bg-[#FAFAF8]">
          <span className="text-[14px] font-semibold text-[#5E5848]">Expected total</span>
          <span className="font-display text-[20px] font-bold text-[#16130C]">{fmtKES(total)}</span>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-3 text-[13px] text-[#DC2626]">
          {err}
        </div>
      )}

      {/* Save actions — sticky on mobile */}
      <div className="sticky bottom-0 sm:static bg-[#FAFAF8] sm:bg-transparent -mx-4 sm:mx-0 p-4 sm:p-0 border-t sm:border-0 border-[#E2DDD5] flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => save("sent")}
          disabled={!!busy}
          className="bg-[#E8A020] text-[#16130C] font-bold text-[15px] h-[52px] rounded-full hover:bg-[#d4911c] disabled:opacity-50 flex-1 px-5"
        >
          {busy === "sent" ? "Sending…" : "Send to supplier"}
        </button>
        <button
          type="button"
          onClick={() => save("draft")}
          disabled={!!busy}
          className="bg-white border border-[#E2DDD5] text-[#16130C] font-bold text-[15px] h-[52px] rounded-full hover:border-[#9C9485] disabled:opacity-50 flex-1 px-5"
        >
          {busy === "draft" ? "Saving…" : "Save as draft"}
        </button>
      </div>
    </div>
  );
}

/* ── Inline supplier add ─────────────────────────────── */

function QuickSupplier({ onSubmit }: { onSubmit: (v: { name: string; phone: string; email: string }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  return (
    <div className="mt-3 p-3 rounded-xl border border-[#E2DDD5] bg-[#FAFAF8] space-y-2">
      <input className={inputCls} placeholder="Supplier name *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className={inputCls} type="tel" inputMode="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className={inputCls} type="email" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button
        type="button"
        onClick={() => name.trim() && onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() })}
        disabled={!name.trim()}
        className="bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[40px] rounded-full hover:bg-[#d4911c] disabled:opacity-50"
      >
        Add supplier
      </button>
    </div>
  );
}
