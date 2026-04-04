"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

interface Room {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string;
  max_guests: number;
  base_price_kes: number;
  is_active: boolean;
}

interface NewBookingSidePanelProps {
  roomId: string;
  date: string;
  checkOutDate?: string;
  rooms: Room[];
  propertyId: string;
  onClose: () => void;
  onCreated: (booking: any) => void;
}

/* ---------- Country codes ---------- */

const COUNTRY_CODES = [
  { code: "+254", label: "KE +254", flag: "\uD83C\uDDF0\uD83C\uDDEA" },
  { code: "+255", label: "TZ +255", flag: "\uD83C\uDDF9\uD83C\uDDFF" },
  { code: "+256", label: "UG +256", flag: "\uD83C\uDDFA\uD83C\uDDEC" },
  { code: "+250", label: "RW +250", flag: "\uD83C\uDDF7\uD83C\uDDFC" },
  { code: "+44", label: "UK +44", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "+1", label: "US +1", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "+49", label: "DE +49", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "+33", label: "FR +33", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { code: "+39", label: "IT +39", flag: "\uD83C\uDDEE\uD83C\uDDF9" },
  { code: "+31", label: "NL +31", flag: "\uD83C\uDDF3\uD83C\uDDF1" },
  { code: "+27", label: "ZA +27", flag: "\uD83C\uDDFF\uD83C\uDDE6" },
  { code: "+971", label: "AE +971", flag: "\uD83C\uDDE6\uD83C\uDDEA" },
  { code: "+91", label: "IN +91", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  { code: "+86", label: "CN +86", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  { code: "+61", label: "AU +61", flag: "\uD83C\uDDE6\uD83C\uDDFA" },
] as const;

/* ---------- Availability conflict type ---------- */

interface AvailabilityResult {
  available: boolean;
  conflict?: { guest_name: string; check_in_date: string; check_out_date: string; source: string };
  blocked?: { start_date: string; end_date: string; reason: string | null };
}

/* ---------- Component ---------- */

export function NewBookingSidePanel({
  roomId,
  date,
  checkOutDate,
  rooms,
  propertyId,
  onClose,
  onCreated,
}: NewBookingSidePanelProps) {
  const { showToast } = useToast();
  const initialRoom = rooms.find((r) => r.id === roomId);
  const defaultCheckOut = checkOutDate ?? (() => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const [form, setForm] = useState({
    guest_name: "",
    guest_phone: "",
    country_code: "+254",
    guest_email: "",
    room_id: roomId,
    check_in_date: date,
    check_out_date: defaultCheckOut,
    guest_count: 1,
    rate_per_night: initialRoom?.base_price_kes ?? 0,
    discount_kes: 0,
    payment_method: "cash" as string,
    amount_paid: 0,
    source: "direct" as string,
    guest_notes: "",
    internal_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Build full phone number from country code + local number
  const fullPhone = form.guest_phone.trim()
    ? `${form.country_code}${form.guest_phone.replace(/^0+/, "").replace(/\D/g, "")}`
    : "";

  const activeRooms = rooms.filter((r) => r.is_active);
  const isEntireBooking = form.room_id === "__entire__";
  const selectedRoom = isEntireBooking ? null : rooms.find((r) => r.id === form.room_id);
  const entireRate = activeRooms.reduce((sum, r) => sum + r.base_price_kes, 0);

  // Calculated values
  const nights = Math.max(
    0,
    Math.floor(
      (new Date(form.check_out_date + "T00:00:00").getTime() -
        new Date(form.check_in_date + "T00:00:00").getTime()) /
        86400000
    )
  );
  const subtotal = nights * form.rate_per_night;
  const finalTotal = Math.max(0, subtotal - form.discount_kes);
  const balance = Math.max(0, finalTotal - form.amount_paid);

  // Update rate when room changes
  useEffect(() => {
    if (form.room_id === "__entire__") {
      const total = activeRooms.reduce((sum, r) => sum + r.base_price_kes, 0);
      const maxGuests = activeRooms.reduce((sum, r) => sum + r.max_guests, 0);
      setForm((prev) => ({
        ...prev,
        rate_per_night: total,
        guest_count: Math.min(prev.guest_count, maxGuests),
      }));
    } else {
      const room = rooms.find((r) => r.id === form.room_id);
      if (room) {
        setForm((prev) => ({
          ...prev,
          rate_per_night: room.base_price_kes,
          guest_count: Math.min(prev.guest_count, room.max_guests),
        }));
      }
    }
  }, [form.room_id, rooms, activeRooms]);

  // Availability check when room + dates change
  const checkAvailability = useCallback(async () => {
    if (!form.room_id || !form.check_in_date || !form.check_out_date) return;
    if (form.check_out_date <= form.check_in_date) {
      setAvailability(null);
      return;
    }

    setCheckingAvail(true);
    try {
      if (form.room_id === "__entire__") {
        // Check ALL rooms — entire property available only if all rooms free
        const results = await Promise.all(
          activeRooms.map((r) =>
            fetch(`/api/properties/availability?room_id=${r.id}&check_in=${form.check_in_date}&check_out=${form.check_out_date}`)
              .then((res) => res.json())
          )
        );
        const unavailableRoom = results.find((r) => !r.available);
        if (unavailableRoom) {
          setAvailability({
            available: false,
            conflict: unavailableRoom.conflict,
            blocked: unavailableRoom.blocked,
          });
        } else {
          setAvailability({ available: true });
        }
      } else {
        const res = await fetch(
          `/api/properties/availability?room_id=${form.room_id}&check_in=${form.check_in_date}&check_out=${form.check_out_date}`
        );
        const data = await res.json();
        setAvailability(data);
      }
    } catch {
      setAvailability(null);
    }
    setCheckingAvail(false);
  }, [form.room_id, form.check_in_date, form.check_out_date, activeRooms]);

  useEffect(() => {
    const timer = setTimeout(checkAvailability, 300);
    return () => clearTimeout(timer);
  }, [checkAvailability]);

  // Suggest full amount when cash selected
  useEffect(() => {
    if (form.payment_method === "cash" && form.amount_paid === 0 && finalTotal > 0) {
      setForm((prev) => ({ ...prev, amount_paid: finalTotal }));
    }
  }, [form.payment_method]); // Only trigger on method change

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.guest_name.trim()) {
      setError("Guest name is required");
      return;
    }
    if (!form.guest_phone.trim()) {
      setError("Phone number is required");
      return;
    }
    const phoneDigits = form.guest_phone.replace(/\D/g, "");
    if (phoneDigits.length < 4 || phoneDigits.length > 15) {
      setError("Enter a valid phone number");
      return;
    }
    if (nights <= 0) {
      setError("Check-out must be after check-in");
      return;
    }
    if (availability && !availability.available) {
      setError("This room is not available for the selected dates");
      return;
    }

    setSaving(true);

    try {
      const bookingRooms = isEntireBooking ? activeRooms : [selectedRoom!];
      const perRoomDiscount = isEntireBooking
        ? Math.round(form.discount_kes / bookingRooms.length)
        : form.discount_kes;
      const perRoomPayment = isEntireBooking
        ? Math.round(form.amount_paid / bookingRooms.length)
        : form.amount_paid;

      let lastBooking = null;
      for (const room of bookingRooms) {
        const roomRate = isEntireBooking ? room.base_price_kes : form.rate_per_night;
        const roomSubtotal = nights * roomRate;
        const roomTotal = Math.max(0, roomSubtotal - perRoomDiscount);

        const res = await fetch("/api/properties/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_id: propertyId,
            room_id: room.id,
            guest_name: form.guest_name.trim(),
            guest_phone: fullPhone,
            guest_email: form.guest_email.trim() || null,
            guest_count: form.guest_count,
            check_in_date: form.check_in_date,
            check_out_date: form.check_out_date,
            rate_per_night: roomRate,
            discount_kes: perRoomDiscount,
            source: form.source,
            guest_notes: form.guest_notes.trim() || null,
            internal_notes: isEntireBooking
              ? `Entire property booking${form.internal_notes.trim() ? ` · ${form.internal_notes.trim()}` : ""}`
              : form.internal_notes.trim() || null,
            payment_method: form.payment_method,
            amount_paid: perRoomPayment,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setError(
              data.conflict
                ? `${room.name} is not available — booked by ${data.conflict.guest_name} (${data.conflict.check_in_date} → ${data.conflict.check_out_date})`
                : `${room.name} is no longer available — please select different dates`
            );
          } else {
            setError(data.error ?? "Failed to create booking");
          }
          setSaving(false);
          return;
        }
        lastBooking = data.booking;
      }

      const label = isEntireBooking
        ? `Entire property booked for ${form.guest_name.trim()} (${bookingRooms.length} rooms)`
        : `Booking confirmed for ${form.guest_name.trim()}`;
      showToast(label, "success");
      onCreated(lastBooking);
    } catch {
      setError("Network error — please try again");
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(n);

  const isUnavailable = availability !== null && !availability.available;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-[440px] bg-white h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E2DDD5] px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-display text-[18px] font-bold text-[#16130C]">
            New Booking
          </h2>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-[#F4F1EC] transition-colors"
          >
            <svg className="size-5 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Availability warning */}
          {isUnavailable && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[13px] font-semibold text-red-700">
                This room is not available for the selected dates
              </p>
              {availability?.conflict && (
                <p className="text-[12px] text-red-600 mt-1">
                  Booked by {availability.conflict.guest_name} ({availability.conflict.check_in_date} → {availability.conflict.check_out_date})
                </p>
              )}
              {availability?.blocked && (
                <p className="text-[12px] text-red-600 mt-1">
                  Blocked: {availability.blocked.reason ?? "No reason given"} ({availability.blocked.start_date} → {availability.blocked.end_date})
                </p>
              )}
            </div>
          )}

          {/* Guest name */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Guest name *
            </label>
            <input
              type="text"
              value={form.guest_name}
              onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              placeholder="John Doe"
              autoFocus
            />
          </div>

          {/* Phone with country code */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Phone *
            </label>
            <div className="flex gap-1.5">
              <select
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                className="w-[110px] shrink-0 h-[40px] px-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={form.guest_phone}
                onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                className="flex-1 h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                placeholder="712 345 678"
              />
            </div>
            {fullPhone && (
              <p className="text-[11px] text-[#9C9485] mt-0.5">{fullPhone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.guest_email}
              onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              placeholder="guest@email.com"
            />
          </div>

          {/* Room selector */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Room *
            </label>
            <select
              value={form.room_id}
              onChange={(e) => setForm({ ...form, room_id: e.target.value })}
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white"
            >
              {activeRooms.length > 1 && (
                <option value="__entire__">
                  Entire Property (all {activeRooms.length} rooms) — {fmt(entireRate)}/night
                </option>
              )}
              {activeRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.room_number ? ` (#${r.room_number})` : ""} — {fmt(r.base_price_kes)}/night — max {r.max_guests}
                </option>
              ))}
            </select>
            {isEntireBooking && (
              <p className="text-[11px] text-[#4F46E5] mt-1 font-medium">
                This will create a booking for every room ({activeRooms.length} rooms)
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Check-in *
              </label>
              <input
                type="date"
                value={form.check_in_date}
                onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Check-out *
              </label>
              <input
                type="date"
                value={form.check_out_date}
                onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Nights + Guests */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Nights
              </label>
              <div className="h-[40px] px-3 rounded-lg border border-[#E2DDD5] bg-[#FAFAF8] text-[14px] text-[#16130C] flex items-center">
                {nights}
                {checkingAvail && (
                  <span className="ml-2 text-[11px] text-[#9C9485]">checking...</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Guests
              </label>
              <input
                type="number"
                min={1}
                max={isEntireBooking ? activeRooms.reduce((s, r) => s + r.max_guests, 0) : (selectedRoom?.max_guests ?? 20)}
                value={form.guest_count}
                onChange={(e) =>
                  setForm({ ...form, guest_count: parseInt(e.target.value) || 1 })
                }
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Rate */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Rate per night (KSh)
            </label>
            <input
              type="number"
              min={0}
              value={form.rate_per_night}
              onChange={(e) =>
                setForm({ ...form, rate_per_night: parseFloat(e.target.value) || 0 })
              }
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
            />
          </div>

          {/* Financial summary */}
          <div className="bg-[#F4F1EC] rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#5E5848]">
                {fmt(form.rate_per_night)} x {nights} night{nights !== 1 ? "s" : ""}
              </span>
              <span className="text-[#16130C]">{fmt(subtotal)}</span>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Discount (KSh)
            </label>
            <input
              type="number"
              min={0}
              max={subtotal}
              value={form.discount_kes}
              onChange={(e) =>
                setForm({ ...form, discount_kes: parseFloat(e.target.value) || 0 })
              }
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
            />
          </div>

          {/* Final total */}
          <div className="bg-[#16130C] rounded-lg p-3 flex justify-between items-center">
            <span className="text-[13px] font-semibold text-white/70">Final total</span>
            <span className="text-[16px] font-bold text-white">{fmt(finalTotal)}</span>
          </div>

          {/* Payment method + amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Payment method
              </label>
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white"
              >
                <option value="cash">Cash</option>
                <option value="mpesa">M-Pesa (manual)</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="ota">OTA (Airbnb/Booking paid)</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Amount paid now
              </label>
              <input
                type="number"
                min={0}
                max={finalTotal}
                value={form.amount_paid}
                onChange={(e) =>
                  setForm({ ...form, amount_paid: parseFloat(e.target.value) || 0 })
                }
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Balance */}
          {balance > 0 && (
            <div className="flex justify-between text-[13px] px-1">
              <span className="text-[#9C9485]">Balance due</span>
              <span className="font-semibold text-[#E8A020]">{fmt(balance)}</span>
            </div>
          )}
          {balance === 0 && finalTotal > 0 && (
            <div className="flex justify-between text-[13px] px-1">
              <span className="text-[#9C9485]">Balance due</span>
              <span className="font-semibold text-[#16A34A]">Paid in full</span>
            </div>
          )}

          {/* Source */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Source
            </label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white"
            >
              <option value="direct">Direct enquiry</option>
              <option value="airbnb">Airbnb</option>
              <option value="booking_com">Booking.com</option>
              <option value="walkin">Walk-in</option>
              <option value="manual">Phone / WhatsApp</option>
            </select>
          </div>

          {/* Special requests */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Special requests
            </label>
            <textarea
              value={form.guest_notes}
              onChange={(e) => setForm({ ...form, guest_notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors resize-none"
              placeholder="Late arrival, dietary needs, transport from airport..."
            />
          </div>

          {/* Internal notes */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Internal notes
            </label>
            <p className="text-[10px] text-[#9C9485] mb-1">Only you can see this</p>
            <textarea
              value={form.internal_notes}
              onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors resize-none"
              placeholder="Private notes..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-[13px] text-red-700 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || isUnavailable}
            className="w-full h-[48px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Confirming..." : "Confirm booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
