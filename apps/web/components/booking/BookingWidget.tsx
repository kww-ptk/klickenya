"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import PhoneInput from "@/components/ui/PhoneInput";

/* ── Helpers ───────────────────────────────── */

function isOptimizableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "cdn.sanity.io" || host.endsWith(".supabase.co") || host === "images.unsplash.com";
  } catch {
    return false;
  }
}

/* ── Types ─────────────────────────────────── */

interface WidgetRoom {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  bedType: string | null;
  sizeSqm: number | null;
  maxGuests: number;
  pricePerNight: number;
  sanityKey: string | null;
}

interface BookingWidgetProps {
  propertyName: string;
  propertyCity: string | null;
  listingSlug: string | null;
  bookingSlug: string;
  rentingType: string;
  entirePlacePrice: number | null;
  rooms: WidgetRoom[];
}

interface AvailResult {
  available: boolean;
  price: number;
  roomId: string;
}

const fmt = (n: number) => `KSh ${n.toLocaleString()}`;

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

/* ── Component ─────────────────────────────── */

export function BookingWidget({
  propertyName,
  propertyCity,
  listingSlug,
  bookingSlug,
  rentingType,
  entirePlacePrice,
  rooms,
}: BookingWidgetProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<(WidgetRoom & { available: boolean })[] | null>(null);
  const [entireAvail, setEntireAvail] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Enquiry
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const maxGuests = rooms.reduce((s, r) => s + r.maxGuests, 0);

  const checkAvailability = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setChecking(true);
    setError("");

    try {
      // Use listing_slug if available, otherwise use booking_slug
      const slugParam = listingSlug
        ? `slug=${listingSlug}`
        : `booking_slug=${bookingSlug}`;
      const res = await fetch(
        `/api/properties/availability-by-booking-slug?${slugParam}&check_in=${checkIn}&check_out=${checkOut}`
      );
      const data = await res.json();

      if (data.rooms) {
        const roomResults = rooms.map((room) => {
          const key = room.sanityKey ?? room.id;
          const avail = data.rooms[key] ?? data.rooms[room.name];
          return { ...room, available: avail?.available ?? true };
        });
        setResults(roomResults);
        setEntireAvail(data.entireProperty ?? false);
      } else {
        setResults(rooms.map((r) => ({ ...r, available: true })));
        setEntireAvail(true);
      }
    } catch {
      setError("Could not check availability. Please try again.");
    }
    setChecking(false);
  }, [checkIn, checkOut, listingSlug, bookingSlug, rooms]);

  const selectedPrice = selectedRoom === "__entire__"
    ? (entirePlacePrice ?? rooms.reduce((s, r) => s + r.pricePerNight, 0))
    : (results?.find((r) => r.id === selectedRoom)?.pricePerNight ?? 0);

  const handleEnquire = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setSending(true);
    setError("");
    try {
      const selectedRoomObj = results?.find((r) => r.id === selectedRoom);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_title: propertyName,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || null,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          room_preference: selectedRoomObj?.name ?? (selectedRoom === "__entire__" ? "Entire property" : null),
          source: "booking_widget",
        }),
      });
      if (res.ok) setSent(true);
      else setError("Failed to send. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-3">
          <svg className="size-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="font-display text-[20px] font-bold text-[#16130C] mb-1">Enquiry sent!</p>
        <p className="text-[14px] text-[#9C9485] mb-4">The host will get back to you within 24 hours.</p>
        <button onClick={() => { setSent(false); setResults(null); setSelectedRoom(null); }} className="text-[14px] font-semibold text-[#E8A020]">
          Check different dates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Date picker */}
      <div className="bg-white rounded-2xl border border-[#E2DDD5] p-5 shadow-sm">
        <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-3">Select your dates</h2>
        <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckInChange={setCheckIn} onCheckOutChange={setCheckOut} />

        <div className="border border-[#E2DDD5] rounded-xl p-3 flex items-center justify-between mt-3">
          <span className="text-[12px] font-semibold text-[#9C9485] uppercase tracking-wide">Guests</span>
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
            "w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-200 mt-4",
            "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
            "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
            "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {checking ? "Checking..." : "Check availability"}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-[16px] font-bold text-[#16130C]">
              {results.filter((r) => r.available).length > 0 ? "Available rooms" : "No availability"}
            </h2>
            <p className="text-[12px] text-[#9C9485]">{nights} night{nights !== 1 ? "s" : ""}</p>
          </div>

          <div className="space-y-2.5">
            {/* Entire property */}
            {entireAvail && rentingType !== "by_room" && rooms.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedRoom(selectedRoom === "__entire__" ? null : "__entire__")}
                className={cn(
                  "w-full text-left rounded-xl overflow-hidden transition-all",
                  selectedRoom === "__entire__" ? "ring-2 ring-[#E8A020] ring-offset-2" : "border border-[#E2DDD5] hover:shadow-md"
                )}
              >
                <div className="bg-gradient-to-br from-[#16130C] to-[#2A2520] p-4">
                  <p className="text-[14px] font-bold text-white">Entire property</p>
                  <p className="text-[11px] text-white/50">All {rooms.length} rooms</p>
                  <p className="text-[18px] font-bold text-[#E8A020] mt-1">{fmt(entirePlacePrice ?? rooms.reduce((s, r) => s + r.pricePerNight, 0))} <span className="text-[11px] text-white/40 font-normal">/ night</span></p>
                </div>
              </button>
            )}

            {/* Individual rooms */}
            {results.map((room) => (
              <button
                key={room.id}
                type="button"
                disabled={!room.available}
                onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)}
                className={cn(
                  "w-full text-left rounded-xl border overflow-hidden transition-all",
                  !room.available ? "opacity-40 grayscale cursor-not-allowed border-[#E2DDD5]"
                    : selectedRoom === room.id ? "ring-2 ring-[#E8A020] ring-offset-2 border-transparent" : "border-[#E2DDD5] hover:shadow-md"
                )}
              >
                <div className="flex">
                  <div className="relative w-[100px] h-[80px] shrink-0 bg-[#F4F1EC]">
                    {room.photos[0] ? (
                      <Image src={room.photos[0]} alt={room.name} fill className="object-cover" sizes="100px" unoptimized={!isOptimizableUrl(room.photos[0])} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[20px]">🛏</div>
                    )}
                    {!room.available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">Booked</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <p className="text-[13px] font-bold text-[#16130C] truncate">{room.name}</p>
                    <p className="text-[11px] text-[#9C9485]">
                      Sleeps {room.maxGuests}{room.bedType ? ` · ${room.bedType}` : ""}
                    </p>
                    <p className={cn("text-[15px] font-bold mt-1", room.available ? "text-[#E8A020]" : "text-[#9C9485]")}>
                      {fmt(room.pricePerNight)} <span className="text-[10px] text-[#9C9485] font-normal">/ night</span>
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* CTA */}
          {selectedRoom && (
            <div className="mt-4 pt-4 border-t border-[#E2DDD5]">
              <div className="flex justify-between text-[13px] mb-3">
                <span className="text-[#9C9485]">{fmt(selectedPrice)} x {nights} night{nights !== 1 ? "s" : ""}</span>
                <span className="text-[17px] font-bold text-[#16130C]">{fmt(selectedPrice * nights)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEnquiry(true)}
                className={cn(
                  "w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all",
                  "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                  "shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
                )}
              >
                Enquire now
              </button>
              <div className="flex items-center justify-center gap-2.5 text-[11px] text-[#9C9485] mt-2">
                <span>🔒 Secure</span>
                <span className="text-[#E2DDD5]">·</span>
                <span>No payment now</span>
                <span className="text-[#E2DDD5]">·</span>
                <span>Reply in 2hrs</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}

      {/* Enquiry modal */}
      {showEnquiry && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setShowEnquiry(false)} />
          <div className="relative w-full sm:max-w-[440px] max-h-[92vh] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[#E2DDD5] px-5 py-4 flex items-center justify-between z-10 shrink-0">
              <h2 className="font-display text-[18px] font-bold text-[#16130C]">Complete your enquiry</h2>
              <button onClick={() => setShowEnquiry(false)} className="size-8 flex items-center justify-center rounded-full bg-[#F4F1EC] hover:bg-[#E2DDD5]">
                <svg className="size-4 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-[#E8A020]/5 border border-[#E8A020]/20 rounded-xl p-3">
                <p className="text-[13px] font-bold text-[#16130C]">
                  {selectedRoom === "__entire__" ? "Entire property" : results?.find((r) => r.id === selectedRoom)?.name}
                </p>
                <p className="text-[11px] text-[#9C9485]">{nights} nights · {fmt(selectedPrice * nights)}</p>
              </div>
              <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-[#E8A020]" />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-[#E8A020]" />
              <PhoneInput value={phone} onChange={setPhone} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-[#E8A020]" />
              <textarea placeholder="Special requests (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] outline-none focus:border-[#E8A020] resize-none" />
              {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] px-5 py-4 shrink-0">
              <button type="button" onClick={handleEnquire} disabled={sending} className={cn("w-full py-3.5 rounded-2xl text-[15px] font-bold bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C] disabled:opacity-50")}>
                {sending ? "Sending..." : "Confirm & send enquiry"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
