"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ui/PhoneInput";

/* ── Types ─────────────────────────────────────── */

interface RoomResult {
  name: string;
  key: string;
  available: boolean;
  price: number;
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
  rooms?: { _key: string; roomName: string; pricePerNight: number; capacity: number }[];
  onAvailabilityChecked?: (
    roomAvail: Record<string, boolean>,
    roomPrices: Record<string, number>,
    entireAvail: boolean
  ) => void;
}

type Step = "dates" | "results" | "enquiry";

const today = () => new Date().toISOString().split("T")[0];

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

const fmt = (n: number) =>
  `KSh ${n.toLocaleString()}`;

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
  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [entireAvail, setEntireAvail] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  // Enquiry form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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

      if (data.rooms) {
        const roomResults: RoomResult[] = [];
        const availMap: Record<string, boolean> = {};
        const priceMap: Record<string, number> = {};

        // Match results to Sanity rooms for display names
        for (const [key, val] of Object.entries(data.rooms)) {
          const sanityRoom = sanityRooms?.find((r) => r._key === key);
          roomResults.push({
            key,
            name: sanityRoom?.roomName ?? key,
            available: val.available,
            price: val.price,
          });
          availMap[key] = val.available;
          priceMap[key] = val.price;
        }

        setResults(roomResults);
        setEntireAvail(data.entireProperty ?? false);
        setStep("results");

        // Notify parent to update room cards
        onAvailabilityChecked?.(availMap, priceMap, data.entireProperty ?? false);
      } else {
        // No PMS linked — show all as available (Sanity fallback)
        setResults(
          (sanityRooms ?? []).map((r) => ({
            key: r._key,
            name: r.roomName,
            available: true,
            price: r.pricePerNight,
          }))
        );
        setEntireAvail(true);
        setStep("results");
      }
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

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-3">
          <svg className="size-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">Enquiry sent!</p>
        <p className="text-[13px] text-[#9C9485]">
          The host will reply within 24 hours.
        </p>
        <button
          onClick={() => { setSent(false); setStep("dates"); setSelectedRoom(null); }}
          className="mt-4 text-[13px] font-semibold text-[#E8A020] hover:text-[#d4911c]"
        >
          Check different dates
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── STEP 1: Dates + Guests ── */}
      {step === "dates" && (
        <>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-[#16130C]">
              {fmt(price)}
            </span>
            <span className="text-[14px] text-[#9C9485]">/ {priceUnit}</span>
          </div>

          <div className="grid grid-cols-2 border border-[#E2DDD5] rounded-[14px] overflow-hidden">
            <div className="p-3 border-r border-[#E2DDD5]">
              <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={today()}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full text-[14px] text-[#16130C] bg-transparent outline-none"
              />
            </div>
            <div className="p-3">
              <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today()}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full text-[14px] text-[#16130C] bg-transparent outline-none"
              />
            </div>
          </div>

          <div className="border border-[#E2DDD5] rounded-[14px] p-3 flex items-center justify-between">
            <label className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wide">Guests</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] transition-colors disabled:opacity-30" disabled={guests <= 1}>-</button>
              <span className="text-[14px] font-semibold text-[#16130C] w-4 text-center">{guests}</span>
              <button type="button" onClick={() => setGuests(Math.min(maxGuests, guests + 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] transition-colors disabled:opacity-30" disabled={guests >= maxGuests}>+</button>
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
            ) : (
              "Check availability"
            )}
          </button>

          {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}

          <p className="text-[12px] text-[#9C9485] text-center">You won&apos;t be charged yet</p>
        </>
      )}

      {/* ── STEP 2: Results ── */}
      {step === "results" && (
        <>
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-[13px] font-semibold text-[#16130C]">
                {new Date(checkIn + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {" → "}
                {new Date(checkOut + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
              <p className="text-[11px] text-[#9C9485]">{nights} night{nights !== 1 ? "s" : ""} · {guests} guest{guests !== 1 ? "s" : ""}</p>
            </div>
            <button
              onClick={() => { setStep("dates"); setSelectedRoom(null); }}
              className="text-[11px] font-semibold text-[#E8A020] hover:text-[#d4911c]"
            >
              Change dates
            </button>
          </div>

          {availableRooms.length === 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-[14px] font-semibold text-red-700 mb-1">No availability</p>
              <p className="text-[12px] text-red-600">No rooms are available for these dates. Try different dates.</p>
              <button onClick={() => setStep("dates")} className="mt-3 text-[13px] font-semibold text-[#E8A020]">
                Try different dates
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Entire property option */}
              {entireAvail && results.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedRoom("__entire__")}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-all",
                    selectedRoom === "__entire__"
                      ? "border-[#E8A020] bg-[#E8A020]/5"
                      : "border-[#E2DDD5] hover:border-[#9C9485]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C]">Entire property</p>
                      <p className="text-[11px] text-[#9C9485]">All {results.length} rooms · Private</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-[#E8A020]">{fmt(totalEntirePrice)}</p>
                      <p className="text-[10px] text-[#9C9485]">/ night</p>
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
                  onClick={() => setSelectedRoom(room.key)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-all",
                    !room.available
                      ? "border-[#E2DDD5] bg-[#F4F1EC]/50 opacity-50 cursor-not-allowed"
                      : selectedRoom === room.key
                        ? "border-[#E8A020] bg-[#E8A020]/5"
                        : "border-[#E2DDD5] hover:border-[#9C9485]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C]">{room.name}</p>
                      {!room.available && (
                        <p className="text-[10px] font-bold text-red-500">Booked</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={cn("text-[14px] font-bold", room.available ? "text-[#E8A020]" : "text-[#9C9485]")}>{fmt(room.price)}</p>
                      <p className="text-[10px] text-[#9C9485]">/ night</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Price breakdown */}
          {selectedRoom && (
            <div className="border-t border-[#E2DDD5] pt-3 space-y-1.5">
              {(() => {
                const roomPrice = selectedRoom === "__entire__"
                  ? totalEntirePrice
                  : (results.find((r) => r.key === selectedRoom)?.price ?? 0);
                const total = roomPrice * nights;
                return (
                  <>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[#9C9485]">{fmt(roomPrice)} x {nights} night{nights !== 1 ? "s" : ""}</span>
                      <span className="font-semibold text-[#16130C]">{fmt(total)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] font-bold pt-1.5 border-t border-[#E2DDD5]">
                      <span className="text-[#16130C]">Total</span>
                      <span className="text-[#16130C]">{fmt(total)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {selectedRoom && (
            <button
              type="button"
              onClick={() => setStep("enquiry")}
              className={cn(
                "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200",
                "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
                "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5"
              )}
            >
              Enquire now
            </button>
          )}
        </>
      )}

      {/* ── STEP 3: Enquiry form ── */}
      {step === "enquiry" && (
        <>
          <button onClick={() => setStep("results")} className="text-[12px] text-[#9C9485] hover:text-[#16130C] transition-colors">
            ← Back to results
          </button>

          <div className="bg-[#E8A020]/5 border border-[#E8A020]/20 rounded-xl p-3 mb-1">
            <p className="text-[12px] font-semibold text-[#E8A020]">
              {selectedRoom === "__entire__" ? "Entire property" : results.find((r) => r.key === selectedRoom)?.name}
            </p>
            <p className="text-[11px] text-[#9C9485]">
              {new Date(checkIn + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {" → "}
              {new Date(checkOut + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {" · "}{nights} night{nights !== 1 ? "s" : ""} · {guests} guest{guests !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-3">
            <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors" required />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors" required />
            <PhoneInput value={phone} onChange={setPhone} required className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors" />
            <textarea placeholder="Special requests (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors resize-none" />
          </div>

          {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleEnquire}
            disabled={sending}
            className={cn(
              "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200",
              "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
              "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
              "disabled:opacity-50 disabled:pointer-events-none"
            )}
          >
            {sending ? "Sending..." : "Send enquiry"}
          </button>

          <div className="flex items-center justify-center gap-3 text-[12px] text-[#9C9485]">
            <span>&#128274; Secure</span>
            <span className="text-[#E2DDD5]">&#183;</span>
            <span>&#128241; Reply within 2hrs</span>
            <span className="text-[#E2DDD5]">&#183;</span>
            <span>&#10003; Free</span>
          </div>
        </>
      )}
    </div>
  );
}
