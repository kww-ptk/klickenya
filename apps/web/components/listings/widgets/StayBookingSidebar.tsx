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
  room_id?: string;
  photo?: string;
  photos?: string[];
  capacity: number;
  bedType?: string;
  amenities?: string[];
  description?: string;
}

interface AvailabilityFee {
  id: string;
  name: string;
  fee_type: "fixed" | "per_night" | "per_guest" | "percentage";
  amount: number;
  apply_by_default: boolean;
}

interface AvailabilityData {
  rooms: Record<string, { available: boolean; price: number; room_id?: string }> | null;
  entireProperty: boolean | null;
  fees?: AvailabilityFee[];
  property_id?: string;
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
  /** "direct" shows the green pulse badge; "enquiry" hides it (default: "enquiry") */
  bookingMode?: string;
  /** Hero photo URL for the left panel when no room is previewed */
  listingPhoto?: string;
  /** Property highlights shown as trust signals in the left panel */
  listingHighlights?: Array<{ emoji: string; title: string; description?: string }>;
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
  bookingMode = "enquiry",
  listingPhoto,
  listingHighlights,
}: StayBookingSidebarProps) {
  // Dates
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [children, setChildren] = useState(0);
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
  const [modalChildren, setModalChildren] = useState(0);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [enquiryDespiteUnavailable, setEnquiryDespiteUnavailable] = useState(false);

  // Fees from PMS (loaded when availability is checked)
  const [fees, setFees] = useState<AvailabilityFee[]>([]);
  // Guest-selected upsell fee IDs
  const [selectedUpsells, setSelectedUpsells] = useState<Set<string>>(new Set());
  // PMS IDs from the availability response (used when submitting enquiry)
  const [availablePropertyId, setAvailablePropertyId] = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const availableRooms = results.filter((r) => r.available);
  const totalEntirePrice = results.reduce((s, r) => s + r.price, 0);
  const selectedPrice = selectedRoom === "__entire__"
    ? totalEntirePrice
    : (results.find((r) => r.key === selectedRoom)?.price ?? 0);

  // Handle room card / entire property click → open modal at step 1 (dates)
  useEffect(() => {
    if (!openForRoom) return;
    onOpenForRoomHandled?.();

    // Pre-select the room (or entire property) for after availability check
    setPendingRoomKey(openForRoom);
    setSelectedRoom(openForRoom);

    // Build preview from Sanity room data (skip for entire property)
    if (openForRoom !== "__entire__") {
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
    } else {
      setPreviewRoom(null);
    }

    // Sync any existing sidebar dates into modal
    setModalCheckIn(checkIn);
    setModalCheckOut(checkOut);
    setModalGuests(guests);
    setModalChildren(children);

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
            room_id: val.room_id,
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
        if (data.fees) { setFees(data.fees); setSelectedUpsells(new Set()); }
        if (data.property_id) setAvailablePropertyId(data.property_id);
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

      // Only carry over a room pre-selected via room card click — never the previous session's selection
      if (pendingRoomKey && roomResults.find((r) => r.key === pendingRoomKey)) {
        const match = roomResults.find((r) => r.key === pendingRoomKey)!;
        setSelectedRoom(pendingRoomKey);
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
            room_id: val.room_id,
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
        if (data.fees) { setFees(data.fees); setSelectedUpsells(new Set()); }
        if (data.property_id) setAvailablePropertyId(data.property_id);
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

      // Only carry over a room pre-selected via room card click — never the previous session's selection
      if (pendingRoomKey && roomResults.find((r) => r.key === pendingRoomKey)) {
        const match = roomResults.find((r) => r.key === pendingRoomKey)!;
        setSelectedRoom(pendingRoomKey);
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
      const roomName = selectedRoomObj?.name ?? (selectedRoom === "__entire__" ? "Entire property" : undefined);
      const selectedRoomId = selectedRoomObj?.room_id ?? null;
      const subtotal = selectedPrice * nights;

      // Build fee breakdown for email
      const calcFee = (f: AvailabilityFee) => {
        if (f.fee_type === "fixed") return f.amount;
        if (f.fee_type === "per_night") return f.amount * nights;
        if (f.fee_type === "per_guest") return f.amount * modalGuests;
        if (f.fee_type === "percentage") return Math.round(f.amount / 100 * subtotal);
        return 0;
      };
      const feeHint = (f: AvailabilityFee) => {
        if (f.fee_type === "per_night") return `× ${nights} night${nights !== 1 ? "s" : ""}`;
        if (f.fee_type === "per_guest") return `× ${modalGuests} guest${modalGuests !== 1 ? "s" : ""}`;
        if (f.fee_type === "percentage") return `${f.amount}% of subtotal`;
        return "";
      };
      const mandatoryFees = fees.filter((f) => f.apply_by_default);
      const chosenUpsells = fees.filter((f) => !f.apply_by_default && selectedUpsells.has(f.id));
      const mandatoryTotal = mandatoryFees.reduce((s, f) => s + calcFee(f), 0);
      const upsellTotal = chosenUpsells.reduce((s, f) => s + calcFee(f), 0);
      const estimatedTotal = subtotal + mandatoryTotal + upsellTotal;

      const pricingBreakdown = {
        roomName: roomName ?? listingTitle,
        perNight: selectedPrice,
        nights,
        subtotal,
        mandatoryFees: mandatoryFees.map((f) => ({ name: f.name, hint: feeHint(f), amount: calcFee(f) })),
        upsellFees: chosenUpsells.map((f) => ({ name: f.name, hint: feeHint(f), amount: calcFee(f) })),
        estimatedTotal,
      };

      const messageWithNote = [
        formMessage.trim() || undefined,
        enquiryDespiteUnavailable ? "Guest submitted despite unavailable dates" : undefined,
      ].filter(Boolean).join("\n\n") || undefined;

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listingId,
          listingTitle: listingTitle,
          listingType: "stay",
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          message: messageWithNote,
          checkIn: checkIn,
          checkOut: checkOut,
          guests,
          room: roomName,
          room_id: selectedRoomId,
          property_id: availablePropertyId,
          pricingBreakdown: selectedPrice > 0 ? pricingBreakdown : undefined,
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
        {(() => {
          // "From" price = lowest room price (most accurate for guests)
          // Falls back to listing price, then 0
          const roomPrices = (sanityRooms ?? []).map((r) => r.pricePerNight).filter((p) => p > 0);
          const lowestRoomPrice = roomPrices.length > 0 ? Math.min(...roomPrices) : 0;
          const displayPrice = lowestRoomPrice > 0 ? lowestRoomPrice : (price > 0 ? price : 0);
          return displayPrice > 0 ? (
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[13px] text-[#9C9485]">From</span>
              <span className="font-display text-[24px] font-extrabold tracking-[-0.02em] text-[#16130C]">{fmt(displayPrice)}</span>
              <span className="text-[14px] text-[#9C9485]">/ {priceUnit}</span>
            </div>
          ) : (
            <div className="mb-1">
              <p className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-[#16130C]">Pick your dates</p>
              <p className="text-[13px] text-[#9C9485]">Check availability and pricing</p>
            </div>
          );
        })()}

        {/* Direct booking indicator */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#16A34A]/5 rounded-xl border border-[#16A34A]/15">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16A34A] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#16A34A]" />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-[#16A34A]">Direct booking available</p>
            <p className="text-[10px] text-[#9C9485]">No OTA fees · Instant confirmation</p>
          </div>
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
        {(() => {
          const cap = maxGuests > 0 ? maxGuests : 20;
          const total = guests + children;
          return (
            <div className="border border-[#E2DDD5] rounded-[14px] p-3 space-y-2.5">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-[#16130C]">Adults</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setGuests(guests - 1)} className="size-7 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 text-[13px]" disabled={guests <= 1}>-</button>
                  <span className="text-[14px] font-semibold text-[#16130C] w-5 text-center">{guests}</span>
                  <button type="button" onClick={() => setGuests(guests + 1)} className="size-7 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 text-[13px]" disabled={total >= cap}>+</button>
                </div>
              </div>
              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-semibold text-[#16130C]">Children</p>
                  <p className="text-[10px] text-[#9C9485]">Under 12 years old</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setChildren(children - 1)} className="size-7 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 text-[13px]" disabled={children <= 0}>-</button>
                  <span className="text-[14px] font-semibold text-[#16130C] w-5 text-center">{children}</span>
                  <button type="button" onClick={() => setChildren(children + 1)} className="size-7 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 text-[13px]" disabled={total >= cap}>+</button>
                </div>
              </div>
            </div>
          );
        })()}

        <button type="button" onClick={() => { setModalCheckIn(checkIn); setModalCheckOut(checkOut); setModalGuests(guests); setModalChildren(children); checkAvailability(); }} disabled={!checkIn || !checkOut || checkOut <= checkIn || checking} className={cn("w-full py-3.5 rounded-[18px] text-[15px] font-bold transition-all duration-200", "bg-gradient-to-r from-[#E8A020] to-[#d4911c] text-[#16130C]", "shadow-[0_4px_14px_rgba(232,160,32,0.35)]", "hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5", "disabled:opacity-50 disabled:pointer-events-none")}>
          {checking ? "Checking..." : "Check availability"}
        </button>

        {error && !showModal && <p className="text-[13px] text-red-600 text-center">{error}</p>}
        <p className="text-[12px] text-[#9C9485] text-center">You won&apos;t be charged yet</p>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-[#E2DDD5] text-[10px] text-[#9C9485]">
          <span className="flex items-center gap-1">🔒 Secure</span>
          <span className="flex items-center gap-1">✓ Instant confirm</span>
          <span className="flex items-center gap-1">💬 Direct with host</span>
        </div>
      </div>

      {/* ── Main booking modal — two-column on desktop ── */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => { setShowModal(false); setStep("dates"); }} />

          <div className={cn("relative w-full max-h-[94vh] lg:max-h-[88vh] bg-white rounded-t-3xl lg:rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row", step === "dates" ? "lg:max-w-[1060px]" : "lg:max-w-[900px]")}>

            {/* ── LEFT: Room preview (desktop only) ── */}
            <div className="hidden lg:flex lg:w-[400px] bg-[#F4F1EC] flex-col shrink-0 overflow-hidden">
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
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Hero photo */}
                  {listingPhoto ? (
                    <div className="relative h-[210px] bg-[#E2DDD5] shrink-0">
                      <Image src={listingPhoto} alt={listingTitle} fill className="object-cover" sizes="400px" unoptimized={!isOptimizableUrl(listingPhoto)} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <p className="font-display text-[18px] font-bold text-white leading-tight drop-shadow">{listingTitle}</p>
                        {price > 0 && (
                          <p className="text-[12px] text-white/80 mt-0.5">From <span className="font-semibold text-[#F8D06B]">{fmt(price)}</span> / {priceUnit}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[140px] bg-[#E2DDD5] shrink-0 flex flex-col items-center justify-center gap-2">
                      <span className="text-[44px]">🏨</span>
                      <p className="text-[14px] font-semibold text-[#16130C]">{listingTitle}</p>
                    </div>
                  )}

                  {/* Trust content */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Rating + badges */}
                    {(avgRating || isVerified || recentBookings) && (
                      <div className="flex flex-wrap gap-2">
                        {avgRating != null && avgRating > 0 && (
                          <span className="inline-flex items-center gap-1.5 bg-white border border-[#E2DDD5] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#16130C]">
                            <svg className="size-3 text-[#E8A020]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            {avgRating.toFixed(1)}{reviewCount ? ` · ${reviewCount} reviews` : ""}
                          </span>
                        )}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1.5 bg-white border border-[#E2DDD5] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#16A34A]">
                            <svg className="size-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                            Verified host
                          </span>
                        )}
                        {recentBookings != null && recentBookings > 0 && (
                          <span className="inline-flex items-center gap-1.5 bg-white border border-[#E2DDD5] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#5E5848]">
                            🔥 Booked {recentBookings}x this month
                          </span>
                        )}
                      </div>
                    )}

                    {/* Property highlights */}
                    {listingHighlights && listingHighlights.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">Why guests love it</p>
                        <div className="space-y-2">
                          {listingHighlights.slice(0, 4).map((h, i) => (
                            <div key={i} className="flex items-start gap-2.5 bg-white rounded-xl p-2.5 border border-[#E2DDD5]">
                              <span className="text-[16px] shrink-0 mt-0.5">{h.emoji}</span>
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-[#16130C]">{h.title}</p>
                                {h.description && <p className="text-[10px] text-[#9C9485] mt-0.5 line-clamp-2">{h.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step hint */}
                    <p className="text-[11px] text-[#9C9485] italic">
                      {step === "dates" ? "Pick your dates to check room availability →" : "Select a room to see full details →"}
                    </p>
                  </div>
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
                      {fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} night{nights !== 1 ? "s" : ""} · {guests} adult{guests !== 1 ? "s" : ""}{modalChildren > 0 ? `, ${modalChildren} child${modalChildren !== 1 ? "ren" : ""}` : ""}
                    </p>
                    <button type="button" onClick={() => setStep("dates")} className="text-[11px] font-semibold text-[#E8A020] hover:text-[#d4911c] shrink-0 ml-2">
                      Change
                    </button>
                  </div>
                )}

                {/* Room pre-selection hint on dates step */}
                {step === "dates" && pendingRoomKey && (
                  <div className="flex items-center gap-2 mt-2 bg-[#E8A020]/5 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px]">{pendingRoomKey === "__entire__" ? "🏠" : "🛏"}</span>
                    <p className="text-[11px] text-[#5E5848]">Checking availability for <span className="font-semibold">{pendingRoomKey === "__entire__" ? "entire property" : previewRoom?.name}</span></p>
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
                  <div className="flex-1 overflow-y-auto px-5 py-3">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Left: Calendar — same width as sidebar */}
                      <div className="w-full sm:w-[320px] shrink-0">
                        <p className="text-[13px] font-semibold text-[#16130C] mb-1.5">Select dates</p>
                        <DateRangePicker
                          checkIn={modalCheckIn}
                          checkOut={modalCheckOut}
                          onCheckInChange={setModalCheckIn}
                          onCheckOutChange={setModalCheckOut}
                        />
                      </div>

                      {/* Right: Guests & Children */}
                      <div className="flex-1 sm:min-w-[200px] space-y-3 sm:pt-6">
                        {(() => {
                          const totalGuests = modalGuests + modalChildren;
                          const cap = maxGuests > 0 ? maxGuests : 20;
                          return (
                            <>
                              {/* Adults */}
                              <div className="border border-[#E2DDD5] rounded-[14px] p-3.5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[13px] font-semibold text-[#16130C]">Adults</p>
                                    <p className="text-[11px] text-[#9C9485]">Age 13+</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setModalGuests(modalGuests - 1)} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 disabled:cursor-not-allowed" disabled={modalGuests <= 1}>-</button>
                                    <span className="text-[14px] font-semibold text-[#16130C] w-6 text-center">{modalGuests}</span>
                                    <button type="button" onClick={() => setModalGuests(modalGuests + 1)} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 disabled:cursor-not-allowed" disabled={totalGuests >= cap}>+</button>
                                  </div>
                                </div>
                              </div>

                              {/* Children */}
                              <div className="border border-[#E2DDD5] rounded-[14px] p-3.5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-[13px] font-semibold text-[#16130C]">Children</p>
                                    <p className="text-[11px] text-[#9C9485]">Age 0–12</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => setModalChildren(modalChildren - 1)} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 disabled:cursor-not-allowed" disabled={modalChildren <= 0}>-</button>
                                    <span className="text-[14px] font-semibold text-[#16130C] w-6 text-center">{modalChildren}</span>
                                    <button type="button" onClick={() => setModalChildren(modalChildren + 1)} className="size-8 rounded-full border border-[#E2DDD5] flex items-center justify-center text-[#5E5848] hover:bg-[#F4F1EC] disabled:opacity-30 disabled:cursor-not-allowed" disabled={totalGuests >= cap}>+</button>
                                  </div>
                                </div>
                              </div>

                              {/* Capacity hint */}
                              {totalGuests >= cap && (
                                <p className="text-[10px] text-[#E8A020] font-medium">Maximum {cap} guests for this property</p>
                              )}
                            </>
                          );
                        })()}

                        {/* Trip summary */}
                        {modalCheckIn && modalCheckOut && modalCheckOut > modalCheckIn && (
                          <div className="bg-[#FAFAF8] rounded-[14px] p-3.5 border border-[#E2DDD5]">
                            <p className="text-[11px] font-semibold text-[#16130C] mb-1.5">Trip summary</p>
                            <p className="text-[12px] text-[#9C9485]">
                              {fmtDate(modalCheckIn)} → {fmtDate(modalCheckOut)} · {nightsBetween(modalCheckIn, modalCheckOut)} night{nightsBetween(modalCheckIn, modalCheckOut) !== 1 ? "s" : ""}
                            </p>
                            <p className="text-[12px] text-[#9C9485] mt-0.5">
                              {modalGuests} adult{modalGuests !== 1 ? "s" : ""}{modalChildren > 0 ? `, ${modalChildren} child${modalChildren !== 1 ? "ren" : ""}` : ""}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {error && <p className="text-[13px] text-red-600 text-center mt-3">{error}</p>}
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
                      <div className="space-y-3">
                        <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-[18px] shrink-0 mt-0.5">⚠️</span>
                            <div>
                              <p className="text-[13px] font-semibold text-[#92400E] mb-1">These dates appear to be taken</p>
                              <p className="text-[12px] text-[#78350F] leading-relaxed">
                                This property may already have a booking for{" "}
                                <span className="font-semibold">{fmtDate(checkIn)} – {fmtDate(checkOut)}</span>.
                                You can still send an enquiry — the host will check if they can accommodate you or suggest alternative dates.
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEnquiryDespiteUnavailable(true);
                            // Auto-select first result so enquiry has a room reference
                            if (!selectedRoom && results[0]) {
                              setSelectedRoom(results[0].key);
                              setPreviewRoom(results[0]);
                            }
                            setStep("enquiry");
                          }}
                          className="w-full py-3 rounded-xl text-[14px] font-bold bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-[0_3px_10px_rgba(245,158,11,0.35)] hover:shadow-[0_5px_16px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 transition-all"
                        >
                          Send enquiry anyway
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalCheckIn("");
                            setModalCheckOut("");
                            setCheckIn("");
                            setCheckOut("");
                            setResults([]);
                            setEnquiryDespiteUnavailable(false);
                            setStep("dates");
                          }}
                          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-[#5E5848] border border-[#E2DDD5] hover:bg-[#F4F1EC] transition-colors"
                        >
                          Pick different dates
                        </button>
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
                          <button
                            type="button"
                            onClick={() => { setSelectedRoom(selectedRoom === "__entire__" ? null : "__entire__"); setPreviewRoom(null); }}
                            className={cn(
                              "w-full text-left rounded-xl overflow-hidden transition-all border-2",
                              selectedRoom === "__entire__"
                                ? "border-[#E8A020] ring-2 ring-[#E8A020]/30 ring-offset-1"
                                : "border-[#E8A020]/40 hover:border-[#E8A020] hover:shadow-md"
                            )}
                          >
                            <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3CD] p-4">
                              <div className="flex items-start gap-3">
                                <span className="text-[28px] leading-none animate-bounce">🎉</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-[14px] font-bold text-[#16130C]">Entire property available!</p>
                                    {selectedRoom === "__entire__" && (
                                      <svg className="size-4 text-[#E8A020] shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-[#78350F]">All {results.length} rooms · Exclusively yours · Private stay</p>
                                  <p className="text-[19px] font-bold text-[#E8A020] mt-1.5">{fmt(totalEntirePrice)} <span className="text-[11px] text-[#9C9485] font-normal">/ night</span></p>
                                </div>
                              </div>
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
                        <button type="button" onClick={() => setStep("dates")} className="w-full text-[12px] text-[#9C9485] hover:text-[#16130C] py-1">
                          ← Change dates
                        </button>
                      </div>
                    ) : (
                      <div className="px-5 pt-3 pb-4 space-y-2">
                        <p className="text-[12px] text-[#9C9485] text-center">Select a room to continue</p>
                        <button type="button" onClick={() => setStep("dates")} className="w-full text-[12px] text-[#9C9485] hover:text-[#16130C] py-1">
                          ← Change dates
                        </button>
                      </div>
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

                    {/* Selection summary + fee breakdown */}
                    {(() => {
                      const subtotal = selectedPrice * nights;
                      const calcFee = (f: AvailabilityFee) => {
                        if (f.fee_type === "fixed") return f.amount;
                        if (f.fee_type === "per_night") return f.amount * nights;
                        if (f.fee_type === "per_guest") return f.amount * modalGuests;
                        if (f.fee_type === "percentage") return Math.round(f.amount / 100 * subtotal);
                        return 0;
                      };
                      const mandatoryFees = fees.filter((f) => f.apply_by_default);
                      const upsellFees = fees.filter((f) => !f.apply_by_default);
                      const mandatoryTotal = mandatoryFees.reduce((s, f) => s + calcFee(f), 0);
                      const upsellTotal = upsellFees.filter((f) => selectedUpsells.has(f.id)).reduce((s, f) => s + calcFee(f), 0);
                      const total = subtotal + mandatoryTotal + upsellTotal;
                      const feeHint = (f: AvailabilityFee) => {
                        if (f.fee_type === "per_night") return ` · ${nights} night${nights !== 1 ? "s" : ""}`;
                        if (f.fee_type === "per_guest") return ` · ${modalGuests} guest${modalGuests !== 1 ? "s" : ""}`;
                        if (f.fee_type === "percentage") return ` · ${f.amount}% of subtotal`;
                        return "";
                      };
                      return (
                        <>
                          {/* Upsell fees — guest toggles (above price breakdown) */}
                          {upsellFees.length > 0 && (
                            <div className="rounded-lg border border-violet-200 overflow-hidden divide-y divide-violet-100">
                              <div className="px-3 py-2 bg-violet-50 flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Optional extras</span>
                                <span className="text-[10px] text-violet-400">· add to your stay</span>
                              </div>
                              {upsellFees.map((f) => {
                                const on = selectedUpsells.has(f.id);
                                return (
                                  <div key={f.id} className={`flex items-center justify-between px-3 py-2.5 transition-colors ${on ? "bg-violet-50/60" : "bg-white"}`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedUpsells((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                                          return next;
                                        })}
                                        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${on ? "bg-violet-500" : "bg-[#E2DDD5]"}`}
                                        aria-label={on ? "Remove" : "Add"}
                                      >
                                        <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
                                      </button>
                                      <div className="min-w-0">
                                        <p className="text-[12px] font-semibold text-[#16130C]">{f.name}</p>
                                        <p className="text-[10px] text-[#9C9485]">
                                          {f.fee_type === "per_night" ? `${fmt(f.amount)}/night` :
                                           f.fee_type === "per_guest" ? `${fmt(f.amount)}/guest` :
                                           f.fee_type === "percentage" ? `${f.amount}% of subtotal` :
                                           fmt(f.amount)}
                                        </p>
                                      </div>
                                    </div>
                                    <span className={`text-[12px] font-semibold shrink-0 ml-2 ${on ? "text-violet-600" : "text-[#9C9485]"}`}>{fmt(calcFee(f))}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Price breakdown */}
                          <div className="rounded-lg border border-[#E2DDD5] overflow-hidden divide-y divide-[#E2DDD5]">
                            {/* Room header */}
                            <div className="bg-[#F9F8F6] px-3 py-2.5 flex items-center gap-2.5">
                              <span className="text-[15px]">{selectedRoom === "__entire__" ? "🏠" : "🛏"}</span>
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-[#16130C] truncate">
                                  {selectedRoom === "__entire__" ? "Entire property" : results.find((r) => r.key === selectedRoom)?.name}
                                </p>
                                <p className="text-[10px] text-[#9C9485]">{fmtDate(checkIn)} → {fmtDate(checkOut)} · {nights} night{nights !== 1 ? "s" : ""}</p>
                              </div>
                            </div>
                            {/* Subtotal row */}
                            <div className="flex justify-between items-center px-3 py-2 bg-white">
                              <span className="text-[12px] text-[#9C9485]">{fmt(selectedPrice)} × {nights} night{nights !== 1 ? "s" : ""}</span>
                              <span className="text-[12px] font-semibold text-[#16130C]">{fmt(subtotal)}</span>
                            </div>
                            {/* Mandatory fee rows */}
                            {mandatoryFees.map((f) => (
                              <div key={f.id} className="flex justify-between items-center px-3 py-2 bg-white">
                                <span className="text-[12px] text-[#9C9485]">{f.name}{feeHint(f)}</span>
                                <span className="text-[12px] font-semibold text-[#16130C]">{fmt(calcFee(f))}</span>
                              </div>
                            ))}
                            {/* Selected upsell rows */}
                            {upsellFees.filter((f) => selectedUpsells.has(f.id)).map((f) => (
                              <div key={f.id} className="flex justify-between items-center px-3 py-2 bg-violet-50/40">
                                <span className="text-[12px] text-violet-600">{f.name}{feeHint(f)}</span>
                                <span className="text-[12px] font-semibold text-violet-600">{fmt(calcFee(f))}</span>
                              </div>
                            ))}
                            {/* Total row — amber accent, no dark bg */}
                            <div className="flex justify-between items-center px-3 py-2.5 bg-[#F9F8F6] border-t-2 border-[#E8A020]/40">
                              <span className="text-[12px] font-semibold text-[#5E5848]">Estimated total</span>
                              <span className="text-[15px] font-bold text-[#E8A020]">{fmt(total)}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}

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
