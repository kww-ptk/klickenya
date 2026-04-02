"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Room {
  id: string;
  name: string;
  room_number: string | null;
  max_guests: number;
  base_price_kes: number;
}

interface NewBookingSidePanelProps {
  roomId: string;
  date: string;
  rooms: Room[];
  propertyId: string;
  onClose: () => void;
  onCreated: (booking: any) => void;
}

export function NewBookingSidePanel({
  roomId,
  date,
  rooms,
  propertyId,
  onClose,
  onCreated,
}: NewBookingSidePanelProps) {
  const room = rooms.find((r) => r.id === roomId);
  const defaultCheckOut = (() => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_count: 1,
    check_in_date: date,
    check_out_date: defaultCheckOut,
    rate_per_night: room?.base_price_kes ?? 0,
    source: "direct" as string,
    guest_notes: "",
    internal_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights = Math.max(
    0,
    Math.floor(
      (new Date(form.check_out_date + "T00:00:00").getTime() -
        new Date(form.check_in_date + "T00:00:00").getTime()) /
        86400000
    )
  );
  const subtotal = nights * form.rate_per_night;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guest_name.trim()) {
      setError("Guest name is required");
      return;
    }
    if (nights <= 0) {
      setError("Check-out must be after check-in");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("bookings")
      .insert({
        property_id: propertyId,
        room_id: roomId,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim() || null,
        guest_phone: form.guest_phone.trim() || null,
        guest_count: form.guest_count,
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        rate_per_night: form.rate_per_night,
        subtotal_kes: subtotal,
        total_kes: subtotal,
        source: form.source,
        guest_notes: form.guest_notes.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        status: "confirmed",
        payment_status: "pending",
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    onCreated(data);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 0 }).format(n);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[420px] bg-white h-full overflow-y-auto shadow-xl">
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
          {/* Room info */}
          <div className="bg-[#4F46E5]/5 rounded-lg p-3">
            <p className="text-[12px] font-semibold text-[#4F46E5]">
              {room?.name ?? "Room"}
              {room?.room_number ? ` (#${room.room_number})` : ""}
            </p>
            <p className="text-[11px] text-[#9C9485]">
              Max {room?.max_guests ?? 2} guests · {fmt(room?.base_price_kes ?? 0)} / night
            </p>
          </div>

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

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.guest_email}
                onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                placeholder="email@..."
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.guest_phone}
                onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                placeholder="+254..."
              />
            </div>
          </div>

          {/* Guests count */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Number of guests
            </label>
            <input
              type="number"
              min={1}
              max={room?.max_guests ?? 20}
              value={form.guest_count}
              onChange={(e) =>
                setForm({ ...form, guest_count: parseInt(e.target.value) || 1 })
              }
              className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Check-in
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
                Check-out
              </label>
              <input
                type="date"
                value={form.check_out_date}
                onChange={(e) => setForm({ ...form, check_out_date: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
          </div>

          {/* Rate + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Rate / night (KSh)
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
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Source
              </label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white"
              >
                <option value="direct">Direct</option>
                <option value="airbnb">Airbnb</option>
                <option value="booking_com">Booking.com</option>
                <option value="manual">Manual</option>
                <option value="walkin">Walk-in</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#F4F1EC] rounded-lg p-3">
            <div className="flex justify-between text-[13px] mb-1">
              <span className="text-[#5E5848]">
                {fmt(form.rate_per_night)} × {nights} night{nights !== 1 ? "s" : ""}
              </span>
              <span className="font-semibold text-[#16130C]">{fmt(subtotal)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Guest notes
            </label>
            <textarea
              value={form.guest_notes}
              onChange={(e) => setForm({ ...form, guest_notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors resize-none"
              placeholder="Arriving late, allergies..."
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Internal notes
            </label>
            <textarea
              value={form.internal_notes}
              onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors resize-none"
              placeholder="Private notes..."
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
