"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Check } from "lucide-react";
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
  bedType?: string;
  amenities?: string[];
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
  bedType,
  amenities,
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
        const roomData = data.rooms[roomKey] ?? null;
        setResult(roomData ?? { available: true, price: pricePerNight });
      } else {
        setResult({ available: true, price: pricePerNight });
      }
    } catch {
      setError("Could not check. Please try again.");
    }
    setChecking(false);
  }, [checkIn, checkOut, listingSlug, roomKey, pricePerNight]);

  const displayPrice = result?.price ?? pricePerNight;
  const total = displayPrice * nights;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-[440px] max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Room photo header */}
        <div className="relative h-[180px] sm:h-[200px] bg-[#F4F1EC] shrink-0">
          {photo?.asset?.url ? (
            <Image src={photo.asset.url} alt={roomName} fill className="object-cover" sizes="(max-width: 640px) 100vw, 440px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[32px]">🛏</div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 size-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm">
            <svg className="size-4 text-[#16130C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Price badge */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-[16px] font-bold text-[#E8A020]">{fmt(pricePerNight)}</span>
            <span className="text-[11px] text-[#9C9485]"> / night</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <h3 className="font-display text-[20px] font-bold text-[#16130C]">{roomName}</h3>
            <p className="text-[13px] text-[#9C9485] mt-0.5">
              Sleeps {capacity}{bedType ? ` · ${bedType} bed` : ""}
            </p>
          </div>

          {/* Amenities */}
          {amenities && amenities.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 text-[12px] text-[#5E5848]">
                  <Check className="size-3 text-[#E8A020] shrink-0" strokeWidth={3} />
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Date picker */}
          <div>
            <p className="text-[13px] font-semibold text-[#16130C] mb-2">Select your dates</p>
            <div className="grid grid-cols-2 border border-[#E2DDD5] rounded-xl overflow-hidden">
              <div className="p-3 border-r border-[#E2DDD5]">
                <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-in</label>
                <input type="date" value={checkIn} min={today()} onChange={(e) => { setCheckIn(e.target.value); setResult(null); }} className="w-full text-[14px] text-[#16130C] bg-transparent outline-none" />
              </div>
              <div className="p-3">
                <label className="block text-[10px] font-bold text-[#9C9485] uppercase tracking-wide mb-0.5">Check-out</label>
                <input type="date" value={checkOut} min={checkIn || today()} onChange={(e) => { setCheckOut(e.target.value); setResult(null); }} className="w-full text-[14px] text-[#16130C] bg-transparent outline-none" />
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            result.available ? (
              <div className="bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-2">
                  <svg className="size-5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-[15px] font-bold text-[#16A34A]">Available!</p>
                <p className="text-[13px] text-[#9C9485] mt-1">
                  {fmt(displayPrice)} x {nights} night{nights !== 1 ? "s" : ""}
                </p>
                <p className="text-[18px] font-bold text-[#16130C] mt-1">{fmt(total)}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-[15px] font-bold text-red-700">Not available</p>
                <p className="text-[13px] text-red-600 mt-1">This room is booked for these dates.</p>
              </div>
            )
          )}

          {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}
        </div>

        {/* Footer CTA */}
        <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] px-5 py-4 shrink-0">
          {!result ? (
            <button
              type="button"
              onClick={handleCheck}
              disabled={!checkIn || !checkOut || checkOut <= checkIn || checking}
              className={cn(
                "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all",
                "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
                "disabled:opacity-50 disabled:pointer-events-none"
              )}
            >
              {checking ? "Checking..." : "Check availability"}
            </button>
          ) : result.available ? (
            <button
              type="button"
              onClick={() => { onClose(); onEnquire(roomName); }}
              className={cn(
                "w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all",
                "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                "shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
              )}
            >
              Enquire for {roomName}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setResult(null)}
              className="w-full py-3.5 rounded-[18px] text-[15px] font-semibold border border-[#E2DDD5] text-[#5E5848] hover:bg-[#F4F1EC] transition-colors"
            >
              Try different dates
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
