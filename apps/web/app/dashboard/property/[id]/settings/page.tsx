"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Room {
  id: string;
  name: string;
  room_type: string;
  max_guests: number;
  base_price_kes: number;
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

export default function PropertySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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

  // Rooms
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState({ name: "", max_guests: 2, base_price_kes: 5000 });
  const [showAddRoom, setShowAddRoom] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [propRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase
          .from("rooms")
          .select("id, name, room_type, max_guests, base_price_kes, is_active, display_order")
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
      }
      setRooms(roomsRes.data ?? []);
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
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error ?? "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  };

  const toggleRoomActive = async (roomId: string, active: boolean) => {
    const supabase = createClient();
    await supabase.from("rooms").update({ is_active: active }).eq("id", roomId);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, is_active: active } : r)));
  };

  const updateRoom = async (roomId: string, updates: Partial<Room>) => {
    const supabase = createClient();
    await supabase.from("rooms").update(updates).eq("id", roomId);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r)));
    setEditingRoom(null);
  };

  const addRoom = async () => {
    if (!newRoom.name.trim()) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("rooms")
      .insert({
        property_id: id,
        name: newRoom.name.trim(),
        max_guests: newRoom.max_guests,
        base_price_kes: newRoom.base_price_kes,
        display_order: rooms.length,
      })
      .select()
      .single();
    if (data) {
      setRooms((prev) => [...prev, data]);
      setNewRoom({ name: "", max_guests: 2, base_price_kes: 5000 });
      setShowAddRoom(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto animate-pulse">
        <div className="h-7 w-40 bg-[#E2DDD5] rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-[#F4F1EC] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <div className="mb-5">
        <Link href={`/dashboard/property/${id}`} className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
          ← Back to calendar
        </Link>
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
          Property Settings
        </h1>
      </div>

      {/* Property details */}
      <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm mb-5">
        <h2 className="text-[14px] font-semibold text-[#16130C] mb-4">Property details</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Property type</label>
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white">
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>{pt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Check-in time</label>
              <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Check-out time</label>
              <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Minimum stay (nights)</label>
            <input type="number" min={1} max={30} value={minStay} onChange={(e) => setMinStay(parseInt(e.target.value) || 1)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors" placeholder="e.g. Watamu" />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors" placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Listing connection */}
      <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm mb-5">
        <h2 className="text-[14px] font-semibold text-[#16130C] mb-4">Listing connection</h2>

        <div>
          <label className="block text-[12px] font-semibold text-[#16130C] mb-1">Klickenya listing slug</label>
          <input
            type="text"
            value={listingSlug}
            onChange={(e) => setListingSlug(e.target.value)}
            className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors font-mono"
            placeholder="your-property-slug"
          />
          <p className="text-[11px] text-[#9C9485] mt-1">
            Find in your listing URL: klickenya.com/stays/[city]/<span className="font-semibold">your-slug-here</span>
          </p>
          {listingSlug && (
            <a
              href={`https://klickenya.com/stays/${(city || "").toLowerCase().replace(/ /g, "-")}/${listingSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA] mt-1 inline-block"
            >
              View listing ↗
            </a>
          )}
        </div>
      </div>

      {/* Save button */}
      {message && (
        <div className={`mb-3 p-3 rounded-lg text-[13px] font-medium ${message.type === "success" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}
      <button
        onClick={saveProperty}
        disabled={saving}
        className="w-full h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50 mb-8"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>

      {/* Rooms */}
      <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-semibold text-[#16130C]">Rooms</h2>
          <button
            onClick={() => setShowAddRoom(true)}
            className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA]"
          >
            + Add room
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-[13px] text-[#9C9485]">No rooms yet</p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <div key={room.id} className={`rounded-lg border p-3 ${room.is_active ? "border-[#E2DDD5]" : "border-[#E2DDD5] bg-[#F4F1EC]/50 opacity-60"}`}>
                {editingRoom === room.id ? (
                  <RoomEditForm
                    room={room}
                    onSave={(updates) => updateRoom(room.id, updates)}
                    onCancel={() => setEditingRoom(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C]">{room.name}</p>
                      <p className="text-[11px] text-[#9C9485]">
                        {room.max_guests} guests · {fmt(room.base_price_kes)}/night · {room.room_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingRoom(room.id)}
                        className="text-[11px] font-semibold text-[#9C9485] hover:text-[#16130C]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleRoomActive(room.id, !room.is_active)}
                        className={`text-[11px] font-semibold ${room.is_active ? "text-red-500 hover:text-red-700" : "text-[#16A34A] hover:text-[#15803D]"}`}
                      >
                        {room.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add room form */}
        {showAddRoom && (
          <div className="mt-3 p-3 border border-[#4F46E5]/20 rounded-lg bg-[#4F46E5]/5 space-y-2">
            <p className="text-[12px] font-semibold text-[#4F46E5]">New room</p>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="Room name" className="h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] outline-none" />
              <input type="number" min={1} value={newRoom.max_guests} onChange={(e) => setNewRoom({ ...newRoom, max_guests: parseInt(e.target.value) || 2 })} placeholder="Guests" className="h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] outline-none" />
              <input type="number" min={0} value={newRoom.base_price_kes} onChange={(e) => setNewRoom({ ...newRoom, base_price_kes: parseFloat(e.target.value) || 0 })} placeholder="KSh/night" className="h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={addRoom} className="h-[32px] px-3 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA]">Add</button>
              <button onClick={() => setShowAddRoom(false)} className="h-[32px] px-3 border border-[#E2DDD5] text-[12px] font-semibold text-[#5E5848] rounded-lg hover:bg-[#F4F1EC]">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Room edit sub-form ---------- */

function RoomEditForm({
  room,
  onSave,
  onCancel,
}: {
  room: Room;
  onSave: (updates: Partial<Room>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [maxGuests, setMaxGuests] = useState(room.max_guests);
  const [price, setPrice] = useState(room.base_price_kes);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] outline-none" />
        <input type="number" min={1} value={maxGuests} onChange={(e) => setMaxGuests(parseInt(e.target.value) || 2)} className="h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] outline-none" />
        <input type="number" min={0} value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] outline-none" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSave({ name, max_guests: maxGuests, base_price_kes: price })} className="h-[32px] px-3 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA]">Save</button>
        <button onClick={onCancel} className="h-[32px] px-3 border border-[#E2DDD5] text-[12px] font-semibold text-[#5E5848] rounded-lg hover:bg-[#F4F1EC]">Cancel</button>
      </div>
    </div>
  );
}
