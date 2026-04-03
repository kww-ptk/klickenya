"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

/* ---------- Types ---------- */

interface Room {
  id: string;
  name: string;
  description: string | null;
  room_type: string;
  bed_type: string | null;
  room_size_sqm: number | null;
  max_guests: number;
  base_price_kes: number;
  amenities: string[];
  photos: string[];
  is_active: boolean;
  display_order: number;
}

const PROPERTY_TYPES = [
  { value: "villa", label: "Villa / Holiday Home" },
  { value: "hotel", label: "Hotel" },
  { value: "guesthouse", label: "Guesthouse" },
  { value: "apartment", label: "Apartment" },
  { value: "cottage", label: "Beach Cottage" },
  { value: "camp", label: "Safari Camp" },
];

const BED_TYPES = ["King", "Queen", "Twin", "Double", "Single", "Bunk beds"];

const AMENITIES_LIST = [
  "AC", "Fan", "Sea view", "Garden view", "Pool view", "Balcony",
  "Terrace", "Mini bar", "In-room safe", "Bathtub", "Shower only",
  "Smart TV", "Work desk", "Kitchenette",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

/* ---------- Component ---------- */

export default function PropertySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Property fields
  const [name, setName] = useState("");
  const [propertyType, setPropertyType] = useState("villa");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [minStay, setMinStay] = useState(1);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [listingSlug, setListingSlug] = useState("");
  const [rentingType, setRentingType] = useState("both");
  const [entirePlacePrice, setEntirePlacePrice] = useState<number | "">("");
  const [bookingSlug, setBookingSlug] = useState("");

  // Rooms
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [propRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase
          .from("rooms")
          .select("id, name, description, room_type, bed_type, room_size_sqm, max_guests, base_price_kes, amenities, photos, is_active, display_order")
          .eq("property_id", id)
          .order("display_order"),
      ]);

      if (propRes.data) {
        const p = propRes.data;
        setName(p.name ?? "");
        setPropertyType(p.property_type ?? "villa");
        setCheckInTime(p.check_in_time ?? "14:00");
        setCheckOutTime(p.check_out_time ?? "11:00");
        setMinStay(p.min_stay_nights ?? 1);
        setCity(p.city ?? "");
        setAddress(p.address ?? "");
        setListingSlug(p.listing_slug ?? "");
        setRentingType(p.renting_type ?? "both");
        setEntirePlacePrice(p.entire_place_price ?? "");
        setBookingSlug(p.booking_slug ?? "");
      }
      setRooms((roomsRes.data ?? []).map((r) => ({
        ...r,
        amenities: r.amenities ?? [],
        photos: r.photos ?? [],
      })));
      setLoading(false);
    })();
  }, [id]);

  const saveProperty = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          property_type: propertyType,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          min_stay_nights: minStay,
          city: city.trim() || null,
          address: address.trim() || null,
          listing_slug: listingSlug.trim() || null,
          renting_type: rentingType,
          entire_place_price: entirePlacePrice === "" ? null : Number(entirePlacePrice),
          booking_slug: bookingSlug.trim() || null,
        }),
      });
      if (res.ok) setMessage({ type: "success", text: "Settings saved" });
      else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  };

  const saveRoom = async (roomId: string, updates: Partial<Room>) => {
    const supabase = createClient();
    await supabase.from("rooms").update(updates).eq("id", roomId);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r)));
    setEditingRoom(null);
  };

  const toggleRoomActive = async (roomId: string, active: boolean) => {
    const supabase = createClient();
    await supabase.from("rooms").update({ is_active: active }).eq("id", roomId);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, is_active: active } : r)));
  };

  const addRoom = async (room: Omit<Room, "id" | "display_order" | "is_active">) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("rooms")
      .insert({ ...room, property_id: id, display_order: rooms.length, is_active: true })
      .select()
      .single();
    if (data) {
      setRooms((prev) => [...prev, { ...data, amenities: data.amenities ?? [], photos: data.photos ?? [] }]);
      setShowAddRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto animate-pulse">
        <div className="h-7 w-40 bg-[#E2DDD5] rounded-lg mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-[#F4F1EC] rounded-xl mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="mb-5">
        <Link href={`/dashboard/property/${id}`} className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
          ← Back to calendar
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Property Settings
        </h1>
      </div>

      {/* ── Property details ── */}
      <Section title="Property details">
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Property type">
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputCls + " bg-white"}>
            {PROPERTY_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in time"><input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className={inputCls} /></Field>
          <Field label="Check-out time"><input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Minimum stay (nights)">
          <input type="number" min={1} max={30} value={minStay} onChange={(e) => setMinStay(parseInt(e.target.value) || 1)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City"><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} placeholder="e.g. Watamu" /></Field>
          <Field label="Address"><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Optional" /></Field>
        </div>
      </Section>

      {/* ── Renting type ── */}
      <Section title="Renting options">
        <div className="space-y-2">
          {([
            { value: "both", label: "Both", desc: "Guests choose entire place or individual rooms" },
            { value: "by_room", label: "By room only", desc: "Guests book specific rooms" },
            { value: "entire_place", label: "Entire place only", desc: "Guests book the whole property" },
          ] as const).map((opt) => (
            <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${rentingType === opt.value ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-[#E2DDD5] hover:border-[#9C9485]"}`}>
              <input type="radio" name="renting_type" value={opt.value} checked={rentingType === opt.value} onChange={() => setRentingType(opt.value)} className="mt-0.5 accent-[#4F46E5]" />
              <div>
                <p className="text-[13px] font-semibold text-[#16130C]">{opt.label}</p>
                <p className="text-[11px] text-[#9C9485]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
        {(rentingType === "entire_place" || rentingType === "both") && (
          <Field label="Entire place price per night (KSh)">
            <input type="number" min={0} value={entirePlacePrice} onChange={(e) => setEntirePlacePrice(e.target.value === "" ? "" : parseFloat(e.target.value))} className={inputCls} placeholder="e.g. 150000" />
          </Field>
        )}
      </Section>

      {/* ── Listing connection ── */}
      <Section title="Listing connection">
        <Field label="Klickenya listing slug">
          <input type="text" value={listingSlug} onChange={(e) => setListingSlug(e.target.value)} className={inputCls + " font-mono"} placeholder="your-property-slug" />
          <p className="text-[10px] text-[#9C9485] mt-1">Find in your listing URL: klickenya.com/stays/[city]/<b>your-slug-here</b></p>
        </Field>
        {listingSlug && (
          <a href={`https://klickenya.com/stays/${(city || "").toLowerCase().replace(/ /g, "-")}/${listingSlug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">
            View listing ↗
          </a>
        )}
      </Section>

      {/* ── Booking widget ── */}
      <Section title="Booking widget">
        <Field label="Widget slug">
          <input type="text" value={bookingSlug} onChange={(e) => setBookingSlug(e.target.value)} className={inputCls + " font-mono"} placeholder="maya-kobe" />
        </Field>
        {bookingSlug && (
          <div className="flex items-center gap-2 bg-[#F4F1EC] rounded-lg px-3 py-2">
            <p className="text-[12px] text-[#5E5848] font-mono flex-1 truncate">klickenya.com/b/{bookingSlug}</p>
            <button
              onClick={() => navigator.clipboard.writeText(`https://klickenya.com/b/${bookingSlug}`)}
              className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA] shrink-0"
            >
              Copy
            </button>
          </div>
        )}
        <p className="text-[10px] text-[#9C9485]">Embed this link on your website or share it with guests for direct bookings.</p>
      </Section>

      {/* ── Save button ── */}
      {message && (
        <div className={`mb-3 p-3 rounded-lg text-[13px] font-medium ${message.type === "success" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}
      <button onClick={saveProperty} disabled={saving} className="w-full h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50 mb-8">
        {saving ? "Saving..." : "Save settings"}
      </button>

      {/* ── Rooms ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[17px] font-bold text-[#16130C] tracking-[-0.02em]">Rooms</h2>
          <button onClick={() => setShowAddRoom(true)} className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">+ Add room</button>
        </div>

        {rooms.length === 0 && !showAddRoom && (
          <p className="text-[13px] text-[#9C9485] text-center py-6">No rooms yet. Click &quot;+ Add room&quot; to get started.</p>
        )}

        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className={`bg-white rounded-xl border ${room.is_active ? "border-[#E2DDD5]" : "border-[#E2DDD5] opacity-50"} shadow-sm overflow-hidden`}>
              {editingRoom === room.id ? (
                <RoomEditor room={room} onSave={(u) => saveRoom(room.id, u)} onCancel={() => setEditingRoom(null)} />
              ) : (
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Photo thumbnail */}
                    <div className="w-[80px] h-[60px] rounded-lg overflow-hidden bg-[#F4F1EC] shrink-0 relative">
                      {room.photos[0] ? (
                        <Image src={room.photos[0]} alt={room.name} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[18px]">🛏</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#16130C] truncate">{room.name}</p>
                      <p className="text-[11px] text-[#9C9485]">
                        {room.max_guests} guests · {fmt(room.base_price_kes)}/night
                        {room.bed_type ? ` · ${room.bed_type}` : ""}
                        {room.room_size_sqm ? ` · ${room.room_size_sqm}sqm` : ""}
                      </p>
                      {room.amenities.length > 0 && (
                        <p className="text-[10px] text-[#9C9485] mt-0.5 truncate">{room.amenities.join(" · ")}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button onClick={() => setEditingRoom(room.id)} className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">Edit</button>
                      <button onClick={() => toggleRoomActive(room.id, !room.is_active)} className={`text-[11px] font-semibold ${room.is_active ? "text-red-500" : "text-[#16A34A]"}`}>
                        {room.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {showAddRoom && (
          <div className="mt-3">
            <RoomEditor
              room={null}
              onSave={(newRoom) => addRoom(newRoom as any)}
              onCancel={() => setShowAddRoom(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

const inputCls = "w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm mb-5">
      <h2 className="text-[14px] font-semibold text-[#16130C] mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#16130C] mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ---------- Room Editor ---------- */

function RoomEditor({
  room,
  onSave,
  onCancel,
}: {
  room: Room | null;
  onSave: (updates: Partial<Room>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(room?.name ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [bedType, setBedType] = useState(room?.bed_type ?? "");
  const [sizeSqm, setSizeSqm] = useState<number | "">(room?.room_size_sqm ?? "");
  const [maxGuests, setMaxGuests] = useState(room?.max_guests ?? 2);
  const [price, setPrice] = useState(room?.base_price_kes ?? 5000);
  const [amenities, setAmenities] = useState<string[]>(room?.amenities ?? []);
  const [photos, setPhotos] = useState<string[]>(room?.photos ?? []);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  const toggleAmenity = (a: string) => {
    setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const addPhoto = () => {
    const url = newPhotoUrl.trim();
    if (url && !photos.includes(url)) {
      setPhotos([...photos, url]);
      setNewPhotoUrl("");
    }
  };

  const removePhoto = (url: string) => {
    setPhotos(photos.filter((p) => p !== url));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      bed_type: bedType || null,
      room_size_sqm: sizeSqm === "" ? null : Number(sizeSqm),
      max_guests: maxGuests,
      base_price_kes: price,
      amenities,
      photos,
    });
  };

  return (
    <div className="bg-[#FAFAF8] border border-[#E2DDD5] rounded-xl p-4 space-y-3">
      <p className="text-[12px] font-bold text-[#4F46E5]">{room ? "Edit room" : "New room"}</p>

      {/* Name + Bed type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Room name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Deluxe Suite" />
        </div>
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Bed type</label>
          <select value={bedType} onChange={(e) => setBedType(e.target.value)} className={inputCls + " bg-white"}>
            <option value="">Select...</option>
            {BED_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] text-[#9C9485] mb-0.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none resize-none" placeholder="A spacious suite with ocean views..." />
      </div>

      {/* Size + Guests + Price */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Size (sqm)</label>
          <input type="number" min={0} value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value === "" ? "" : parseFloat(e.target.value))} className={inputCls} placeholder="35" />
        </div>
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Max guests</label>
          <input type="number" min={1} max={20} value={maxGuests} onChange={(e) => setMaxGuests(parseInt(e.target.value) || 2)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Price/night (KSh)</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-[11px] text-[#9C9485] mb-1.5">Amenities</label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES_LIST.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                amenities.includes(a)
                  ? "bg-[#4F46E5] text-white"
                  : "bg-[#F4F1EC] text-[#5E5848] hover:bg-[#E2DDD5]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-[11px] text-[#9C9485] mb-1.5">Photos</label>
        {photos.length > 0 && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {photos.map((url) => (
              <div key={url} className="relative w-[72px] h-[54px] rounded-lg overflow-hidden bg-[#F4F1EC] shrink-0 group">
                <Image src={url} alt="" fill className="object-cover" sizes="72px" />
                <button
                  onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 size-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="url"
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPhoto()}
            className={inputCls + " flex-1"}
            placeholder="Paste image URL..."
          />
          <button onClick={addPhoto} className="h-[40px] px-3 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA] shrink-0">Add</button>
        </div>
        <p className="text-[10px] text-[#9C9485] mt-1">Paste image URLs. Upload support coming in V1.</p>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="h-[36px] px-4 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA]">
          {room ? "Save changes" : "Add room"}
        </button>
        <button onClick={onCancel} className="h-[36px] px-4 border border-[#E2DDD5] text-[12px] font-semibold text-[#5E5848] rounded-lg hover:bg-[#F4F1EC]">Cancel</button>
      </div>
    </div>
  );
}
