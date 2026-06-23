"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { PropertyEmbedPanel } from "@/components/dashboard/property/PropertyEmbedPanel";

/* ---------- Helpers ---------- */

/**
 * Compress an image file on the client using Canvas.
 * Returns a compressed File (JPEG, max 1200px on longest side, quality 0.8).
 * Falls back to original if canvas isn't available.
 */
async function compressImage(file: File, maxDim = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // If already small enough or not an image type we handle, skip
    if (file.size < 100_000 || !file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than maxDim
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
          const compressed = new File([blob], file.name, { type: "image/jpeg" });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function isOptimizableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "cdn.sanity.io" || host.endsWith(".supabase.co") || host === "images.unsplash.com";
  } catch {
    return false;
  }
}

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

interface PropertyFee {
  id: string;
  name: string;
  fee_type: "fixed" | "per_night" | "per_guest" | "percentage";
  amount: number;
  apply_by_default: boolean;
  is_active: boolean;
  sort_order: number;
}

interface PricingRule {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_type: "multiplier" | "fixed";
  value: number;
  priority: number;
  is_active: boolean;
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
  const [rentingType, setRentingType] = useState("both");
  const [entirePlacePrice, setEntirePlacePrice] = useState<number | "">("");
  const [bookingSlug, setBookingSlug] = useState("");
  const [isActive, setIsActive] = useState(false);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  // Sync button
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  // Pricing
  const [weekendMultiplier, setWeekendMultiplier] = useState(1.0);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);

  // Fees
  const [fees, setFees] = useState<PropertyFee[]>([]);
  const [showAddFee, setShowAddFee] = useState(false);
  const [editingFee, setEditingFee] = useState<string | null>(null);

  // Rooms
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [showAddRoom, setShowAddRoom] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [propRes, roomsRes, rulesRes, feesRes] = await Promise.all([
        supabase.from("properties").select("*").eq("id", id).single(),
        supabase
          .from("rooms")
          .select("id, name, description, room_type, bed_type, room_size_sqm, max_guests, base_price_kes, amenities, photos, is_active, display_order")
          .eq("property_id", id)
          .order("display_order"),
        supabase
          .from("pricing_rules")
          .select("id, name, start_date, end_date, price_type, value, priority, is_active")
          .eq("property_id", id)
          .order("priority", { ascending: false }),
        supabase
          .from("property_fees")
          .select("id, name, fee_type, amount, apply_by_default, is_active, sort_order")
          .eq("property_id", id)
          .order("sort_order"),
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
        setIsActive(p.is_active ?? false);
        setWeekendMultiplier(p.weekend_multiplier ?? 1.0);
      }
      setPricingRules((rulesRes.data ?? []) as PricingRule[]);
      setFees((feesRes.data ?? []) as PropertyFee[]);
      setRooms((roomsRes.data ?? []).map((r) => ({
        ...r,
        amenities: r.amenities ?? [],
        photos: r.photos ?? [],
      })));
      setLoading(false);
    })();
  }, [id]);

  const syncLiveListing = async () => {
    setSyncState("syncing");
    try {
      const res = await fetch(`/api/properties/${id}/revalidate`, { method: "POST" });
      if (res.ok) {
        setSyncState("synced");
        setTimeout(() => setSyncState("idle"), 10_000);
      } else {
        setSyncState("error");
      }
    } catch {
      setSyncState("error");
    }
  };

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
          is_active: isActive,
          weekend_multiplier: weekendMultiplier,
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
    const { error } = await supabase.from("rooms").update(updates).eq("id", roomId);
    if (error) {
      setMessage({ type: "error", text: `Failed to save room: ${error.message}` });
      return;
    }
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r)));
    setEditingRoom(null);
    setMessage({ type: "success", text: "Room saved" });
  };

  const toggleRoomActive = async (roomId: string, active: boolean) => {
    const supabase = createClient();
    await supabase.from("rooms").update({ is_active: active }).eq("id", roomId);
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, is_active: active } : r)));
  };

  const handleToggleActive = async () => {
    setTogglingActive(true);
    const newActive = !isActive;
    const supabase = createClient();
    const { error } = await supabase.from("properties").update({ is_active: newActive }).eq("id", id);
    if (!error) {
      setIsActive(newActive);
      setMessage({ type: "success", text: newActive ? "Property enabled — now accepting bookings." : "Property disabled — hidden from bookings." });
    }
    setTogglingActive(false);
  };

  const handleDeleteProperty = async () => {
    setDeletingProperty(true);
    const supabase = createClient();
    // Delete rooms first (in case FK doesn't cascade)
    await supabase.from("rooms").delete().eq("property_id", id);
    await supabase.from("properties").delete().eq("id", id);
    router.push("/dashboard/property");
  };

  const addRoom = async (room: Omit<Room, "id" | "display_order" | "is_active">) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ ...room, property_id: id, display_order: rooms.length, is_active: true })
      .select()
      .single();
    if (error) {
      setMessage({ type: "error", text: `Failed to add room: ${error.message}` });
      return;
    }
    if (data) {
      setRooms((prev) => [...prev, { ...data, amenities: data.amenities ?? [], photos: data.photos ?? [] }]);
      setShowAddRoom(false);
      setMessage({ type: "success", text: "Room added" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto animate-pulse">
        <div className="h-7 w-40 bg-border rounded-lg mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-surface rounded-xl mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto">
      <div className="mb-5">
        <Link href={`/dashboard/property/${id}`} className="text-[13px] text-text3 hover:text-dark transition-colors">
          ← Back to calendar
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
            Property Settings
          </h1>
          {listingSlug && (
            <button
              type="button"
              onClick={syncLiveListing}
              disabled={syncState === "syncing"}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-semibold transition-colors disabled:cursor-not-allowed ${
                syncState === "synced"
                  ? "bg-green/10 text-green"
                  : syncState === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-surface text-text2 hover:bg-border"
              }`}
            >
              {syncState === "syncing" ? (
                "Syncing…"
              ) : syncState === "synced" ? (
                "✓ Synced just now"
              ) : syncState === "error" ? (
                "Sync failed — try again"
              ) : (
                "🔄 Sync live listing"
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Booking system toggle ── */}
      <div className={`rounded-xl lg:rounded-2xl border-2 p-4 lg:p-5 shadow-sm mb-5 transition-colors ${isActive ? "border-green/30 bg-green/[0.03]" : "border-border bg-white"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${isActive ? "bg-green/10" : "bg-surface"}`}>
              <span className="text-[20px]">{isActive ? "📅" : "🔒"}</span>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-dark">
                Booking system
              </p>
              <p className="text-[11px] text-text3">
                {isActive
                  ? "Live — guests can check availability on your listing"
                  : "Off — listing shows basic contact form only"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${isActive ? "bg-green" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        </div>
        {!isActive && rooms.length > 0 && (
          <p className="text-[11px] text-amber font-medium mt-2 ml-[52px]">
            You have {rooms.length} room{rooms.length !== 1 ? "s" : ""} set up. Turn on to show availability on your listing.
          </p>
        )}
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
            <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${rentingType === opt.value ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-border hover:border-text3"}`}>
              <input type="radio" name="renting_type" value={opt.value} checked={rentingType === opt.value} onChange={() => setRentingType(opt.value)} className="mt-0.5 accent-[#4F46E5]" />
              <div>
                <p className="text-[13px] font-semibold text-dark">{opt.label}</p>
                <p className="text-[11px] text-text3">{opt.desc}</p>
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
        <Field label="Listing slug">
          {listingSlug ? (
            <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2.5">
              <p className="text-[13px] text-text2 font-mono flex-1 truncate">
                klickenya.com/stays/{(city || "city").toLowerCase().replace(/\s+/g, "-")}/{listingSlug}
              </p>
              <button
                type="button"
                onClick={() => {
                  const url = `https://klickenya.com/stays/${(city || "").toLowerCase().replace(/\s+/g, "-")}/${listingSlug}`;
                  if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url);
                  } else {
                    const input = document.createElement("input");
                    input.value = url;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand("copy");
                    document.body.removeChild(input);
                  }
                }}
                className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA] shrink-0"
              >
                Copy
              </button>
            </div>
          ) : (
            <input type="text" value={listingSlug} onChange={(e) => setListingSlug(e.target.value)} className={inputCls + " font-mono"} placeholder="your-property-slug" />
          )}
          <p className="text-[10px] text-text3 mt-1">
            {listingSlug ? "This is your listing URL — it cannot be changed." : "Enter the slug from your listing URL to link this property."}
          </p>
        </Field>
      </Section>

      {/* ── Booking widget ── */}
      <Section title="Booking widget">
        <Field label="Widget slug">
          <input type="text" value={bookingSlug} onChange={(e) => setBookingSlug(e.target.value)} className={inputCls + " font-mono"} placeholder="maya-kobe" />
        </Field>
        {bookingSlug && (
          <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2">
            <p className="text-[12px] text-text2 font-mono flex-1 truncate">klickenya.com/b/{bookingSlug}</p>
            <button
              onClick={() => {
                const url = `https://klickenya.com/b/${bookingSlug}`;
                if (navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(url);
                } else {
                  const input = document.createElement("input");
                  input.value = url;
                  document.body.appendChild(input);
                  input.select();
                  document.execCommand("copy");
                  document.body.removeChild(input);
                }
              }}
              className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA] shrink-0"
            >
              Copy
            </button>
          </div>
        )}
        <p className="text-[10px] text-text3">Embed this link on your website or share it with guests for direct bookings.</p>
        {bookingSlug.trim() && <PropertyEmbedPanel bookingSlug={bookingSlug.trim()} />}
      </Section>

      {/* ── Pricing ── */}
      <Section title="Pricing">
        <Field label="Weekend multiplier">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={5}
              step={0.05}
              value={weekendMultiplier}
              onChange={(e) => setWeekendMultiplier(parseFloat(e.target.value) || 1)}
              className={inputCls + " max-w-[120px]"}
            />
            <span className="text-[12px] text-text3">
              {weekendMultiplier > 1
                ? `+${Math.round((weekendMultiplier - 1) * 100)}% on Fri/Sat/Sun check-ins`
                : "No weekend markup (applies to Fri/Sat/Sun check-ins)"}
            </span>
          </div>
        </Field>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-dark">Season pricing rules</p>
            <button
              type="button"
              onClick={() => { setShowAddRule(true); setEditingRule(null); }}
              className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA]"
            >
              + Add rule
            </button>
          </div>

          {pricingRules.length === 0 && !showAddRule && (
            <p className="text-[12px] text-text3 py-3">No season rules yet. Add one to override pricing during specific periods.</p>
          )}

          <div className="space-y-2">
            {pricingRules.map((rule) => (
              <div key={rule.id} className={`bg-white rounded-xl border border-border p-3 ${!rule.is_active ? "opacity-50" : ""}`}>
                {editingRule === rule.id ? (
                  <PricingRuleForm
                    initial={rule}
                    propertyId={id}
                    onSaved={(updated) => {
                      setPricingRules((prev) => prev.map((r) => r.id === updated.id ? updated : r));
                      setEditingRule(null);
                    }}
                    onCancel={() => setEditingRule(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-dark">{rule.name}</p>
                      <p className="text-[11px] text-text3 mt-0.5">
                        {rule.start_date} → {rule.end_date}
                        {" · "}
                        {rule.price_type === "fixed"
                          ? `Fixed ${fmt(rule.value)}/night`
                          : `×${rule.value} (${rule.value > 1 ? "+" : ""}${Math.round((rule.value - 1) * 100)}%)`}
                        {" · "}Priority {rule.priority}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase.from("pricing_rules").update({ is_active: !rule.is_active }).eq("id", rule.id);
                          setPricingRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
                        }}
                        className={`text-[11px] font-semibold ${rule.is_active ? "text-text3 hover:text-red-500" : "text-green"}`}
                      >
                        {rule.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRule(rule.id)}
                        className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Delete this pricing rule?")) return;
                          const supabase = createClient();
                          await supabase.from("pricing_rules").delete().eq("id", rule.id);
                          setPricingRules((prev) => prev.filter((r) => r.id !== rule.id));
                        }}
                        className="text-[11px] font-semibold text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAddRule && (
            <div className="mt-2">
              <PricingRuleForm
                initial={null}
                propertyId={id}
                onSaved={(newRule) => {
                  setPricingRules((prev) => [newRule, ...prev]);
                  setShowAddRule(false);
                }}
                onCancel={() => setShowAddRule(false)}
              />
            </div>
          )}
        </div>
      </Section>

      {/* ── Fees & charges ── */}
      <Section title="Fees & charges">
        <p className="text-[12px] text-text3 -mt-1">Define reusable fees that appear automatically when creating bookings.</p>

        <div className="mt-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-dark">Fee templates</p>
            <button type="button" onClick={() => { setShowAddFee(true); setEditingFee(null); }} className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">
              + Add fee
            </button>
          </div>

          {fees.length === 0 && !showAddFee && (
            <p className="text-[12px] text-text3 py-3">No fees yet. Add cleaning fees, VAT, tourist levies, etc.</p>
          )}

          <div className="space-y-2">
            {fees.map((fee) => (
              <div key={fee.id} className={`bg-white rounded-xl border border-border p-3 ${!fee.is_active ? "opacity-50" : ""}`}>
                {editingFee === fee.id ? (
                  <FeeForm
                    initial={fee}
                    propertyId={id}
                    onSaved={(updated) => { setFees((prev) => prev.map((f) => f.id === updated.id ? updated : f)); setEditingFee(null); }}
                    onCancel={() => setEditingFee(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-dark">{fee.name}</p>
                      <p className="text-[11px] text-text3 mt-0.5">
                        {fee.fee_type === "fixed" && fmt(fee.amount)}
                        {fee.fee_type === "per_night" && `${fmt(fee.amount)} / night`}
                        {fee.fee_type === "per_guest" && `${fmt(fee.amount)} / guest`}
                        {fee.fee_type === "percentage" && `${fee.amount}% of subtotal`}
                        {" "}
                        {fee.apply_by_default
                          ? <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">Mandatory</span>
                          : <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">Upsell</span>
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={async () => {
                        const supabase = createClient();
                        await supabase.from("property_fees").update({ is_active: !fee.is_active }).eq("id", fee.id);
                        setFees((prev) => prev.map((f) => f.id === fee.id ? { ...f, is_active: !f.is_active } : f));
                      }} className={`text-[11px] font-semibold ${fee.is_active ? "text-text3 hover:text-red-500" : "text-green"}`}>
                        {fee.is_active ? "Disable" : "Enable"}
                      </button>
                      <button type="button" onClick={() => setEditingFee(fee.id)} className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">Edit</button>
                      <button type="button" onClick={async () => {
                        if (!confirm("Delete this fee?")) return;
                        const supabase = createClient();
                        await supabase.from("property_fees").delete().eq("id", fee.id);
                        setFees((prev) => prev.filter((f) => f.id !== fee.id));
                      }} className="text-[11px] font-semibold text-red-500 hover:text-red-700">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showAddFee && (
            <div className="mt-2">
              <FeeForm
                initial={null}
                propertyId={id}
                onSaved={(newFee) => { setFees((prev) => [...prev, newFee]); setShowAddFee(false); }}
                onCancel={() => setShowAddFee(false)}
              />
            </div>
          )}
        </div>
      </Section>

      {/* ── Save button ── */}
      {message && (
        <div className={`mb-3 p-3 rounded-lg text-[13px] font-medium ${message.type === "success" ? "bg-green/10 text-green" : "bg-red-50 text-red-600"}`}>
          {message.text}
        </div>
      )}
      <div className="flex gap-2 mb-8">
        <button onClick={saveProperty} disabled={saving} className="flex-1 h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save settings"}
        </button>
        {listingSlug && (
          <a
            href={`/stays/${(city || "").toLowerCase().replace(/\s+/g, "-")}/${listingSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-[44px] px-5 border border-border text-text2 font-semibold text-[13px] rounded-xl hover:bg-surface transition-colors flex items-center gap-1.5 shrink-0"
          >
            View live ↗
          </a>
        )}
      </div>

      {/* ── Rooms ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[17px] font-bold text-dark tracking-[-0.02em]">Rooms</h2>
          <button onClick={() => setShowAddRoom(true)} className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">+ Add room</button>
        </div>

        {rooms.length === 0 && !showAddRoom && (
          <p className="text-[13px] text-text3 text-center py-6">No rooms yet. Click &quot;+ Add room&quot; to get started.</p>
        )}

        <div className="space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className={`bg-white rounded-xl border ${room.is_active ? "border-border" : "border-border opacity-50"} shadow-sm overflow-hidden`}>
              {editingRoom === room.id ? (
                <RoomEditor room={room} propertyId={id} propertyName={name} onSave={(u) => saveRoom(room.id, u)} onCancel={() => setEditingRoom(null)} />
              ) : (
                <div className="p-4">
                  <div className="flex gap-3">
                    {/* Photo thumbnail */}
                    <div className="w-[80px] h-[60px] rounded-lg overflow-hidden bg-surface shrink-0 relative">
                      {room.photos[0] ? (
                        <Image src={room.photos[0]} alt={room.name} fill className="object-cover" sizes="80px" unoptimized={!isOptimizableUrl(room.photos[0])} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[18px]">🛏</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-dark truncate">{room.name}</p>
                      <p className="text-[11px] text-text3">
                        {room.max_guests} guests · {fmt(room.base_price_kes)}/night
                        {room.bed_type ? ` · ${room.bed_type}` : ""}
                        {room.room_size_sqm ? ` · ${room.room_size_sqm}sqm` : ""}
                      </p>
                      {room.amenities.length > 0 && (
                        <p className="text-[10px] text-text3 mt-0.5 truncate">{room.amenities.join(" · ")}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button onClick={() => setEditingRoom(room.id)} className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">Edit</button>
                      <button onClick={() => toggleRoomActive(room.id, !room.is_active)} className={`text-[11px] font-semibold ${room.is_active ? "text-red-500" : "text-green"}`}>
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
              propertyId={id}
              propertyName={name}
              onSave={(newRoom) => addRoom(newRoom as any)}
              onCancel={() => setShowAddRoom(false)}
            />
          </div>
        )}
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-xl border border-red-100 bg-white p-4 lg:p-5 shadow-sm mb-8">
        <h2 className="text-[13px] font-semibold text-red-600 uppercase tracking-wider mb-4">Danger Zone</h2>

        {/* Disable / Enable */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface">
          <div>
            <p className="text-[13px] font-semibold text-dark">
              {isActive ? "Disable property" : "Property is disabled"}
            </p>
            <p className="text-[11px] text-text3 mt-0.5">
              {isActive
                ? "Stops accepting new bookings. Existing bookings are unaffected."
                : "Property is currently hidden from bookings. Enable to reopen."}
            </p>
          </div>
          <button
            onClick={handleToggleActive}
            disabled={togglingActive}
            className={`shrink-0 text-[12px] font-semibold px-3 h-[32px] rounded-lg border transition-colors disabled:opacity-50 ${
              isActive
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-green/30 text-green hover:bg-green/5"
            }`}
          >
            {togglingActive ? "…" : isActive ? "Disable" : "Enable"}
          </button>
        </div>

        {/* Delete */}
        <div className="pt-4">
          {!deleteConfirm ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-dark">Delete property</p>
                <p className="text-[11px] text-text3 mt-0.5">
                  Permanently removes this property and all its rooms. This cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="shrink-0 text-[12px] font-semibold text-red-600 px-3 h-[32px] rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-[13px] font-semibold text-red-700 mb-1">
                Delete &ldquo;{name}&rdquo;?
              </p>
              <p className="text-[11px] text-red-600 mb-4">
                All rooms, blocked dates, and settings will be permanently deleted. Existing bookings are <strong>not</strong> deleted but will lose their property link.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 h-[36px] text-[12px] font-semibold rounded-lg border border-border text-text2 hover:bg-surface bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProperty}
                  disabled={deletingProperty}
                  className="flex-1 h-[36px] text-[12px] font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deletingProperty ? "Deleting…" : "Yes, delete property"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

const inputCls = "w-full h-[40px] px-3 rounded-lg border border-border text-[14px] text-dark focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 lg:p-5 shadow-sm mb-5">
      <h2 className="text-[14px] font-semibold text-dark mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-dark mb-1">{label}</label>
      {children}
    </div>
  );
}

/* ---------- Room Editor ---------- */

function RoomEditor({
  room,
  propertyId,
  propertyName,
  onSave,
  onCancel,
}: {
  room: Room | null;
  propertyId: string;
  propertyName: string;
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 8 - photos.length;
    if (remaining <= 0) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const rawFile of Array.from(files).slice(0, remaining)) {
      if (!rawFile.type.startsWith("image/")) continue;
      try {
        const compressed = await compressImage(rawFile);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("property_id", propertyId);
        formData.append("property_name", propertyName);
        formData.append("room_name", name || "room");

        const res = await fetch("/api/properties/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.url) newUrls.push(data.url);
      } catch {
        // skip failed uploads silently
      }
    }

    if (newUrls.length > 0) {
      setPhotos((prev) => [...prev, ...newUrls]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    <div className="bg-canvas border border-border rounded-xl p-4 space-y-3">
      <p className="text-[12px] font-bold text-[#4F46E5]">{room ? "Edit room" : "New room"}</p>

      {/* Name + Bed type */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-text3 mb-0.5">Room name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Deluxe Suite" />
        </div>
        <div>
          <label className="block text-[11px] text-text3 mb-0.5">Bed type</label>
          <select value={bedType} onChange={(e) => setBedType(e.target.value)} className={inputCls + " bg-white"}>
            <option value="">Select...</option>
            {BED_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] text-text3 mb-0.5">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-[13px] text-dark placeholder:text-text3 focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none resize-none" placeholder="A spacious suite with ocean views..." />
      </div>

      {/* Size + Guests + Price */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] text-text3 mb-0.5">Size (sqm)</label>
          <input type="number" min={0} value={sizeSqm} onChange={(e) => setSizeSqm(e.target.value === "" ? "" : parseFloat(e.target.value))} className={inputCls} placeholder="35" />
        </div>
        <div>
          <label className="block text-[11px] text-text3 mb-0.5">Max guests</label>
          <input type="number" min={1} max={20} value={maxGuests} onChange={(e) => setMaxGuests(parseInt(e.target.value) || 2)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] text-text3 mb-0.5">Price/night (KSh)</label>
          <input type="number" min={0} value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-[11px] text-text3 mb-1.5">Amenities</label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITIES_LIST.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                amenities.includes(a)
                  ? "bg-[#4F46E5] text-white"
                  : "bg-surface text-text2 hover:bg-border"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div>
        <label className="block text-[11px] text-text3 mb-1.5">Photos {photos.length > 0 && <span className="text-text3">({photos.length}/8)</span>}</label>

        {/* Main preview */}
        {photos.length > 0 && (
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-surface mb-2">
            <Image src={photos[0]} alt="Main photo" fill className="object-cover" sizes="400px" unoptimized={!isOptimizableUrl(photos[0])} />
            <button
              onClick={() => removePhoto(photos[0])}
              className="absolute top-2 right-2 size-6 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
            {photos.map((url, i) => (
              <div key={url} className={`relative w-[56px] h-[42px] rounded-md overflow-hidden shrink-0 group cursor-pointer ${i === 0 ? "ring-2 ring-[#4F46E5]" : "opacity-70 hover:opacity-100"}`}
                onClick={() => {
                  // Move clicked photo to front
                  const reordered = [url, ...photos.filter((p) => p !== url)];
                  setPhotos(reordered);
                }}
              >
                <Image src={url} alt="" fill className="object-cover" sizes="56px" unoptimized={!isOptimizableUrl(url)} />
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(url); }}
                  className="absolute top-0.5 right-0.5 size-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-[48px] border-2 border-dashed border-border rounded-lg text-[13px] font-medium text-text2 hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4m-9 8h14" />
              </svg>
              Upload photos
            </>
          )}
        </button>

        {/* OR paste URL */}
        <div className="flex gap-2 mt-2">
          <input
            type="url"
            value={newPhotoUrl}
            onChange={(e) => setNewPhotoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPhoto()}
            className={inputCls + " flex-1"}
            placeholder="Or paste image URL..."
          />
          <button onClick={addPhoto} className="h-[40px] px-3 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA] shrink-0">Add</button>
        </div>
        <p className="text-[10px] text-text3 mt-1">Images are compressed automatically. Max 8 photos per room.</p>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} className="h-[36px] px-4 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA]">
          {room ? "Save changes" : "Add room"}
        </button>
        <button onClick={onCancel} className="h-[36px] px-4 border border-border text-[12px] font-semibold text-text2 rounded-lg hover:bg-surface">Cancel</button>
      </div>
    </div>
  );
}

/* ---------- Pricing Rule Form ---------- */

function PricingRuleForm({
  initial,
  propertyId,
  onSaved,
  onCancel,
}: {
  initial: PricingRule | null;
  propertyId: string;
  onSaved: (rule: PricingRule) => void;
  onCancel: () => void;
}) {
  const [ruleName, setRuleName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [priceType, setPriceType] = useState<"multiplier" | "fixed">(initial?.price_type ?? "multiplier");
  const [value, setValue] = useState<number | "">(initial?.value ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!ruleName.trim()) { setError("Name is required"); return; }
    if (!startDate || !endDate) { setError("Start and end dates required"); return; }
    if (endDate < startDate) { setError("End date must be on or after start date"); return; }
    if (!value) { setError("Value is required"); return; }
    if (priceType === "multiplier" && Number(value) < 0.1) { setError("Multiplier must be at least 0.1"); return; }

    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (initial) {
      const { data, error: err } = await supabase
        .from("pricing_rules")
        .update({ name: ruleName.trim(), start_date: startDate, end_date: endDate, price_type: priceType, value: Number(value), priority })
        .eq("id", initial.id)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as PricingRule);
    } else {
      const { data, error: err } = await supabase
        .from("pricing_rules")
        .insert({ property_id: propertyId, name: ruleName.trim(), start_date: startDate, end_date: endDate, price_type: priceType, value: Number(value), priority, is_active: true })
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as PricingRule);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">Rule name</label>
          <input type="text" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="e.g. Christmas Peak" className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">End date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Pricing type</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: "multiplier", label: "Multiplier", hint: "e.g. 1.5 = +50%" },
            { v: "fixed", label: "Fixed price", hint: "KSh per night" },
          ] as const).map((opt) => (
            <label key={opt.v} className={`flex items-start gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${priceType === opt.v ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-border bg-white hover:border-text3"}`}>
              <input type="radio" checked={priceType === opt.v} onChange={() => setPriceType(opt.v)} className="mt-0.5 accent-[#4F46E5]" />
              <div>
                <p className="text-[12px] font-semibold text-dark">{opt.label}</p>
                <p className="text-[10px] text-text3">{opt.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">
            {priceType === "multiplier" ? "Multiplier (e.g. 1.5)" : "Fixed price (KSh)"}
          </label>
          <input
            type="number"
            min={priceType === "multiplier" ? 0.1 : 0}
            step={priceType === "multiplier" ? 0.05 : 100}
            value={value}
            onChange={(e) => setValue(e.target.value === "" ? "" : parseFloat(e.target.value))}
            placeholder={priceType === "multiplier" ? "1.5" : "25000"}
            className={inputCls}
          />
          {priceType === "multiplier" && value !== "" && Number(value) > 0 && (
            <p className="text-[10px] text-text3 mt-0.5">
              {Number(value) > 1 ? `+${Math.round((Number(value) - 1) * 100)}% above base price` : Number(value) < 1 ? `${Math.round((1 - Number(value)) * 100)}% below base price` : "Same as base price"}
            </p>
          )}
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">Priority</label>
          <input type="number" min={0} max={100} value={priority} onChange={(e) => setPriority(parseInt(e.target.value) || 0)} className={inputCls} />
          <p className="text-[10px] text-text3 mt-0.5">Higher = takes precedence when rules overlap</p>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="h-[36px] px-4 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA] disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Save changes" : "Add rule"}
        </button>
        <button type="button" onClick={onCancel} className="h-[36px] px-4 border border-border text-[12px] font-semibold text-text2 rounded-lg hover:bg-surface bg-white">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------- Fee Form ---------- */

function FeeForm({
  initial,
  propertyId,
  onSaved,
  onCancel,
}: {
  initial: PropertyFee | null;
  propertyId: string;
  onSaved: (fee: PropertyFee) => void;
  onCancel: () => void;
}) {
  const [feeName, setFeeName] = useState(initial?.name ?? "");
  const [feeType, setFeeType] = useState<PropertyFee["fee_type"]>(initial?.fee_type ?? "fixed");
  const [amount, setAmount] = useState<number | "">(initial?.amount ?? "");
  const [applyByDefault, setApplyByDefault] = useState(initial?.apply_by_default ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FEE_TYPES = [
    { value: "fixed",      label: "Flat fee",     hint: "One-time, e.g. cleaning" },
    { value: "per_night",  label: "Per night",    hint: "Amount × nights" },
    { value: "per_guest",  label: "Per guest",    hint: "Amount × guests" },
    { value: "percentage", label: "Percentage",   hint: "% of room subtotal" },
  ] as const;

  const handleSave = async () => {
    if (!feeName.trim()) { setError("Name is required"); return; }
    if (amount === "" || Number(amount) < 0) { setError("Amount must be 0 or greater"); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    if (initial) {
      const { data, error: err } = await supabase
        .from("property_fees")
        .update({ name: feeName.trim(), fee_type: feeType, amount: Number(amount), apply_by_default: applyByDefault })
        .eq("id", initial.id)
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as PropertyFee);
    } else {
      const { data: existingFees } = await supabase
        .from("property_fees")
        .select("sort_order")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();
      const sortOrder = existingFees ? (existingFees.sort_order ?? 0) + 1 : 0;
      const { data, error: err } = await supabase
        .from("property_fees")
        .insert({ property_id: propertyId, name: feeName.trim(), fee_type: feeType, amount: Number(amount), apply_by_default: applyByDefault, is_active: true, sort_order: sortOrder })
        .select()
        .single();
      if (err) { setError(err.message); setSaving(false); return; }
      onSaved(data as PropertyFee);
    }
  };

  return (
    <div className="bg-surface rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">Fee name</label>
        <input type="text" value={feeName} onChange={(e) => setFeeName(e.target.value)} placeholder="e.g. Cleaning fee, Tourist levy, VAT" className={inputCls} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {FEE_TYPES.map((t) => (
            <label key={t.value} className={`flex items-start gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition-all ${feeType === t.value ? "border-[#4F46E5] bg-[#4F46E5]/5" : "border-border bg-white hover:border-text3"}`}>
              <input type="radio" checked={feeType === t.value} onChange={() => setFeeType(t.value)} className="mt-0.5 accent-[#4F46E5]" />
              <div>
                <p className="text-[12px] font-semibold text-dark">{t.label}</p>
                <p className="text-[10px] text-text3">{t.hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-text3 uppercase tracking-wider mb-1">
          {feeType === "percentage" ? "Percentage (%)" : "Amount (KSh)"}
        </label>
        <input
          type="number"
          min={0}
          step={feeType === "percentage" ? 0.5 : 50}
          value={amount}
          onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
          placeholder={feeType === "percentage" ? "e.g. 16" : "e.g. 2000"}
          className={inputCls}
        />
      </div>

      <div>
        <p className="text-[11px] font-semibold text-text3 uppercase tracking-wider mb-2">Behaviour</p>
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${applyByDefault ? "border-green-500 bg-green-50" : "border-border bg-white"}`}>
            <input type="radio" name="fee_behaviour" checked={applyByDefault} onChange={() => setApplyByDefault(true)} className="accent-green-600" />
            <div>
              <p className="text-[12px] font-semibold text-dark">Mandatory</p>
              <p className="text-[10px] text-text3">Always added</p>
            </div>
          </label>
          <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${!applyByDefault ? "border-amber-400 bg-amber-50" : "border-border bg-white"}`}>
            <input type="radio" name="fee_behaviour" checked={!applyByDefault} onChange={() => setApplyByDefault(false)} className="accent-amber-500" />
            <div>
              <p className="text-[12px] font-semibold text-dark">Optional upsell</p>
              <p className="text-[10px] text-text3">Offered at booking</p>
            </div>
          </label>
        </div>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className="h-[36px] px-4 bg-[#4F46E5] text-white text-[12px] font-semibold rounded-lg hover:bg-[#4338CA] disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Save changes" : "Add fee"}
        </button>
        <button type="button" onClick={onCancel} className="h-[36px] px-4 border border-border text-[12px] font-semibold text-text2 rounded-lg hover:bg-surface bg-white">
          Cancel
        </button>
      </div>
    </div>
  );
}
