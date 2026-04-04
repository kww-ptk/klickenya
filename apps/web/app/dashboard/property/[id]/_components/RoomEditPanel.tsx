"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export interface RoomData {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string;
  bed_type: string | null;
  room_size_sqm: number | null;
  max_guests: number;
  base_price_kes: number;
  description: string | null;
  amenities: string[];
  photos: string[];
  is_active: boolean;
  display_order: number;
}

interface RoomEditPanelProps {
  room: RoomData | null; // null = new room
  propertyId: string;
  propertyName: string;
  onClose: () => void;
  onSaved: (room: RoomData) => void;
}

const ROOM_TYPES = [
  { value: "standard", label: "Standard Room" },
  { value: "deluxe", label: "Deluxe Room" },
  { value: "suite", label: "Suite" },
  { value: "studio", label: "Studio" },
  { value: "cottage", label: "Cottage / Chalet" },
  { value: "villa", label: "Villa" },
  { value: "tent", label: "Safari Tent" },
  { value: "dorm", label: "Dorm Bed" },
  { value: "entire_place", label: "Entire Place" },
];

const BED_TYPES = ["King", "Queen", "Twin", "Double", "Single", "Bunk beds"];

const AMENITIES_LIST = [
  "AC", "Fan", "Sea view", "Garden view", "Pool view", "Balcony",
  "Terrace", "Mini bar", "In-room safe", "Bathtub", "Shower only",
  "Smart TV", "Work desk", "Kitchenette",
];

async function compressImage(file: File, maxDim = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    if (file.size < 100_000 || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

const inputCls =
  "w-full rounded-xl border border-[#E2DDD5] bg-white px-3 py-2.5 text-[13px] text-[#16130C] placeholder-[#C5BFB5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5]";

export function RoomEditPanel({
  room,
  propertyId,
  propertyName,
  onClose,
  onSaved,
}: RoomEditPanelProps) {
  const isNew = !room;

  const [name, setName] = useState(room?.name ?? "");
  const [roomNumber, setRoomNumber] = useState(room?.room_number ?? "");
  const [roomType, setRoomType] = useState(room?.room_type ?? "standard");
  const [bedType, setBedType] = useState(room?.bed_type ?? "");
  const [roomSize, setRoomSize] = useState<number | "">(room?.room_size_sqm ?? "");
  const [maxGuests, setMaxGuests] = useState(room?.max_guests ?? 2);
  const [basePrice, setBasePrice] = useState<number | "">(room?.base_price_kes ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [photos, setPhotos] = useState<string[]>(room?.photos ?? []);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleAmenity = (a: string) => {
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingPhoto(true);
    setError(null);

    for (const rawFile of files) {
      try {
        const compressed = await compressImage(rawFile);
        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("property_id", propertyId);
        fd.append("property_name", propertyName);
        fd.append("room_name", name || "room");

        const res = await fetch("/api/properties/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Upload failed");
          continue;
        }
        const { url } = await res.json();
        setPhotos((prev) => [...prev, url]);
      } catch {
        setError("Upload failed");
      }
    }
    setUploadingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (url: string) => {
    setPhotos((prev) => prev.filter((u) => u !== url));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Room name is required"); return; }
    if (!basePrice) { setError("Base price is required"); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      room_number: roomNumber.trim() || null,
      room_type: roomType,
      bed_type: bedType || null,
      room_size_sqm: roomSize === "" ? null : Number(roomSize),
      max_guests: Number(maxGuests),
      base_price_kes: Number(basePrice),
      description: description.trim() || null,
      amenities,
      photos,
    };

    try {
      let res: Response;
      if (isNew) {
        res = await fetch("/api/properties/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ property_id: propertyId, ...payload }),
        });
      } else {
        res = await fetch(`/api/properties/rooms/${room.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to save");
        setSaving(false);
        return;
      }

      const data = await res.json();
      onSaved(data.room as RoomData);
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2DDD5] shrink-0">
          <h2 className="font-display text-[17px] font-bold text-[#16130C] tracking-[-0.02em]">
            {isNew ? "Add room" : "Edit room"}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-[#F4F1EC] flex items-center justify-center hover:bg-[#E2DDD5] transition-colors"
          >
            <svg className="size-4 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Name + number */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Room name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Beachfront Suite"
                className={inputCls}
              />
            </div>
            <div className="w-[80px]">
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Room #
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="101"
                className={inputCls}
              />
            </div>
          </div>

          {/* Type + bed */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Room type
              </label>
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={inputCls + " bg-white"}>
                {ROOM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Bed type
              </label>
              <select value={bedType} onChange={(e) => setBedType(e.target.value)} className={inputCls + " bg-white"}>
                <option value="">— Select —</option>
                {BED_TYPES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Guests + size + price */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Max guests
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxGuests}
                onChange={(e) => setMaxGuests(parseInt(e.target.value) || 1)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Size (m²)
              </label>
              <input
                type="number"
                min={0}
                value={roomSize}
                onChange={(e) => setRoomSize(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="—"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
                Price / night *
              </label>
              <input
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="KSh"
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional short description shown to guests"
              className={inputCls + " resize-none"}
            />
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-2">
              Amenities
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AMENITIES_LIST.map((a) => {
                const on = amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                      on
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white border-[#E2DDD5] text-[#5E5848] hover:border-[#9C9485]"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-[11px] font-semibold text-[#9C9485] uppercase tracking-wider mb-2">
              Photos
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, i) => (
                  <div key={url} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F4F1EC] group">
                    <Image
                      src={url}
                      alt={`Room photo ${i + 1}`}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold uppercase tracking-wide">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#E2DDD5] text-[13px] text-[#9C9485] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingPhoto ? "Uploading…" : "+ Add photos"}
            </button>
          </div>

          {error && (
            <p className="text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E2DDD5] shrink-0">
          <button
            onClick={handleSave}
            disabled={saving || uploadingPhoto}
            className="w-full h-11 rounded-full bg-[#4F46E5] text-white font-bold text-[14px] hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? "Saving…" : isNew ? "Add room" : "Save changes"}
          </button>
        </div>
      </div>
    </>
  );
}
