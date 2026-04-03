"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface RoomPhoto {
  asset?: { _id: string; url: string };
  alt?: string;
}

interface RoomAvailabilityModalProps {
  roomName: string;
  roomKey: string;
  photo?: RoomPhoto;
  capacity: number;
  pricePerNight: number;
  listingSlug: string;
  onClose: () => void;
  onEnquire: (roomName: string) => void;
}

const today = () => new Date().toISOString().split("T")[0];

const fmt = (n: number) => `KSh ${n.toLocaleString()}`;

export function RoomAvailabilityModal({
  roomName,
  roomKey,
  photo,
  capacity,
  pricePerNight,
  listingSlug,
  onClose,
  onEnquire,
}: RoomAvailabilityModalProps) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ available: boolean; price: number } | null>(null);
  const [error, setError] = useState("");

  const nights = checkIn && checkOut && checkOut > checkIn
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const handleCheck = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    setChecking(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/properties/availability-by-slug?slug=${listingSlug}&check_in=${checkIn}&check_out=${checkOut}`
      );
      const data = await res.json();

      if (data.rooms) {
        // Find this room in results by key or name
        const roomData = data.rooms[roomKey] ?? Object.values(data.rooms as Record<string, { available: boolean; price: number }>).find(
          (_, i) => Object.keys(data.rooms)[i].toLowerCase().includes(roomName.toLowerCase())
        );
        setResult(roomData ?? { available: true, price: pricePerNight });
      } else {
        // No PMS — assume available with Sanity price
        setResult({ available: true, price: pricePerNight });
      }
    } catch {
      setError("Could not check. Please try again.");
    }
    setChecking(false);
  }, [checkIn, checkOut, listingSlug, roomKey, roomName, pricePerNight]);

  const displayPrice = result?.price ?? pricePerNight;
  const total = displayPrice * nights;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Room header */}
        <div className="relative h-[140px] bg-[#F4F1EC]">
          {photo?.asset?.url ? (
            <Image src={photo.asset.url} alt={roomName} fill className="object-cover" sizes="400px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[24px]">🛏</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 size-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <svg className="size-4 text-[#16130C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-display text-[18px] font-bold text-[#16130C]">{roomName}</h3>
            <p className="text-[12px] text-[#9C9485]">Sleeps {capacity} · {fmt(pricePerNight)} / night</p>
          </div>

          {/* Date picker */}
          <div className="grid grid-cols-2 border border-[#E2DDD5] rounded-xl overflow-hidden">
            <div className="p-3 border-r border-[#E2DDD5]">
              <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={today()}
                onChange={(e) => { setCheckIn(e.target.value); setResult(null); }}
                className="w-full text-[14px] text-[#16130C] bg-transparent outline-none"
              />
            </div>
            <div className="p-3">
              <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn || today()}
                onChange={(e) => { setCheckOut(e.target.value); setResult(null); }}
                className="w-full text-[14px] text-[#16130C] bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Check button / Results */}
          {!result ? (
            <button
              type="button"
              onClick={handleCheck}
              disabled={!checkIn || !checkOut || checkOut <= checkIn || checking}
              className={cn(
                "w-full py-3 rounded-[14px] text-[14px] font-bold transition-all",
                "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                "disabled:opacity-50 disabled:pointer-events-none"
              )}
            >
              {checking ? "Checking..." : "Check availability"}
            </button>
          ) : result.available ? (
            <div className="space-y-3">
              <div className="bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl p-3 text-center">
                <p className="text-[14px] font-bold text-[#16A34A]">Available!</p>
                <p className="text-[12px] text-[#9C9485] mt-0.5">
                  {fmt(displayPrice)} x {nights} night{nights !== 1 ? "s" : ""} = <span className="font-bold text-[#16130C]">{fmt(total)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); onEnquire(roomName); }}
                className={cn(
                  "w-full py-3 rounded-[14px] text-[14px] font-bold transition-all",
                  "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]"
                )}
              >
                Enquire for {roomName}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-[14px] font-bold text-red-700">Not available</p>
                <p className="text-[12px] text-red-600 mt-0.5">This room is booked for these dates.</p>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="w-full py-3 rounded-[14px] text-[14px] font-semibold border border-[#E2DDD5] text-[#5E5848] hover:bg-[#F4F1EC] transition-colors"
              >
                Try different dates
              </button>
            </div>
          )}

          {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}
        </div>
      </div>
    </div>
  );
}
