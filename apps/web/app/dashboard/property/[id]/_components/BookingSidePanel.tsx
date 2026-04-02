"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Room {
  id: string;
  name: string;
  room_number: string | null;
}

interface Booking {
  id: string;
  room_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  guest_count: number | null;
  guest_notes: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number | null;
  source: string;
  external_id: string | null;
  rate_per_night: number;
  subtotal_kes: number;
  discount_kes: number | null;
  extras_kes: number | null;
  total_kes: number;
  amount_paid_kes: number | null;
  balance_kes: number | null;
  status: string;
  payment_status: string | null;
  mpesa_ref: string | null;
  internal_notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-[#4F46E5] bg-[#4F46E5]/10" },
  checked_in: { label: "Checked In", color: "text-[#16A34A] bg-[#16A34A]/10" },
  checked_out: { label: "Checked Out", color: "text-[#9C9485] bg-[#9C9485]/10" },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-100" },
  no_show: { label: "No Show", color: "text-red-600 bg-red-100" },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-[#E8A020] bg-[#E8A020]/10" },
  partial: { label: "Partial", color: "text-[#E8A020] bg-[#E8A020]/10" },
  paid: { label: "Paid", color: "text-[#16A34A] bg-[#16A34A]/10" },
  refunded: { label: "Refunded", color: "text-red-600 bg-red-100" },
};

export function BookingSidePanel({
  booking,
  rooms,
  propertyId,
  onClose,
}: {
  booking: Booking;
  rooms: Room[];
  propertyId: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(booking.status);
  const [saving, setSaving] = useState(false);
  const room = rooms.find((r) => r.id === booking.room_id);
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.confirmed;
  const paymentInfo = PAYMENT_LABELS[booking.payment_status ?? "pending"] ?? PAYMENT_LABELS.pending;

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", booking.id)
      .eq("property_id", propertyId);
    setStatus(newStatus);
    setSaving(false);
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
            Booking Details
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

        <div className="p-5 space-y-5">
          {/* Guest Info */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
              Guest
            </h3>
            <p className="text-[15px] font-semibold text-[#16130C]">
              {booking.guest_name}
            </p>
            {booking.guest_email && (
              <p className="text-[13px] text-[#5E5848]">{booking.guest_email}</p>
            )}
            {booking.guest_phone && (
              <p className="text-[13px] text-[#5E5848]">{booking.guest_phone}</p>
            )}
            {booking.guest_count && booking.guest_count > 1 && (
              <p className="text-[12px] text-[#9C9485] mt-1">{booking.guest_count} guests</p>
            )}
          </div>

          {/* Stay details */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
              Stay
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Room</span>
                <span className="font-medium text-[#16130C]">
                  {room?.name ?? "—"}
                  {room?.room_number ? ` (#${room.room_number})` : ""}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Check-in</span>
                <span className="font-medium text-[#16130C]">
                  {new Date(booking.check_in_date + "T00:00:00").toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Check-out</span>
                <span className="font-medium text-[#16130C]">
                  {new Date(booking.check_out_date + "T00:00:00").toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Nights</span>
                <span className="font-medium text-[#16130C]">{booking.nights ?? "—"}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Source</span>
                <span className="font-medium text-[#16130C] capitalize">
                  {booking.source === "booking_com" ? "Booking.com" : booking.source}
                </span>
              </div>
              {booking.external_id && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">External ID</span>
                  <span className="font-mono text-[12px] text-[#5E5848]">{booking.external_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financials */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
              Financials
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Rate / night</span>
                <span className="font-medium text-[#16130C]">{fmt(booking.rate_per_night)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Subtotal</span>
                <span className="font-medium text-[#16130C]">{fmt(booking.subtotal_kes)}</span>
              </div>
              {(booking.discount_kes ?? 0) > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">Discount</span>
                  <span className="font-medium text-[#16A34A]">-{fmt(booking.discount_kes!)}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px] pt-1.5 border-t border-[#E2DDD5]">
                <span className="font-semibold text-[#16130C]">Total</span>
                <span className="font-bold text-[#16130C]">{fmt(booking.total_kes)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Paid</span>
                <span className="font-medium text-[#16130C]">{fmt(booking.amount_paid_kes ?? 0)}</span>
              </div>
              {(booking.balance_kes ?? 0) > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">Balance</span>
                  <span className="font-semibold text-[#E8A020]">{fmt(booking.balance_kes!)}</span>
                </div>
              )}
              {booking.mpesa_ref && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">M-Pesa ref</span>
                  <span className="font-mono text-[12px] text-[#5E5848]">{booking.mpesa_ref}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
              Status
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className={`inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full ${paymentInfo.color}`}>
                {paymentInfo.label}
              </span>
            </div>

            {/* Status action buttons */}
            <div className="flex flex-wrap gap-2">
              {status === "confirmed" && (
                <button
                  onClick={() => updateStatus("checked_in")}
                  disabled={saving}
                  className="text-[12px] font-semibold text-white bg-[#16A34A] px-3 h-[32px] rounded-lg hover:bg-[#15803D] transition-colors disabled:opacity-50"
                >
                  Check in
                </button>
              )}
              {status === "checked_in" && (
                <button
                  onClick={() => updateStatus("checked_out")}
                  disabled={saving}
                  className="text-[12px] font-semibold text-white bg-[#5E5848] px-3 h-[32px] rounded-lg hover:bg-[#16130C] transition-colors disabled:opacity-50"
                >
                  Check out
                </button>
              )}
              {(status === "confirmed" || status === "checked_in") && (
                <button
                  onClick={() => updateStatus("cancelled")}
                  disabled={saving}
                  className="text-[12px] font-semibold text-red-600 bg-red-50 px-3 h-[32px] rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              {status === "confirmed" && (
                <button
                  onClick={() => updateStatus("no_show")}
                  disabled={saving}
                  className="text-[12px] font-semibold text-[#9C9485] bg-[#F4F1EC] px-3 h-[32px] rounded-lg hover:bg-[#E2DDD5] transition-colors disabled:opacity-50"
                >
                  No show
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          {(booking.guest_notes || booking.internal_notes) && (
            <div>
              <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
                Notes
              </h3>
              {booking.guest_notes && (
                <p className="text-[13px] text-[#5E5848] mb-1">
                  <span className="font-medium">Guest:</span> {booking.guest_notes}
                </p>
              )}
              {booking.internal_notes && (
                <p className="text-[13px] text-[#5E5848]">
                  <span className="font-medium">Internal:</span> {booking.internal_notes}
                </p>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="pt-3 border-t border-[#E2DDD5]">
            <p className="text-[11px] text-[#9C9485]">
              Booked {new Date(booking.created_at).toLocaleDateString("en-GB", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
