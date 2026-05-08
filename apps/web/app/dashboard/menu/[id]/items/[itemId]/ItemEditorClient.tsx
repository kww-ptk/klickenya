"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RecipeBuilder } from "./RecipeBuilder";
import type { IngredientRow } from "../../stock/ingredients/IngredientsClient";

export interface RecipeIngredient {
  id: string;
  ingredient_id: string;
  ep_qty: number;
  yield_pct: number;
  display_order: number;
}

interface ItemPayload {
  id: string;
  name: string;
  description: string;
  price_kes: number;
  dietary_tags: string[];
  is_available: boolean;
  photo_url: string | null;
}

interface RecipeMeta {
  overhead_pct: number;
  target_food_cost_pct: number;
  notes: string;
}

const DIETARY_OPTIONS = [
  { tag: "V", label: "Vegetarian" },
  { tag: "VG", label: "Vegan" },
  { tag: "GF", label: "Gluten-free" },
  { tag: "H", label: "Halal" },
  { tag: "S", label: "Spicy" },
  { tag: "DF", label: "Lactose Free" },
];

const inputCls =
  "w-full border border-[#E2DDD5] rounded-xl px-3.5 py-3 text-[15px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 bg-white";

export function ItemEditorClient({
  menuId,
  stockEnabled,
  item,
  recipe,
  recipeLines,
  pantry,
}: {
  menuId: string;
  stockEnabled: boolean;
  item: ItemPayload;
  recipe: RecipeMeta | null;
  recipeLines: RecipeIngredient[];
  pantry: IngredientRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"details" | "recipe">("details");

  return (
    <div>
      {/* Tabs — large, tablet-friendly */}
      <div className="flex border-b border-[#E2DDD5] mb-5 -mx-2 sm:mx-0">
        <TabButton active={tab === "details"} onClick={() => setTab("details")}>
          Details
        </TabButton>
        {stockEnabled && (
          <TabButton active={tab === "recipe"} onClick={() => setTab("recipe")}>
            Recipe
          </TabButton>
        )}
      </div>

      {tab === "details" ? (
        <DetailsTab
          item={item}
          onSaved={() => router.refresh()}
          onCancel={() => router.push(`/dashboard/menu/${menuId}`)}
        />
      ) : (
        <RecipeBuilder
          menuId={menuId}
          itemId={item.id}
          itemName={item.name}
          itemDescription={item.description}
          priceKes={item.price_kes}
          recipe={recipe}
          recipeLines={recipeLines}
          pantry={pantry}
        />
      )}
    </div>
  );
}

/* ── Tab button (44px+ tap target) ───────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 sm:px-6 py-3 text-[15px] font-bold transition-colors min-h-[48px] -mb-px border-b-2 ${
        active
          ? "border-[#E8A020] text-[#16130C]"
          : "border-transparent text-[#9C9485] hover:text-[#16130C]"
      }`}
    >
      {children}
    </button>
  );
}

/* ── Details tab — full-page version of the inline form ── */

function DetailsTab({
  item,
  onSaved,
  onCancel,
}: {
  item: ItemPayload;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price_kes));
  const [description, setDescription] = useState(item.description);
  const [available, setAvailable] = useState(item.is_available);
  const [tags, setTags] = useState<string[]>(item.dietary_tags);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = name.trim().length > 0 && price.trim().length > 0 && Number(price) >= 0;

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/menu/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: item.id,
          name: name.trim(),
          price_kes: Number(price),
          description: description.trim(),
          dietary_tags: tags,
          is_available: available,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-[680px]">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Price (KSh) *</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputCls}
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[12px] font-semibold text-[#16130C]">Description</label>
          <span className="text-[11px] text-[#9C9485]">{description.length}/200</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          rows={3}
          maxLength={200}
          className={inputCls}
        />
      </div>

      <div className="flex items-center justify-between bg-white border border-[#E2DDD5] rounded-2xl p-4">
        <div>
          <p className="text-[14px] font-semibold text-[#16130C]">Available</p>
          <p className="text-[12px] text-[#9C9485]">Customers can order this item right now</p>
        </div>
        <button
          type="button"
          onClick={() => setAvailable((v) => !v)}
          aria-pressed={available}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            available ? "bg-[#16A34A]" : "bg-[#E2DDD5]"
          }`}
        >
          <span
            className={`absolute top-[3px] size-[22px] rounded-full bg-white shadow transition-transform ${
              available ? "translate-x-[22px]" : "translate-x-[3px]"
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-[#16130C] mb-2">Dietary tags</label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((opt) => (
            <button
              key={opt.tag}
              type="button"
              onClick={() => toggleTag(opt.tag)}
              className={`rounded-full px-4 h-10 text-[12px] font-bold transition-colors ${
                tags.includes(opt.tag)
                  ? "bg-[#E8A020] text-white"
                  : "bg-[#F4F1EC] text-[#5E5848] hover:bg-[#E2DDD5]"
              }`}
              title={opt.label}
            >
              {opt.tag}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-3 text-[13px] text-[#DC2626]">
          {err}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={!valid || saving}
          className="bg-[#E8A020] text-[#16130C] font-bold text-[14px] px-6 h-[48px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save details"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[14px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors px-3 h-[48px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
