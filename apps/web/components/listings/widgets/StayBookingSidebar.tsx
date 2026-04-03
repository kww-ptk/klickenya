"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ui/PhoneInput";

/* ── Types ─────────────────────────────────────── */

interface RoomPhoto {
  asset?: { _id: string; url: string };
  alt?: string;
}

interface SanityRoom {
  _key: string;
  roomName: string;
  pricePerNight: number;
  capacity: number;
  photos?: RoomPhoto[];
  bedType?: string;
  roomAmenities?: string[];
}

interface RoomResult {
  name: string;
  key: string;
  available: boolean;
  price: number;
  photo?: string;
  capacity: number;
  bedType?: string;
  amenities?: string[];
}

interface AvailabilityData {
  rooms: Record<string, { available: boolean; price: number }> | null;
  entireProperty: boolean | null;
}

interface StayBookingSidebarProps {
  listingSlug: string;
  listingTitle: string;
  listingId: string;
  price: number;
  priceUnit: string;
  maxGuests?: number;
  rooms?: SanityRoom[];
  onAvailabilityChecked?: (
    roomAvail: Record<string, boolean>,
    roomPrices: Record<string, number>,
    entireAvail: boolean
  ) => void;
}

const today = () => new Date().toISOString().split("T")[0];

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

const fmt = (n: number) => `KSh ${n.toLocaleString()}`;

/* ── Component ─────────────────────────────────── */

export function StayBookingSidebar({
  listingSlug,
  listingTitle,
  listingId,
  price,
  priceUnit,
  maxGuests = 10,
  rooms: sanityRooms,
  onAvailabilityChecked,
}: StayBookingSidebarProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  // Results modal state
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [entireAvail, setEntireAvail] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Enquiry state
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);

  const checkAvailability = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setChecking(true);
    setError("");

    try {
      const res = await fetch(
        `/api/properties/availability-by-slug?slug=${listingSlug}&check_in=${checkIn}&check_out=${checkOut}`
      );
      const data: AvailabilityData = await res.json();

      const roomResults: RoomResult[] = [];
      const availMap: Record<string, boolean> = {};
      const priceMap: Record<string, number> = {};

      if (data.rooms) {
        for (const [key, val] of Object.entries(data.rooms)) {
          const sanityRoom = sanityRooms?.find((r) => r._key === key);
          roomResults.push({
            key,
            name: sanityRoom?.roomName ?? key,
            available: val.available,
            price: val.price,
            photo: sanityRoom?.photos?.[0]?.asset?.url,
            capacity: sanityRoom?.capacity ?? 2,
            bedType: sanityRoom?.bedType,
            amenities: sanityRoom?.roomAmenities,
          });
          availMap[key] = val.available;
          priceMap[key] = val.price;
        }
        setEntireAvail(data.entireProperty ?? false);
        onAvailabilityChecked?.(availMap, priceMap, data.entireProperty ?? false);
      } else {
        // No PMS — show all from Sanity
        for (const r of sanityRooms ?? []) {
          roomResults.push({
            key: r._key,
            name: r.roomName,
            available: true,
            price: r.pricePerNight,
            photo: r.photos?.[0]?.asset?.url,
            capacity: r.capacity,
            bedType: r.bedType,
            amenities: r.roomAmenities,
          });
        }
        setEntireAvail(true);
      }

      setResults(roomResults);
      setShowResults(true);
    } catch {
      setError("Could not check availability. Please try again.");
    }
    setChecking(false);
  }, [checkIn, checkOut, listingSlug, sanityRooms, onAvailabilityChecked]);

  const handleEnquire = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setSending(true);
    setError("");

    try {
      const selectedRoomObj = results.find((r) => r.key === selectedRoom);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_sanity_id: listingId,
          listing_title: listingTitle,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || null,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          room_preference: selectedRoomObj?.name ?? (selectedRoom === "__entire__" ? "Entire property" : null),
        }),
      });
      if (res.ok) {
        setSent(true);
        setShowEnquiry(false);
        setShowResults(false);
      } else {
        setError("Failed to send. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSending(false);
  };

  const availableRooms = results.filter((r) => r.available);
  const totalEntirePrice = results.reduce((s, r) => s + r.price, 0);
  const selectedPrice = selectedRoom === "__entire__"
    ? totalEntirePrice
    : (results.find((r) => r.key === selectedRoom)?.price ?? 0);

  // Sent confirmation
  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-3">
          <svg className="size-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">Enquiry sent!</p>
        <p className="text-[13px] text-[#9C9485]">The host will reply within 24 hours.</p>
        <button onClick={() => { setSent(false); setSelectedRoom(null); }} className="mt-4 text-[13px] font-semibold text-[#E8A020]">
          Check different dates
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── Sidebar: dates + guests ── */}
      <div className="space-y-4">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-[#16130C]">
            {fmt(price)}
          </span>
          <span className="text-[14px] text-[#9C9485]">/ {priceUnit}</span>
        </div>

        <div className="grid grid-cols-2 border border-[#E2DDD5] rounded-[14px] overflow-hidden">
          <div className="p-3 border-r border-[#E2DDD5]">
            <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-in</label>
            <input type="date" value={checkIn} min={today()} onChange={(e) => setCheckIn(e.target.value)} className="w-full text-[14px] text-[#16130C] bg-transparent outline-none" />
          </div>
          <div className="p-3">
            <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-out</label>
            <input type="date" value={checkOut} min={checkIn || today()} onChange={(e) => setCheckOut(e.target.value)} className="w-full text-[14px] text-[#16130C] bg-transparent outline-none" />
          </div>
        </div>

        <div className="border border-[#E2DDD5] rounded-[14px] p-3 flex items-center justify-between">
          <label className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wide">Guests</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30" disabled={guests <= 1}>-</button>
            <span className="text-[14px] font-semibold text-[#16130C] w-4 text-center">{guests}</span>
            <button type="button" onClick={() => setGuests(Math.min(maxGuests, guests + 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30" disabled={guests >= maxGuests}>+</button>
          </div>
        </div>

        <button
          type="button"
          onClick={checkAvailability}
          disabled={!checkIn || !checkOut || checkOut <= checkIn || checking}
          className={cn(
            "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200",
            "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
            "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
            "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {checking ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </span>
          ) : "Check availability"}
        </button>

        {error && !showResults && <p className="text-[13px] text-red-600 text-center">{error}</p>}
        <p className="text-[12px] text-[#9C9485] text-center">You won&apos;t be charged yet</p>
      </div>

      {/* ── Results modal — full-screen on mobile ── */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowResults(false); setSelectedRoom(null); }} />

          <div className="relative w-full sm:max-w-[520px] max-h-[90vh] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[#E2DDD5] px-5 py-4 flex items-center justify-between z-10 shrink-0">
              <div>
                <h2 className="font-display text-[18px] font-bold text-[#16130C]">Available rooms</h2>
                <p className="text-[12px] text-[#9C9485]">
                  {new Date(checkIn + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {" \u2192 "}
                  {new Date(checkOut + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {" \u00B7 "}{nights} night{nights !== 1 ? "s" : ""}
                  {" \u00B7 "}{guests} guest{guests !== 1 ? "s" : ""}
                </p>
              </div>
              <button onClick={() => { setShowResults(false); setSelectedRoom(null); }} className="size-8 flex items-center justify-center rounded-full hover:bg-[#F4F1EC]">
                <svg className="size-5 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable room list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {availableRooms.length === 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                  <p className="text-[15px] font-semibold text-red-700 mb-1">No rooms available</p>
                  <p className="text-[13px] text-red-600">All rooms are booked for these dates.</p>
                </div>
              ) : (
                <>
                  {/* Entire property option */}
                  {entireAvail && results.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(selectedRoom === "__entire__" ? null : "__entire__")}
                      className={cn(
                        "w-full text-left rounded-xl border-2 overflow-hidden transition-all",
                        selectedRoom === "__entire__"
                          ? "border-[#E8A020] ring-2 ring-[#E8A020]/20"
                          : "border-[#E2DDD5] hover:border-[#9C9485]"
                      )}
                    >
                      <div className="bg-gradient-to-r from-[#16130C] to-[#2A2520] p-4">
                        <p className="text-[15px] font-bold text-white">Entire property</p>
                        <p className="text-[12px] text-white/60">All {results.length} rooms \u00B7 Private exclusive use</p>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-[20px] font-bold text-[#E8A020]">{fmt(totalEntirePrice)}</span>
                          <span className="text-[12px] text-white/50">/ night</span>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Individual rooms */}
                  {results.map((room) => (
                    <button
                      key={room.key}
                      type="button"
                      disabled={!room.available}
                      onClick={() => setSelectedRoom(selectedRoom === room.key ? null : room.key)}
                      className={cn(
                        "w-full text-left rounded-xl border-2 overflow-hidden transition-all",
                        !room.available
                          ? "border-[#E2DDD5] opacity-50 cursor-not-allowed"
                          : selectedRoom === room.key
                            ? "border-[#E8A020] ring-2 ring-[#E8A020]/20"
                            : "border-[#E2DDD5] hover:border-[#9C9485]"
                      )}
                    >
                      <div className="flex">
                        {/* Room photo */}
                        <div className="relative w-[100px] sm:w-[130px] shrink-0 bg-[#F4F1EC]">
                          {room.photo ? (
                            <Image src={room.photo} alt={room.name} fill className="object-cover" sizes="130px" />
                          ) : (
                            <div className="w-full h-full min-h-[90px] flex items-center justify-center text-[24px]">🛏</div>
                          )}
                          {!room.available && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-[11px] font-bold">Booked</span>
                            </div>
                          )}
                        </div>

                        {/* Room info */}
                        <div className="flex-1 p-3 min-w-0">
                          <p className="text-[14px] font-semibold text-[#16130C] truncate">{room.name}</p>
                          <p className="text-[11px] text-[#9C9485] mt-0.5">
                            Sleeps {room.capacity}
                            {room.bedType ? ` \u00B7 ${room.bedType}` : ""}
                          </p>
                          {room.amenities && room.amenities.length > 0 && (
                            <p className="text-[10px] text-[#9C9485] mt-1 truncate">
                              {room.amenities.slice(0, 3).join(" \u00B7 ")}
                            </p>
                          )}
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className={cn("text-[16px] font-bold", room.available ? "text-[#E8A020]" : "text-[#9C9485]")}>{fmt(room.price)}</span>
                            <span className="text-[11px] text-[#9C9485]">/ night</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* Footer — price breakdown + CTA */}
            {selectedRoom && (
              <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] px-5 py-4 shrink-0 space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">{fmt(selectedPrice)} x {nights} night{nights !== 1 ? "s" : ""}</span>
                  <span className="font-bold text-[#16130C]">{fmt(selectedPrice * nights)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowResults(false); setShowEnquiry(true); }}
                  className={cn(
                    "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all",
                    "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                    "shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
                  )}
                >
                  Enquire now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Enquiry modal ── */}
      {showEnquiry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEnquiry(false)} />

          <div className="relative w-full sm:max-w-[440px] max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[#E2DDD5] px-5 py-4 flex items-center justify-between z-10 shrink-0">
              <h2 className="font-display text-[18px] font-bold text-[#16130C]">Send enquiry</h2>
              <button onClick={() => setShowEnquiry(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-[#F4F1EC]">
                <svg className="size-5 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Selection summary */}
              <div className="bg-[#E8A020]/5 border border-[#E8A020]/20 rounded-xl p-3">
                <p className="text-[13px] font-semibold text-[#E8A020]">
                  {selectedRoom === "__entire__" ? "Entire property" : results.find((r) => r.key === selectedRoom)?.name}
                </p>
                <p className="text-[11px] text-[#9C9485]">
                  {new Date(checkIn + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {" \u2192 "}
                  {new Date(checkOut + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {" \u00B7 "}{nights} night{nights !== 1 ? "s" : ""}
                  {" \u00B7 "}{fmt(selectedPrice * nights)} total
                </p>
              </div>

              <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020]" required />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020]" required />
              <PhoneInput value={phone} onChange={setPhone} required className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020]" />
              <textarea placeholder="Special requests (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] resize-none" />

              {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] px-5 py-4 shrink-0 space-y-2">
              <button
                type="button"
                onClick={handleEnquire}
                disabled={sending}
                className={cn(
                  "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all",
                  "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                  "disabled:opacity-50"
                )}
              >
                {sending ? "Sending..." : "Send enquiry"}
              </button>
              <div className="flex items-center justify-center gap-3 text-[12px] text-[#9C9485]">
                <span>&#128274; Secure</span>
                <span className="text-[#E2DDD5]">&#183;</span>
                <span>Reply within 2hrs</span>
                <span className="text-[#E2DDD5]">&#183;</span>
                <span>&#10003; Free</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
