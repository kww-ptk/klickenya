"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ui/PhoneInput";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

/* ── Helpers ───────────────────────────────────── */

function isOptimizableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "cdn.sanity.io" || host.endsWith(".supabase.co") || host === "images.unsplash.com";
  } catch {
    return false;
  }
}

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
  photos?: string[];
  capacity: number;
  bedType?: string;
  amenities?: string[];
  description?: string;
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
  avgRating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  recentBookings?: number;
  onAvailabilityChecked?: (
    roomAvail: Record<string, boolean>,
    roomPrices: Record<string, number>,
    entireAvail: boolean
  ) => void;
  /** When set, auto-opens the modal with this room pre-selected after checking availability */
  openForRoom?: string | null;
  onOpenForRoomHandled?: () => void;
}

function nightsBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

const fmt = (n: number) => `KSh ${n.toLocaleString()}`;

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/* ── Main Component ─────────────────────────── */

export function StayBookingSidebar({
  listingSlug,
  listingTitle,
  listingId,
  price,
  priceUnit,
  maxGuests = 10,
  rooms: sanityRooms,
  avgRating,
  reviewCount,
  isVerified,
  recentBookings,
  onAvailabilityChecked,
  openForRoom,
  onOpenForRoomHandled,
}: StayBookingSidebarProps) {
  // Dates
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Availability
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [entireAvail, setEntireAvail] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Room selection
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [previewRoom, setPreviewRoom] = useState<RoomResult | null>(null);

  // Modal step: dates → rooms → enquiry
  const [step, setStep] = useState<"dates" | "rooms" | "enquiry">("dates");
  // Room pre-selected from room card click (before dates are entered)
  const [pendingRoomKey, setPendingRoomKey] = useState<string | null>(null);
  // Modal-local date/guest state (synced from sidebar when opening, or edited in modal step 1)
  const [modalCheckIn, setModalCheckIn] = useState("");
  const [modalCheckOut, setModalCheckOut] = useState("");
  const [modalGuests, setModalGuests] = useState(1);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const nights = nightsBetween(checkIn, checkOut);
  const availableRooms = results.filter((r) => r.available);
  const totalEntirePrice = results.reduce((s, r) => s + r.price, 0);
  const selectedPrice = selectedRoom === "__entire__"
    ? totalEntirePrice
    : (results.find((r) => r.key === selectedRoom)?.price ?? 0);

  // Handle room card click → open modal at step 1 (dates) with room pre-selected
  useEffect(() => {
    if (!openForRoom) return;
    onOpenForRoomHandled?.();

    // Pre-select the room for after availability check
    setPendingRoomKey(openForRoom);
    setSelectedRoom(openForRoom);

    // Build preview from Sanity room data
    const room = sanityRooms?.find((r) => r._key === openForRoom);
    if (room) {
      const allPhotos = (room.photos ?? []).map((p) => p.asset?.url).filter(Boolean) as string[];
      setPreviewRoom({
        key: room._key,
        name: room.roomName,
        available: true,
        price: room.pricePerNight,
        photo: allPhotos[0],
        photos: allPhotos,
        capacity: room.capacity,
        bedType: room.bedType,
        amenities: room.roomAmenities,
      });
    }

    // Sync any existing sidebar dates into modal
    setModalCheckIn(checkIn);
    setModalCheckOut(checkOut);
    setModalGuests(guests);

    // Open modal at dates step so user can pick dates
    setStep("dates");
    setShowModal(true);
  }, [openForRoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check availability
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
          const sr = sanityRooms?.find((r) => r._key === key);
          const allPhotos = (sr?.photos ?? []).map((p) => p.asset?.url).filter(Boolean) as string[];
          roomResults.push({
            key,
            name: sr?.roomName ?? key,
            available: val.available,
            price: val.price,
            photo: allPhotos[0],
            photos: allPhotos,
            capacity: sr?.capacity ?? 2,
            bedType: sr?.bedType,
            amenities: sr?.roomAmenities,
          });
          availMap[key] = val.available;
          priceMap[key] = val.price;
        }
        setEntireAvail(data.entireProperty ?? false);
        onAvailabilityChecked?.(availMap, priceMap, data.entireProperty ?? false);
      } else {
        for (const r of sanityRooms ?? []) {
          const allPhotos = (r.photos ?? []).map((p) => p.asset?.url).filter(Boolean) as string[];
          roomResults.push({
            key: r._key,
            name: r.roomName,
            available: true,
            price: r.pricePerNight,
            photo: allPhotos[0],
            photos: allPhotos,
            capacity: r.capacity,
            bedType: r.bedType,
            amenities: r.roomAmenities,
          });
        }
        setEntireAvail(true);
      }

      setResults(roomResults);

      // If a room was pre-selected (from room card click), keep it selected
      const preKey = pendingRoomKey ?? selectedRoom;
      if (preKey && roomResults.find((r) => r.key === preKey)) {
        const match = roomResults.find((r) => r.key === preKey)!;
        setSelectedRoom(preKey);
        setPreviewRoom(match);
      } else {
        setSelectedRoom(null);
        setPreviewRoom(null);
      }
      setPendingRoomKey(null);
      setStep("rooms");
      setShowModal(true);
    } catch {
      setError("Could not check availability. Please try again.");
    }
    setChecking(false);
  }, [checkIn, checkOut, listingSlug, sanityRooms, onAvailabilityChecked]);

  // Check availability from modal step 1 (dates step)
  const handleModalCheckAvailability = useCallback(async () => {
    if (!modalCheckIn || !modalCheckOut || modalCheckOut <= modalCheckIn) return;
    // Sync modal dates back to sidebar state
    setCheckIn(modalCheckIn);
    setCheckOut(modalCheckOut);
    setGuests(modalGuests);

    setChecking(true);
    setError("");

    try {
      const res = await fetch(
        `/api/properties/availability-by-slug?slug=${listingSlug}&check_in=${modalCheckIn}&check_out=${modalCheckOut}`
      );
      const data: AvailabilityData = await res.json();

      const roomResults: RoomResult[] = [];
      const availMap: Record<string, boolean> = {};
      const priceMap: Record<string, number> = {};

      if (data.rooms) {
        for (const [key, val] of Object.entries(data.rooms)) {
          const sr = sanityRooms?.find((r) => r._key === key);
          const allPhotos = (sr?.photos ?? []).map((p) => p.asset?.url).filter(Boolean) as string[];
          roomResults.push({
            key,
            name: sr?.roomName ?? key,
            available: val.available,
            price: val.price,
            photo: allPhotos[0],
            photos: allPhotos,
            capacity: sr?.capacity ?? 2,
            bedType: sr?.bedType,
            amenities: sr?.roomAmenities,
          });
          availMap[key] = val.available;
          priceMap[key] = val.price;
        }
        setEntireAvail(data.entireProperty ?? false);
        onAvailabilityChecked?.(availMap, priceMap, data.entireProperty ?? false);
      } else {
        for (const r of sanityRooms ?? []) {
          const allPhotos = (r.photos ?? []).map((p) => p.asset?.url).filter(Boolean) as string[];
          roomResults.push({
            key: r._key,
            name: r.roomName,
            available: true,
            price: r.pricePerNight,
            photo: allPhotos[0],
            photos: allPhotos,
            capacity: r.capacity,
            bedType: r.bedType,
            amenities: r.roomAmenities,
          });
        }
        setEntireAvail(true);
      }

      setResults(roomResults);

      // If a room was pre-selected (from room card click), keep it selected
      const preKey = pendingRoomKey ?? selectedRoom;
      if (preKey && roomResults.find((r) => r.key === preKey)) {
        const match = roomResults.find((r) => r.key === preKey)!;
        setSelectedRoom(preKey);
        setPreviewRoom(match);
      } else {
        setSelectedRoom(null);
        setPreviewRoom(null);
      }
      setPendingRoomKey(null);
      setStep("rooms");
    } catch {
      setError("Could not check availability. Please try again.");
    }
    setChecking(false);
  }, [modalCheckIn, modalCheckOut, listingSlug, sanityRooms, onAvailabilityChecked, pendingRoomKey, selectedRoom]);

  // Send enquiry
  const handleEnquire = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPhone.trim()) {
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
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          message: formMessage.trim() || null,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          room_preference: selectedRoomObj?.name ?? (selectedRoom === "__entire__" ? "Entire property" : null),
        }),
      });
      if (res.ok) {
        setSent(true);
        setShowModal(false);
      } else setError("Failed to send. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    }
    setSending(false);
  };

  // Sent state
  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-3">
          <svg className="size-7 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        </div>
        <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">Enquiry sent!</p>
        <p className="text-[13px] text-[#9C9485]">The host will reply within 24 hours.</p>
        <button onClick={() => { setSent(false); setSelectedRoom(null); setResults([]); }} className="mt-4 text-[13px] font-semibold text-[#E8A020]">Check different dates</button>
      </div>
    );
  }

  return (
    <>
      {/* ── Sidebar ── */}
      <div id="stay-booking-sidebar" className="space-y-4">
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-[#16130C]">{fmt(price)}</span>
          <span className="text-[14px] text-[#9C9485]">/ {priceUnit}</span>
        </div>

        {/* Date fields — click to expand calendar inline */}
        <button type="button" onClick={() => setShowDatePicker(!showDatePicker)} className={cn("w-full grid grid-cols-2 border rounded-[14px] overflow-hidden text-left transition-colors", showDatePicker ? "border-[#E8A020]" : "border-[#E2DDD5] hover:border-[#9C9485]")}>
          <div className="p-3 border-r border-[#E2DDD5]">
            <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wide">Check-in</p>
            <p className={cn("text-[14px] font-semibold", checkIn ? "text-[#16130C]" : "text-[#9C9485]")}>
              {checkIn ? fmtDate(checkIn) : "Add date"}
            </p>
          </div>
          <div className="p-3">
            <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wide">Check-out</p>
            <p className={cn("text-[14px] font-semibold", checkOut ? "text-[#16130C]" : "text-[#9C9485]")}>
              {checkOut ? fmtDate(checkOut) : "Add date"}
            </p>
          </div>
        </button>

        {/* Inline calendar — expands below dates */}
        {showDatePicker && (
          <div className="border border-[#E2DDD5] rounded-[14px] p-3 bg-[#FAFAF8]">
            <DateRangePicker
              checkIn={checkIn}
              checkOut={checkOut}
              onCheckInChange={setCheckIn}
              onCheckOutChange={(d) => {
                setCheckOut(d);
                if (d && checkIn) setTimeout(() => setShowDatePicker(false), 250);
              }}
            />
          </div>
        )}

        {/* Guests */}
        <div className="border border-[#E2DDD5] rounded-[14px] p-3 flex items-center justify-between">
          <label className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wide">Guests</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setGuests(Math.max(1, guests - 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30" disabled={guests <= 1}>-</button>
            <span className="text-[14px] font-semibold text-[#16130C] w-4 text-center">{guests}</span>
            <button type="button" onClick={() => setGuests(Math.min(maxGuests, guests + 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30" disabled={guests >= maxGuests}>+</button>
          </div>
        </div>

        <button type="button" onClick={() => { setModalCheckIn(checkIn); setModalCheckOut(checkOut); setModalGuests(guests); checkAvailability(); }} disabled={!checkIn || !checkOut || checkOut <= checkIn || checking} className={cn("w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200", "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]", "shadow-[0_4px_14px_rgba(232,160,32,0.35)]", "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5", "disabled:opacity-50 disabled:pointer-events-none")}>
          {checking ? "Checking..." : "Check availability"}
        </button>

        {error && !showModal && <p className="text-[13px] text-red-600 text-center">{error}</p>}
        <p className="text-[12px] text-[#9C9485] text-center">You won&apos;t be charged yet</p>
      </div>

      {/* ── Main booking modal — two-column on desktop ── */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => { setShowModal(false); setStep("dates"); }} />

          <div className="relative w-full lg:max-w-[900px] max-h-[94vh] lg:max-h-[88vh] bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">

            {/* ── LEFT: Room preview (desktop only) — hide on dates step ── */}
            <div className={cn("hidden lg:flex lg:w-[400px] bg-[#F4F1EC] flex-col shrink-0 overflow-hidden", step === "dates" && "lg:hidden")}>
              {previewRoom ? (
                <>
                  {/* Room gallery */}
                  <div className="relative h-[260px] bg-[#E2DDD5]">
                    {previewRoom.photo ? (
                      <Image src={previewRoom.photo} alt={previewRoom.name} fill className="object-cover" sizes="400px" unoptimized={!isOptimizableUrl(previewRoom.photo)} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[48px]">🛏</div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-5">
                    <h3 className="font-display text-[20px] font-bold text-[#16130C] mb-1">{previewRoom.name}</h3>
                    <p className="text-[13px] text-[#9C9485] mb-3">
                      Sleeps {previewRoom.capacity}{previewRoom.bedType ? ` · ${previewRoom.bedType} bed` : ""}
                    </p>
                    {previewRoom.amenities && previewRoom.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {previewRoom.amenities.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1 text-[12px] text-[#5E5848] bg-white rounded-full px-2.5 py-1">
                            <svg className="size-3 text-[#E8A020]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Photo gallery */}
                    {previewRoom.photos && previewRoom.photos.length > 1 && (
                      <div className="grid grid-cols-2 gap-2">
                        {previewRoom.photos.slice(1, 5).map((url, i) => (
                          <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-[#E2DDD5]">
                            <Image src={url} alt="" fill className="object-cover" sizes="180px" unoptimized={!isOptimizableUrl(url)} />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-[22px] font-bold text-[#E8A020]">{fmt(previewRoom.price)}</span>
                      <span className="text-[13px] text-[#9C9485]">/ night</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <span className="text-[48px] mb-3">🏨</span>
                  <p className="text-[15px] font-semibold text-[#16130C] mb-1">{listingTitle}</p>
                  <p className="text-[13px] text-[#9C9485]">Select a room to see details</p>
                </div>
              )}
            </div>

            {/* ── RIGHT: Booking flow ── */}
            <div className="flex-1 flex flex-col min-w-0 max-h-[94vh] lg:max-h-[88vh]">
              {/* Mobile drag handle */}
              <div className="lg:hidden flex justify-center pt-2"><div className="w-10 h-1 rounded-full bg-[#E2DDD5]" /></div>

              {/* Header with steps */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-[#E2DDD5] px-5 pt-3 pb-3 z-10 shrink-0">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="font-display text-[17px] font-bold text-[#16130C]">
                    {step === "dates" ? "Select dates" : step === "rooms" ? "Choose your room" : "Confirm details"}
                  </h2>
                  <button onClick={() => { setShowModal(false); setStep("dates"); }} className="size-8 flex items-center justify-center rounded-full bg-[#F4F1EC] hover:bg-[#E2DDD5]">
                    <svg className="size-4 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Clickable progress steps */}
                <div className="flex items-center gap-1.5">
                  {/* Step 1: Dates */}
                  <button type="button" onClick={() => setStep("dates")} className="flex items-center gap-1 group">
                    <span className={cn("size-5 rounded-full flex items-center justify-center transition-colors", step === "dates" ? "bg-[#E8A020]" : "bg-[#16A34A] group-hover:bg-[#15803D]")}>
                      {step === "dates" ? (
                        <span className="text-[10px] font-bold text-white">1</span>
                      ) : (
                        <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      )}
                    </span>
                    <span className={cn("text-[10px] font-semibold transition-colors", step === "dates" ? "text-[#E8A020]" : "text-[#16A34A] group-hover:underline")}>Dates</span>
                  </button>

                  <div className={cn("flex-1 h-0.5 rounded-full", step !== "dates" ? "bg-[#16A34A]" : "bg-[#E2DDD5]")} />

                  {/* Step 2: Room */}
                  <button type="button" onClick={() => { if (step === "enquiry") setStep("rooms"); }} disabled={step === "dates"} className="flex items-center gap-1 group disabled:cursor-default">
                    <span className={cn("size-5 rounded-full flex items-center justify-center transition-colors",
                      step === "dates" ? "bg-[#E2DDD5]" :
                      step === "rooms" ? (selectedRoom ? "bg-[#E8A020]" : "bg-[#E8A020]") :
                      "bg-[#16A34A] group-hover:bg-[#15803D]"
                    )}>
                      {step === "enquiry" ? (
                        <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      ) : (
                        <span className="text-[10px] font-bold text-white">2</span>
                      )}
                    </span>
                    <span className={cn("text-[10px] font-semibold transition-colors",
                      step === "dates" ? "text-[#9C9485]" :
                      step === "rooms" ? "text-[#E8A020]" :
                      "text-[#16A34A] group-hover:underline"
                    )}>Room</span>
                  </button>

                  <div className={cn("flex-1 h-0.5 rounded-full", step === "enquiry" ? "bg-[#E8A020] animate-pulse" : "bg-[#E2DDD5]")} />

                  {/* Step 3: Confirm */}
                  <div className="flex items-center gap-1">
                    <span className={cn("size-5 rounded-full flex items-center justify-center", step === "enquiry" ? "bg-[#E8A020] animate-pulse" : "bg-[#E2DDD5]")}>
                      <span className="text-[10px] font-bold text-white">3</span>
                    </span>
                    <span className={cn("text-[10px] font-semibold", step === "enquiry" ? "text-[#E8A020]" : "text-[#9C9485]")}>Confirm</span>
                  </div>
                </div>

                {/* Date summary — show when past dates step */}
                {step !== "dates" && checkIn && checkOut && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11px] text-[#9C9485]">
                      {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} night{nights !== 1 ? "s" : ""} · {guests} guest{guests !== 1 ? "s" : ""}
                    </p>
                    <button type="button" onClick={() => setStep("dates")} className="text-[11px] font-semibold text-[#E8A020] hover:text-[#d4911c] shrink-0 ml-2">
                      Change
                    </button>
                  </div>
                )}

                {/* Room pre-selection hint on dates step */}
                {step === "dates" && pendingRoomKey && previewRoom && (
                  <div className="flex items-center gap-2 mt-2 bg-[#E8A020]/5 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px]">🛏</span>
                    <p className="text-[11px] text-[#5E5848]">Checking availability for <span className="font-semibold">{previewRoom.name}</span></p>
                  </div>
                )}
              </div>

              {/* Social proof */}
              {(avgRating || recentBookings || isVerified) && (
                <div className="bg-[#FAFAF8] border-b border-[#E2DDD5] px-5 py-1.5 flex items-center gap-3 text-[10px] text-[#9C9485] shrink-0">
                  {avgRating != null && avgRating > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="size-2.5 text-[#E8A020]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      {avgRating.toFixed(1)}{reviewCount ? ` (${reviewCount})` : ""}
                    </span>
                  )}
                  {recentBookings != null && recentBookings > 0 && <span>Booked {recentBookings}x this month</span>}
                  {isVerified && <span>Verified host</span>}
                </div>
              )}

              {/* ── STEP 1: Dates & Guests ── */}
              {step === "dates" && (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                    {/* Date picker */}
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C] mb-2">When are you staying?</p>
                      <div className="border border-[#E2DDD5] rounded-[14px] p-3 bg-[#FAFAF8]">
                        <DateRangePicker
                          checkIn={modalCheckIn}
                          checkOut={modalCheckOut}
                          onCheckInChange={setModalCheckIn}
                          onCheckOutChange={setModalCheckOut}
                        />
                      </div>
                    </div>

                    {/* Guests */}
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C] mb-2">Guests</p>
                      <div className="border border-[#E2DDD5] rounded-[14px] p-3 flex items-center justify-between">
                        <span className="text-[13px] text-[#5E5848]">Number of guests</span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setModalGuests(Math.max(1, modalGuests - 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30" disabled={modalGuests <= 1}>-</button>
                          <span className="text-[14px] font-semibold text-[#16130C] w-4 text-center">{modalGuests}</span>
                          <button type="button" onClick={() => setModalGuests(Math.min(maxGuests, modalGuests + 1))} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30" disabled={modalGuests >= maxGuests}>+</button>
                        </div>
                      </div>
                    </div>

                    {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] px-5 pt-3 pb-4 shrink-0">
                    <button
                      type="button"
                      onClick={handleModalCheckAvailability}
                      disabled={!modalCheckIn || !modalCheckOut || modalCheckOut <= modalCheckIn || checking}
                      className={cn(
                        "w-full py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-200",
                        "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]",
                        "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
                        "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5",
                        "disabled:opacity-50 disabled:pointer-events-none"
                      )}
                    >
                      {checking ? "Checking..." : "Check availability"}
                    </button>
                    <p className="text-[12px] text-[#9C9485] text-center mt-2">You won&apos;t be charged yet</p>
                  </div>
                </>
              )}

              {/* ── STEP 2: Room selection ── */}
              {step === "rooms" && (
                <>
                  <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2">
                    {availableRooms.length === 0 ? (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                        <p className="text-[14px] font-semibold text-red-700 mb-1">No rooms available</p>
                        <p className="text-[12px] text-red-600">All rooms are booked for these dates.</p>
                      </div>
                    ) : (
                      <>
                        {availableRooms.length <= 2 && results.length > 2 && (
                          <div className="flex items-center gap-2 bg-[#FEF3CD] rounded-lg px-3 py-1.5">
                            <span className="text-[12px]">🔥</span>
                            <p className="text-[11px] font-semibold text-[#92400E]">Only {availableRooms.length} room{availableRooms.length !== 1 ? "s" : ""} left</p>
                          </div>
                        )}

                        {/* Entire property */}
                        {entireAvail && results.length > 1 && (
                          <button type="button" onClick={() => { setSelectedRoom(selectedRoom === "__entire__" ? null : "__entire__"); setPreviewRoom(null); }}
                            className={cn("w-full text-left rounded-xl overflow-hidden transition-all", selectedRoom === "__entire__" ? "ring-2 ring-[#E8A020] ring-offset-2" : "border border-[#E2DDD5] hover:shadow-md")}>
                            <div className="bg-gradient-to-br from-[#16130C] to-[#2A2520] p-3.5">
                              <p className="text-[14px] font-bold text-white">🏠 Entire property</p>
                              <p className="text-[11px] text-white/50">All {results.length} rooms · Private</p>
                              <p className="text-[18px] font-bold text-[#E8A020] mt-1">{fmt(totalEntirePrice)} <span className="text-[11px] text-white/40 font-normal">/ night</span></p>
                            </div>
                          </button>
                        )}

                        {/* Individual rooms */}
                        {results.map((room) => (
                          <button key={room.key} type="button" disabled={!room.available}
                            onClick={() => {
                              if (selectedRoom === room.key) {
                                setSelectedRoom(null);
                                setPreviewRoom(null);
                              } else {
                                setSelectedRoom(room.key);
                                setPreviewRoom(room);
                              }
                            }}
                            onMouseEnter={() => room.available && !selectedRoom && setPreviewRoom(room)}
                            onMouseLeave={() => !selectedRoom && setPreviewRoom(null)}
                            className={cn("w-full text-left rounded-xl border overflow-hidden transition-all", !room.available ? "opacity-40 grayscale cursor-not-allowed border-[#E2DDD5]" : selectedRoom === room.key ? "ring-2 ring-[#E8A020] ring-offset-2 border-transparent shadow-md" : "border-[#E2DDD5] hover:shadow-md hover:border-[#E8A020]/30")}>
                            <div className="flex">
                              <div className="relative w-[90px] sm:w-[110px] shrink-0 bg-[#F4F1EC]">
                                {room.photo ? <Image src={room.photo} alt={room.name} fill className="object-cover" sizes="110px" unoptimized={!isOptimizableUrl(room.photo)} /> : <div className="w-full h-full min-h-[80px] flex items-center justify-center text-[20px]">🛏</div>}
                                {!room.available && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full">Booked</span></div>}
                                {room.available && selectedRoom === room.key && <div className="absolute top-1.5 right-1.5 size-5 bg-[#E8A020] rounded-full flex items-center justify-center"><svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>}
                              </div>
                              <div className="flex-1 p-3 min-w-0 flex flex-col justify-between">
                                <div>
                                  <p className="text-[13px] font-bold text-[#16130C] truncate">{room.name}</p>
                                  <p className="text-[10px] text-[#9C9485]">Sleeps {room.capacity}{room.bedType ? ` · ${room.bedType}` : ""}</p>
                                  {room.amenities && room.amenities.length > 0 && <p className="text-[9px] text-[#9C9485] mt-0.5 truncate">{room.amenities.slice(0, 3).join(" · ")}</p>}
                                </div>
                                <p className={cn("text-[15px] font-bold mt-1", room.available ? "text-[#E8A020]" : "text-[#9C9485]")}>{fmt(room.price)} <span className="text-[10px] text-[#9C9485] font-normal">/ night</span></p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] shrink-0">
                    {selectedRoom ? (
                      <div className="px-5 pt-3 pb-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[12px] text-[#9C9485]">{fmt(selectedPrice)} x {nights} night{nights !== 1 ? "s" : ""}</span>
                          <span className="text-[17px] font-bold text-[#16130C]">{fmt(selectedPrice * nights)}</span>
                        </div>
                        <button type="button" onClick={() => setStep("enquiry")} className="w-full py-3.5 rounded-2xl text-[15px] font-bold bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 transition-all">
                          Continue to enquiry
                        </button>
                        <div className="flex items-center justify-center gap-2 text-[10px] text-[#9C9485]">
                          <span>🔒 Secure</span><span className="text-[#E2DDD5]">·</span><span>No payment now</span><span className="text-[#E2DDD5]">·</span><span>Reply in 2hrs</span>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-3 text-center"><p className="text-[12px] text-[#9C9485]">Select a room to continue</p></div>
                    )}
                  </div>
                </>
              )}

              {/* ── STEP: Enquiry form ── */}
              {step === "enquiry" && (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    <div className="text-center py-1">
                      <p className="text-[15px] font-semibold text-[#16130C]">One step away from your dream stay</p>
                      <p className="text-[12px] text-[#9C9485]">Fill in your details and the host will confirm</p>
                    </div>

                    {/* Selection summary */}
                    <div className="bg-gradient-to-r from-[#E8A020]/5 to-[#E8A020]/10 border border-[#E8A020]/20 rounded-xl p-3 flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-[#E8A020]/15 flex items-center justify-center shrink-0">
                        <span className="text-[18px]">{selectedRoom === "__entire__" ? "🏠" : "🛏"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#16130C] truncate">
                          {selectedRoom === "__entire__" ? "Entire property" : results.find((r) => r.key === selectedRoom)?.name}
                        </p>
                        <p className="text-[11px] text-[#9C9485]">
                          {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} night{nights !== 1 ? "s" : ""} · <span className="font-semibold text-[#16130C]">{fmt(selectedPrice * nights)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input type="text" placeholder="Full name" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors" />
                      <input type="email" placeholder="Email address" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors" />
                      <PhoneInput value={formPhone} onChange={setFormPhone} required className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors" />
                      <textarea placeholder="Special requests (optional)" value={formMessage} onChange={(e) => setFormMessage(e.target.value)} rows={3} className="w-full border border-[#E2DDD5] rounded-[14px] px-4 py-3 text-[14px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#E8A020] transition-colors resize-none" />
                    </div>

                    {error && <p className="text-[13px] text-red-600 text-center">{error}</p>}

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="text-center p-2 rounded-lg bg-[#FAFAF8]"><span className="text-[14px]">🔒</span><p className="text-[9px] font-semibold text-[#9C9485] mt-0.5">Secure</p></div>
                      <div className="text-center p-2 rounded-lg bg-[#FAFAF8]"><span className="text-[14px]">⚡</span><p className="text-[9px] font-semibold text-[#9C9485] mt-0.5">Reply in 2hrs</p></div>
                      <div className="text-center p-2 rounded-lg bg-[#FAFAF8]"><span className="text-[14px]">💰</span><p className="text-[9px] font-semibold text-[#9C9485] mt-0.5">No payment yet</p></div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 bg-white border-t border-[#E2DDD5] px-5 pt-3 pb-4 shrink-0 space-y-2">
                    <button type="button" onClick={handleEnquire} disabled={sending} className="w-full py-3.5 rounded-2xl text-[15px] font-bold bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 transition-all disabled:opacity-50">
                      {sending ? "Sending..." : "Confirm & send enquiry"}
                    </button>
                    <button type="button" onClick={() => setStep("rooms")} className="w-full text-[12px] text-[#9C9485] hover:text-[#16130C] py-1">
                      ← Back to rooms
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
