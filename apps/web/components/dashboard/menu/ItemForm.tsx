"use client";

import { useState } from "react";
import type { MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";

const DIETARY_OPTIONS = [
  { tag: "V", label: "Vegetarian" },
  { tag: "VG", label: "Vegan" },
  { tag: "GF", label: "Gluten-free" },
  { tag: "H", label: "Halal" },
  { tag: "S", label: "Spicy" },
];

interface ItemFormProps {
  sectionId: string;
  item?: MenuItem;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

export function ItemForm({ sectionId, item, onSave, onCancel }: ItemFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [priceKes, setPriceKes] = useState(item?.price_kes?.toString() ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [dietaryTags, setDietaryTags] = useState<string[]>(item?.dietary_tags ?? []);
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url ?? "");
  const [saving, setSaving] = useState(false);

  const isEdit = !!item;
  const isValid = name.trim().length > 0 && priceKes.trim().length > 0 && Number(priceKes) >= 0;

  function toggleTag(tag: string) {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || saving) return;

    const optimisticItem: MenuItem = {
      id: item?.id ?? `temp-${Date.now()}`,
      name: name.trim(),
      price_kes: Number(priceKes),
      description: description.trim() || null,
      dietary_tags: dietaryTags,
      is_available: isAvailable,
      display_order: item?.display_order ?? 999,
      photo_url: photoUrl.trim() || null,
    };

    // Optimistic: update UI immediately
    onSave(optimisticItem);
    setSaving(true);

    try {
      const url = isEdit ? "/api/menu/items" : "/api/menu/items";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? {
            item_id: item.id,
            name: optimisticItem.name,
            price_kes: optimisticItem.price_kes,
            description: optimisticItem.description,
            dietary_tags: optimisticItem.dietary_tags,
            is_available: optimisticItem.is_available,
            photo_url: optimisticItem.photo_url,
          }
        : {
            section_id: sectionId,
            name: optimisticItem.name,
            price_kes: optimisticItem.price_kes,
            description: optimisticItem.description,
            dietary_tags: optimisticItem.dietary_tags,
            is_available: optimisticItem.is_available,
            photo_url: optimisticItem.photo_url,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save");

      const saved = await res.json();
      // Update with real server data (replaces temp ID)
      onSave(saved);
    } catch {
      // Rollback: remove the optimistic item
      if (!isEdit) {
        onSave({ ...optimisticItem, id: "__ROLLBACK__" });
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-[#E2DDD5] rounded-xl px-3.5 py-2.5 text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:border-[#E8A020] focus:ring-1 focus:ring-[#E8A020]/30 transition-colors bg-white";

  return (
    <form onSubmit={handleSubmit} className="border border-[#E2DDD5] rounded-xl p-4 bg-[#FAFAF8] space-y-3">
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nyama Choma"
            className={inputCls}
            autoFocus
            required
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Price (KSh) *</label>
          <input
            type="number"
            value={priceKes}
            onChange={(e) => setPriceKes(e.target.value)}
            placeholder="0"
            min="0"
            step="50"
            className={inputCls}
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[12px] font-semibold text-[#16130C]">Description</label>
          <span className="text-[11px] text-[#9C9485]">{description.length}/200</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          placeholder="Short description of the dish"
          rows={2}
          maxLength={200}
          className={inputCls}
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[12px] font-semibold text-[#16130C]">Available</label>
        <button
          type="button"
          onClick={() => setIsAvailable(!isAvailable)}
          className={`relative w-10 h-[22px] rounded-full transition-colors ${
            isAvailable ? "bg-[#16A34A]" : "bg-[#E2DDD5]"
          }`}
        >
          <span
            className={`absolute top-[2px] size-[18px] rounded-full bg-white shadow transition-transform ${
              isAvailable ? "translate-x-[20px]" : "translate-x-[2px]"
            }`}
          />
        </button>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Dietary tags</label>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_OPTIONS.map((opt) => (
            <button
              key={opt.tag}
              type="button"
              title={opt.label}
              onClick={() => toggleTag(opt.tag)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                dietaryTags.includes(opt.tag)
                  ? "bg-[#E8A020] text-white"
                  : "bg-[#F4F1EC] text-[#5E5848] hover:bg-[#E2DDD5]"
              }`}
            >
              {opt.tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Photo URL</label>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
        <p className="text-[11px] text-[#9C9485] mt-1">Photo upload coming soon</p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!isValid || saving}
          className="bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-5 h-[36px] rounded-full hover:bg-[#d4911c] transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[13px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors px-3"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
