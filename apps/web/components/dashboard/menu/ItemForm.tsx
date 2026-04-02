"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
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
  menuId: string;
  item?: MenuItem;
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

export function ItemForm({ sectionId, menuId, item, onSave, onCancel }: ItemFormProps) {
  const [name, setName] = useState(item?.name ?? "");
  const [priceKes, setPriceKes] = useState(item?.price_kes?.toString() ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true);
  const [dietaryTags, setDietaryTags] = useState<string[]>(item?.dietary_tags ?? []);
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(item?.photo_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!item;
  const isValid = name.trim().length > 0 && priceKes.trim().length > 0 && Number(priceKes) >= 0;

  function toggleTag(tag: string) {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    setUploading(true);

    try {
      // Compress and resize client-side
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: "image/webp",
      });

      // Upload
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("menu_id", menuId);

      const res = await fetch("/api/menu/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const { url } = await res.json();
      setPhotoUrl(url);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setPhotoPreview(item?.photo_url ?? null);
      setPhotoUrl(item?.photo_url ?? "");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setPhotoUrl("");
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || saving || uploading) return;

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

      const res = await fetch("/api/menu/items", {
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

      {/* Photo upload */}
      <div>
        <label className="block text-[12px] font-semibold text-[#16130C] mb-1.5">Photo</label>
        {photoPreview ? (
          <div className="flex items-start gap-3">
            <div className="relative w-[80px] h-[80px] rounded-xl overflow-hidden shrink-0 border border-[#E2DDD5]">
              <Image
                src={photoPreview}
                alt="Item photo"
                width={80}
                height={80}
                className="object-cover w-full h-full"
                unoptimized={photoPreview.startsWith("blob:")}
              />
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <svg className="size-5 animate-spin text-[#E8A020]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[12px] font-semibold text-[#E8A020] hover:underline disabled:opacity-50 text-left"
              >
                {uploading ? "Uploading..." : "Change photo"}
              </button>
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploading}
                className="text-[12px] font-semibold text-[#DC2626] hover:underline disabled:opacity-50 text-left"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border border-dashed border-[#E2DDD5] rounded-xl py-4 text-center hover:border-[#E8A020]/40 transition-colors disabled:opacity-50"
          >
            <span className="text-[20px] block mb-1">📷</span>
            <span className="text-[12px] font-semibold text-[#9C9485]">
              Add a photo
            </span>
            <span className="text-[11px] text-[#9C9485] block mt-0.5">
              Auto-resized and compressed
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
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

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!isValid || saving || uploading}
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
