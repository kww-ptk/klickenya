"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { IngredientRow } from "../../stock/ingredients/IngredientsClient";
import type { RecipeIngredient } from "./ItemEditorClient";

/* ── Math ────────────────────────────────────────────── */

function fmtKES(n: number): string {
  if (!isFinite(n)) return "—";
  return `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}

/**
 * Cost contribution of one recipe line.
 *   ep_qty       — edible-portion qty in the ingredient's own unit
 *   yield_pct    — usable fraction after trim/cooking (1–100)
 *   cost_per_unit— KES per unit on the ingredient
 *
 * AP qty = EP qty / (yield_pct/100)         (more raw material to get the
 *                                            edible portion)
 * cost   = AP qty × cost_per_unit
 */
function lineCostKES(ep_qty: number, yield_pct: number, cost_per_unit: number): number {
  if (!ep_qty || !cost_per_unit) return 0;
  const y = Math.min(100, Math.max(1, yield_pct || 100)) / 100;
  return (ep_qty / y) * cost_per_unit;
}

/* ── Working line type (with a temp client-side id) ──── */

interface WorkingLine {
  // Stable client-only id for React keys; not sent to server.
  key: string;
  ingredient_id: string | null;
  ep_qty: string; // string so the user can clear and retype
  yield_pct: string;
}

let lineCounter = 0;
function newKey() {
  lineCounter += 1;
  return `line-${Date.now()}-${lineCounter}`;
}

const inputCls =
  "w-full border border-[#E2DDD5] rounded-xl px-3 py-3 text-[15px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white";

/* ── Component ───────────────────────────────────────── */

export function RecipeBuilder({
  menuId,
  itemId,
  itemName,
  itemDescription,
  priceKes,
  recipe,
  recipeLines,
  pantry: initialPantry,
}: {
  menuId: string;
  itemId: string;
  itemName: string;
  itemDescription: string;
  priceKes: number;
  recipe: { overhead_pct: number; target_food_cost_pct: number; notes: string } | null;
  recipeLines: RecipeIngredient[];
  pantry: IngredientRow[];
}) {
  const [pantry, setPantry] = useState<IngredientRow[]>(initialPantry);
  const [overheadPct, setOverheadPct] = useState<string>(
    recipe?.overhead_pct != null ? String(recipe.overhead_pct) : "5",
  );
  const [targetFoodCostPct, setTargetFoodCostPct] = useState<string>(
    recipe?.target_food_cost_pct != null ? String(recipe.target_food_cost_pct) : "30",
  );
  const [notes, setNotes] = useState<string>(recipe?.notes ?? "");
  const [lines, setLines] = useState<WorkingLine[]>(() =>
    recipeLines.length > 0
      ? recipeLines.map((l) => ({
          key: newKey(),
          ingredient_id: l.ingredient_id,
          ep_qty: String(l.ep_qty),
          yield_pct: String(l.yield_pct),
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);

  const pantryById = useMemo(() => {
    const m = new Map<string, IngredientRow>();
    pantry.forEach((i) => m.set(i.id, i));
    return m;
  }, [pantry]);

  /* ── Live math ───────────────────────────────────── */

  const totals = useMemo(() => {
    let ingredientCost = 0;
    const perLine = lines.map((l) => {
      const ing = l.ingredient_id ? pantryById.get(l.ingredient_id) : null;
      const ep = Number(l.ep_qty) || 0;
      const yld = Number(l.yield_pct) || 100;
      const cpu = ing ? Number(ing.cost_per_unit) : 0;
      const cost = lineCostKES(ep, yld, cpu);
      ingredientCost += cost;
      return { cost, ing };
    });
    const overhead = ingredientCost * ((Number(overheadPct) || 0) / 100);
    const costPerPortion = ingredientCost + overhead;
    const foodCostPct = priceKes > 0 ? (costPerPortion / priceKes) * 100 : 0;
    const target = Number(targetFoodCostPct) || 30;
    const suggestedSp = target > 0 ? costPerPortion / (target / 100) : 0;
    return { perLine, ingredientCost, overhead, costPerPortion, foodCostPct, suggestedSp };
  }, [lines, pantryById, overheadPct, targetFoodCostPct, priceKes]);

  /* ── Line operations ─────────────────────────────── */

  const addLine = () =>
    setLines((prev) => [...prev, { key: newKey(), ingredient_id: null, ep_qty: "", yield_pct: "100" }]);

  const removeLine = (key: string) =>
    setLines((prev) => prev.filter((l) => l.key !== key));

  const updateLine = (key: string, patch: Partial<WorkingLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  /* ── Save ────────────────────────────────────────── */

  async function save() {
    setErr(null);
    // Validate
    const cleanLines = lines
      .filter((l) => l.ingredient_id && Number(l.ep_qty) > 0)
      .map((l, idx) => ({
        ingredient_id: l.ingredient_id!,
        ep_qty: Number(l.ep_qty),
        yield_pct: Math.min(100, Math.max(1, Number(l.yield_pct) || 100)),
        display_order: idx,
      }));

    if (lines.length > 0 && cleanLines.length === 0) {
      setErr("Each row needs an ingredient and a quantity > 0.");
      return;
    }
    if (cleanLines.length === 0 && !recipe) {
      // Nothing to save (and no existing recipe)
      setErr("Add at least one ingredient before saving.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/stock/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_item_id: itemId,
          overhead_pct: Number(overheadPct) || 0,
          target_food_cost_pct: Number(targetFoodCostPct) || 30,
          notes: notes.trim() || null,
          ingredients: cleanLines,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save recipe");
      }
      setSavedAt(new Date());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save recipe");
    } finally {
      setSaving(false);
    }
  }

  /* ── AI draft ────────────────────────────────────── */

  async function generateDraft() {
    setDrafting(true);
    setErr(null);
    try {
      const res = await fetch("/api/stock/recipes/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: itemName,
          item_description: itemDescription,
          existing_pantry: pantry.map((p) => ({ id: p.id, name: p.name, unit: p.unit })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Draft failed");

      type DraftLine = {
        name: string;
        ep_qty_g: number;
        yield_pct?: number;
        matched_pantry_id: string | null;
        est_cost_per_unit_kes?: number;
      };
      const incoming: DraftLine[] = Array.isArray(body.ingredients) ? body.ingredients : [];

      // For new (unmatched) ingredients, create them in the pantry first so
      // the recipe can reference them. Use grams as the unit since the prompt
      // returns ep_qty_g. Cost-per-unit comes from the AI's estimate; the
      // owner can correct it later from the Ingredients page or by logging
      // a real purchase.
      const newPantryRows: IngredientRow[] = [];
      for (const d of incoming) {
        if (d.matched_pantry_id) continue;
        const create = await fetch("/api/stock/ingredients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: d.name,
            unit: "g",
            cost_per_unit: Number(d.est_cost_per_unit_kes ?? 0),
            default_yield: 1,
            category: null,
          }),
        });
        if (create.ok) {
          const created: IngredientRow = await create.json();
          newPantryRows.push(created);
          d.matched_pantry_id = created.id;
        }
      }
      if (newPantryRows.length > 0) {
        setPantry((prev) =>
          [...prev, ...newPantryRows].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }

      // Backfill zero-cost matched pantry rows with the AI estimate. Never
      // overwrite a non-zero price -- that's owner data. Common when the
      // pantry was set up before the AI started returning prices.
      const updatedPantryRows: IngredientRow[] = [];
      for (const d of incoming) {
        if (!d.matched_pantry_id) continue;
        const est = Number(d.est_cost_per_unit_kes ?? 0);
        if (est <= 0) continue;
        const current = pantry.find((p) => p.id === d.matched_pantry_id);
        if (!current || Number(current.cost_per_unit) > 0) continue;
        const patchRes = await fetch("/api/stock/ingredients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: d.matched_pantry_id, cost_per_unit: est }),
        });
        if (patchRes.ok) {
          const updated: IngredientRow = await patchRes.json();
          updatedPantryRows.push(updated);
        }
      }
      if (updatedPantryRows.length > 0) {
        setPantry((prev) =>
          prev
            .map((p) => updatedPantryRows.find((u) => u.id === p.id) ?? p)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      }

      const drafted: WorkingLine[] = incoming
        .filter((d) => d.matched_pantry_id)
        .map((d) => ({
          key: newKey(),
          ingredient_id: d.matched_pantry_id!,
          ep_qty: String(d.ep_qty_g ?? 0),
          yield_pct: String(d.yield_pct ?? 100),
        }));

      setLines(drafted);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  const canDraft = lines.length === 0 && itemDescription.trim().length > 0;

  /* ── Find missing prices ─────────────────────────── */
  // Surfaced whenever any recipe line points at a pantry row with cost = 0.
  // Sends just those names to /api/stock/reference-prices (AI mode), maps
  // results back by canonical name, PATCHes the pantry rows. Non-zero
  // prices are NEVER overwritten -- only zeros get backfilled.

  const [findingPrices, setFindingPrices] = useState(false);

  const missingCostIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const l of lines) {
      if (!l.ingredient_id || seen.has(l.ingredient_id)) continue;
      const ing = pantryById.get(l.ingredient_id);
      if (ing && Number(ing.cost_per_unit) <= 0) {
        ids.push(l.ingredient_id);
        seen.add(l.ingredient_id);
      }
    }
    return ids;
  }, [lines, pantryById]);

  async function findMissingPrices() {
    if (missingCostIds.length === 0) return;
    setFindingPrices(true);
    setErr(null);
    try {
      const names = missingCostIds
        .map((id) => pantryById.get(id)?.name)
        .filter((n): n is string => !!n);
      const res = await fetch("/api/stock/reference-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to fetch prices");
      type Row = { canonical_name: string; median_kes: number };
      const byCanonical = new Map<string, number>();
      for (const r of (body.rows ?? []) as Row[]) {
        byCanonical.set(r.canonical_name.toLowerCase(), Number(r.median_kes));
      }

      const updates: IngredientRow[] = [];
      for (const id of missingCostIds) {
        const ing = pantryById.get(id);
        if (!ing) continue;
        const est = byCanonical.get(ing.name.toLowerCase());
        if (!est || est <= 0) continue;
        const patchRes = await fetch("/api/stock/ingredients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, cost_per_unit: est }),
        });
        if (patchRes.ok) updates.push((await patchRes.json()) as IngredientRow);
      }

      if (updates.length > 0) {
        setPantry((prev) =>
          prev
            .map((p) => updates.find((u) => u.id === p.id) ?? p)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } else {
        setErr("AI couldn't price those ingredients. Try editing the names to be more recognisable.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to fetch prices");
    } finally {
      setFindingPrices(false);
    }
  }

  /* ── Render ──────────────────────────────────────── */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
      {/* Lines */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-display text-[18px] font-bold text-[#16130C]">Recipe</h2>
          <div className="flex items-center gap-2">
            {canDraft && (
              <button
                type="button"
                onClick={generateDraft}
                disabled={drafting}
                className="h-10 px-4 rounded-full border border-[#E8A020]/40 text-[#E8A020] text-[13px] font-bold hover:bg-[#E8A020]/5 transition-colors disabled:opacity-50"
              >
                {drafting ? "Drafting…" : "✨ Generate draft"}
              </button>
            )}
            {missingCostIds.length > 0 && (
              <button
                type="button"
                onClick={findMissingPrices}
                disabled={findingPrices}
                className="h-10 px-4 rounded-full border border-[#E8A020]/40 text-[#E8A020] text-[13px] font-bold hover:bg-[#E8A020]/5 transition-colors disabled:opacity-50"
                title={`AI-price ${missingCostIds.length} ingredient${missingCostIds.length === 1 ? "" : "s"} currently at KSh 0`}
              >
                {findingPrices
                  ? "Pricing…"
                  : `✨ Find missing prices (${missingCostIds.length})`}
              </button>
            )}
            <Link
              href={`/dashboard/menu/${menuId}/stock/ingredients`}
              className="h-10 px-4 rounded-full border border-[#E2DDD5] text-[#5E5848] text-[13px] font-semibold hover:border-[#9C9485] transition-colors flex items-center"
            >
              Manage pantry
            </Link>
          </div>
        </div>

        {pantry.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 text-center">
            <p className="text-[14px] text-[#5E5848] mb-3">
              Your pantry is empty. Add a few ingredients first.
            </p>
            <Link
              href={`/dashboard/menu/${menuId}/stock/ingredients`}
              className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors"
            >
              Add ingredients →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
            <ul className="divide-y divide-[#F4F1EC]">
              {lines.map((l, idx) => {
                const ing = l.ingredient_id ? pantryById.get(l.ingredient_id) : null;
                const cost = totals.perLine[idx]?.cost ?? 0;
                return (
                  <li key={l.key} className="p-3 sm:p-4">
                    <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end">
                      {/* Ingredient picker */}
                      <div className="col-span-12 sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">
                          Ingredient
                        </label>
                        <select
                          value={l.ingredient_id ?? ""}
                          onChange={(e) => updateLine(l.key, { ingredient_id: e.target.value || null })}
                          className={inputCls}
                        >
                          <option value="">Choose an ingredient…</option>
                          {pantry.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* EP qty */}
                      <div className="col-span-5 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">
                          Qty {ing ? `(${ing.unit})` : ""}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          value={l.ep_qty}
                          onChange={(e) => updateLine(l.key, { ep_qty: e.target.value })}
                          className={inputCls}
                          placeholder="0"
                        />
                      </div>

                      {/* Yield % */}
                      <div className="col-span-4 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#9C9485] mb-1">
                          Yield %
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="1"
                          max="100"
                          step="1"
                          value={l.yield_pct}
                          onChange={(e) => updateLine(l.key, { yield_pct: e.target.value })}
                          className={inputCls}
                          placeholder="100"
                        />
                      </div>

                      {/* Live cost */}
                      <div className="col-span-2 sm:col-span-2 text-right">
                        <p className="text-[11px] font-semibold text-[#9C9485] mb-1">Cost</p>
                        <p className="text-[14px] font-bold text-[#16130C]">{fmtKES(cost)}</p>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeLine(l.key)}
                          aria-label="Remove ingredient"
                          className="size-11 rounded-full text-[18px] text-[#9C9485] hover:bg-[#DC2626]/10 hover:text-[#DC2626] transition-colors flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={addLine}
              className="w-full text-left px-4 py-3.5 text-[14px] font-semibold text-[#E8A020] hover:bg-[#E8A020]/5 transition-colors border-t border-[#F4F1EC]"
            >
              + Add ingredient
            </button>
          </div>
        )}

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cooking method, plating, allergens etc."
            className={inputCls}
          />
        </div>
      </div>

      {/* Summary card */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5 space-y-4">
          <h3 className="font-display text-[16px] font-bold text-[#16130C]">Costing</h3>

          <Row label="Ingredient cost" value={fmtKES(totals.ingredientCost)} />

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-[13px] font-semibold text-[#5E5848]">Overhead %</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={overheadPct}
                onChange={(e) => setOverheadPct(e.target.value)}
                className="w-20 border border-[#E2DDD5] rounded-lg px-2 py-1.5 text-[14px] text-right"
              />
            </div>
            <p className="text-[12px] text-[#9C9485] mt-1">{fmtKES(totals.overhead)}</p>
          </div>

          <div className="border-t border-[#F4F1EC] pt-3">
            <Row
              label="Cost / portion"
              value={fmtKES(totals.costPerPortion)}
              big
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#5E5848]">Sale price</span>
            <span className="text-[14px] font-bold text-[#16130C]">{fmtKES(priceKes)}</span>
          </div>

          <FoodCostChip pct={totals.foodCostPct} target={Number(targetFoodCostPct) || 30} />

          <div className="border-t border-[#F4F1EC] pt-3">
            <div className="flex items-center justify-between gap-3 mb-1">
              <label className="text-[13px] font-semibold text-[#5E5848]">Target food cost %</label>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                max="100"
                step="1"
                value={targetFoodCostPct}
                onChange={(e) => setTargetFoodCostPct(e.target.value)}
                className="w-20 border border-[#E2DDD5] rounded-lg px-2 py-1.5 text-[14px] text-right"
              />
            </div>
            <Row label="Suggested sale price" value={fmtKES(totals.suggestedSp)} />
          </div>

          {err && (
            <div className="rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/5 p-2.5 text-[12px] text-[#DC2626]">
              {err}
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full bg-[#E8A020] text-[#16130C] font-bold text-[14px] h-[48px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save recipe"}
          </button>
          {savedAt && (
            <p className="text-[12px] text-emerald-700 text-center">
              ✓ Saved at {savedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ── Tiny helpers ────────────────────────────────────── */

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={big ? "text-[13px] font-semibold text-[#16130C]" : "text-[13px] text-[#5E5848]"}>
        {label}
      </span>
      <span className={big ? "text-[18px] font-bold text-[#16130C]" : "text-[14px] font-semibold text-[#16130C]"}>
        {value}
      </span>
    </div>
  );
}

function FoodCostChip({ pct, target }: { pct: number; target: number }) {
  if (!isFinite(pct) || pct === 0) {
    return (
      <span className="inline-flex items-center text-[11px] font-bold text-[#9C9485] bg-[#F4F1EC] px-2.5 py-1 rounded-full uppercase tracking-wide">
        Food cost — set price first
      </span>
    );
  }
  const ok = pct <= target;
  const warn = pct > target && pct <= target + 10;
  const color = ok
    ? "bg-emerald-100 text-emerald-700"
    : warn
      ? "bg-amber-100 text-amber-800"
      : "bg-rose-100 text-rose-700";
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${color}`}>
      Food cost {pct.toFixed(1)}% · target {target}%
    </span>
  );
}
