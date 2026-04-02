"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";

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

interface Payment {
  id: string;
  amount_kes: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
}

/* ---------- Constants ---------- */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: "text-[#4F46E5] bg-[#4F46E5]/10" },
  checked_in: { label: "Checked In", color: "text-[#16A34A] bg-[#16A34A]/10" },
  checked_out: { label: "Checked Out", color: "text-[#9C9485] bg-[#9C9485]/10" },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-100" },
  no_show: { label: "No Show", color: "text-red-600 bg-red-100" },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-[#E8A020] bg-[#E8A020]/10" },
  partial: { label: "Partial", color: "text-[#E8A020] bg-[#E8A020]/10" },
  paid: { label: "Paid", color: "text-[#16A34A] bg-[#16A34A]/10" },
  refunded: { label: "Refunded", color: "text-red-600 bg-red-100" },
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  manual: "Phone/WhatsApp",
  walkin: "Walk-in",
};

const SOURCE_COLORS: Record<string, string> = {
  direct: "text-[#4F46E5] bg-[#4F46E5]/10",
  airbnb: "text-[#FF5A5F] bg-[#FF5A5F]/10",
  booking_com: "text-[#003580] bg-[#003580]/10",
  manual: "text-[#E8A020] bg-[#E8A020]/10",
  walkin: "text-[#E8A020] bg-[#E8A020]/10",
};

const METHOD_ICONS: Record<string, string> = {
  cash: "\uD83D\uDCB5",
  mpesa: "\uD83D\uDCF1",
  bank_transfer: "\uD83C\uDFE6",
  card: "\uD83D\uDCB3",
  ota: "\uD83C\uDF10",
};

/* ---------- Component ---------- */

export function BookingSidePanel({
  booking: initialBooking,
  rooms,
  propertyId,
  onClose,
  onBookingUpdated,
}: {
  booking: Booking;
  rooms: Room[];
  propertyId: string;
  onClose: () => void;
  onBookingUpdated?: (booking: Booking) => void;
}) {
  const { showToast } = useToast();
  const [booking, setBooking] = useState(initialBooking);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [internalNotes, setInternalNotes] = useState(booking.internal_notes ?? "");
  const notesTimeout = useRef<NodeJS.Timeout | null>(null);

  const room = rooms.find((r) => r.id === booking.room_id);
  const statusInfo = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.confirmed;
  const paymentInfo = PAYMENT_CONFIG[booking.payment_status ?? "pending"] ?? PAYMENT_CONFIG.pending;
  const sourceInfo = SOURCE_LABELS[booking.source] ?? booking.source;
  const sourceColor = SOURCE_COLORS[booking.source] ?? SOURCE_COLORS.direct;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(n);

  /* --- Fetch payment history --- */
  useEffect(() => {
    (async () => {
      try {
        // Use the pay endpoint with GET-like behavior via a dedicated fetch
        const res = await fetch(
          `/api/properties/bookings/${booking.id}/pay`,
          { method: "GET" }
        );
        // The pay endpoint is POST only, so we fetch payments via a workaround:
        // We'll just load them client-side from Supabase
        // Actually, let's import createClient here
      } catch {
        // ignore
      }
    })();

    // Fetch payments client-side
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("booking_payments")
        .select("id, amount_kes, method, reference, notes, paid_at")
        .eq("booking_id", booking.id)
        .order("paid_at", { ascending: true });
      setPayments(data ?? []);
      setLoadingPayments(false);
    })();
  }, [booking.id]);

  /* --- Update status via API --- */
  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.booking) {
        setBooking(data.booking);
        onBookingUpdated?.(data.booking);
        showToast(
          newStatus === "checked_in"
            ? `${booking.guest_name} checked in`
            : newStatus === "checked_out"
              ? `${booking.guest_name} checked out`
              : newStatus === "cancelled"
                ? "Booking cancelled"
                : "Status updated",
          "success"
        );
      } else {
        showToast(data.error ?? "Failed to update status", "error");
      }
    } catch {
      showToast("Network error", "error");
    }
    setSaving(false);
    setShowCancelConfirm(false);
  };

  /* --- Auto-save internal notes on blur --- */
  const saveNotes = useCallback(async () => {
    if (internalNotes === (booking.internal_notes ?? "")) return;
    try {
      const res = await fetch(`/api/properties/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internal_notes: internalNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.booking) {
          setBooking(data.booking);
          onBookingUpdated?.(data.booking);
        }
      }
    } catch {
      // silent
    }
  }, [booking.id, booking.internal_notes, internalNotes]);

  const handleNotesBlur = () => {
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    saveNotes();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-[440px] bg-white h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E2DDD5] px-5 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-[20px] font-bold text-[#16130C] truncate">
                {booking.guest_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${sourceColor}`}>
                  {sourceInfo}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-lg hover:bg-[#F4F1EC] transition-colors shrink-0"
            >
              <svg className="size-5 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Booking summary */}
          <div className="bg-[#FAFAF8] rounded-lg p-3">
            <p className="text-[13px] text-[#16130C]">
              <span className="font-semibold">
                {new Date(booking.check_in_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </span>
              {" → "}
              <span className="font-semibold">
                {new Date(booking.check_out_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </p>
            <p className="text-[12px] text-[#9C9485] mt-0.5">
              {booking.nights ?? "—"} night{(booking.nights ?? 0) !== 1 ? "s" : ""}
              {" · "}
              {booking.guest_count ?? 1} guest{(booking.guest_count ?? 1) !== 1 ? "s" : ""}
              {" · "}
              {room?.name ?? "—"}
              {room?.room_number ? ` (#${room.room_number})` : ""}
            </p>
          </div>

          {/* Financial summary */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
              Financials
            </h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Rate</span>
                <span className="text-[#16130C]">{fmt(booking.rate_per_night)} / night</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Subtotal</span>
                <span className="text-[#16130C]">{fmt(booking.subtotal_kes)}</span>
              </div>
              {(booking.discount_kes ?? 0) > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">Discount</span>
                  <span className="text-[#16A34A]">-{fmt(booking.discount_kes!)}</span>
                </div>
              )}
              <div className="flex justify-between text-[13px] pt-1.5 border-t border-[#E2DDD5]">
                <span className="font-semibold text-[#16130C]">Total</span>
                <span className="font-bold text-[#16130C]">{fmt(booking.total_kes)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Paid</span>
                <span className="font-medium text-[#16A34A]">{fmt(booking.amount_paid_kes ?? 0)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Balance</span>
                <span className={`font-semibold ${(booking.balance_kes ?? 0) > 0 ? "text-red-600" : "text-[#16A34A]"}`}>
                  {(booking.balance_kes ?? 0) > 0 ? fmt(booking.balance_kes!) : "Paid in full"}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentInfo.color}`}>
                  {paymentInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Payment history */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider">
                Payment history
              </h3>
              {booking.status !== "cancelled" && (
                <button
                  onClick={() => setShowPayForm(!showPayForm)}
                  className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]"
                >
                  {showPayForm ? "Cancel" : "+ Record payment"}
                </button>
              )}
            </div>

            {loadingPayments ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-[#F4F1EC] rounded" />
                <div className="h-8 bg-[#F4F1EC] rounded" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-[12px] text-[#9C9485]">No payments recorded</p>
            ) : (
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-[#FAFAF8] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[14px]">{METHOD_ICONS[p.method] ?? "💰"}</span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-[#16130C]">
                          {fmt(p.amount_kes)}
                          <span className="font-normal text-[#9C9485] ml-1 capitalize">
                            {p.method === "bank_transfer" ? "Bank" : p.method === "mpesa" ? "M-Pesa" : p.method}
                          </span>
                        </p>
                        {p.reference && (
                          <p className="text-[10px] text-[#9C9485] font-mono truncate">
                            ref: {p.reference}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#9C9485] shrink-0">
                      {new Date(p.paid_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Record payment form */}
            {showPayForm && (
              <RecordPaymentForm
                bookingId={booking.id}
                balance={booking.balance_kes ?? 0}
                onSuccess={(updatedBooking, newPayment, allPayments) => {
                  setBooking(updatedBooking);
                  onBookingUpdated?.(updatedBooking);
                  setPayments(allPayments);
                  setShowPayForm(false);
                  showToast(`${fmt(newPayment.amount_kes)} payment recorded`, "success");
                }}
                onError={(msg) => showToast(msg, "error")}
              />
            )}
          </div>

          {/* Guest details */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
              Guest details
            </h3>
            <div className="space-y-1.5">
              {booking.guest_phone && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">Phone</span>
                  <a
                    href={`tel:${booking.guest_phone}`}
                    className="font-medium text-[#4F46E5] hover:underline"
                  >
                    {booking.guest_phone}
                  </a>
                </div>
              )}
              {booking.guest_email && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">Email</span>
                  <a
                    href={`mailto:${booking.guest_email}`}
                    className="font-medium text-[#4F46E5] hover:underline truncate ml-3"
                  >
                    {booking.guest_email}
                  </a>
                </div>
              )}
              {booking.guest_notes && (
                <div className="mt-2">
                  <p className="text-[11px] text-[#9C9485] mb-0.5">Special requests</p>
                  <p className="text-[13px] text-[#5E5848] bg-[#FAFAF8] rounded-lg p-2">
                    {booking.guest_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Internal notes */}
          <div>
            <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-1">
              Internal notes
            </h3>
            <p className="text-[10px] text-[#9C9485] mb-1">Only you can see this</p>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors resize-none"
              placeholder="Add private notes about this booking..."
            />
          </div>

          {/* Actions */}
          {booking.status !== "cancelled" && booking.status !== "checked_out" && (
            <div>
              <h3 className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
                Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                {booking.status === "confirmed" && (
                  <button
                    onClick={() => updateStatus("checked_in")}
                    disabled={saving}
                    className="text-[13px] font-semibold text-white bg-[#16A34A] px-4 h-[36px] rounded-lg hover:bg-[#15803D] transition-colors disabled:opacity-50"
                  >
                    Check in
                  </button>
                )}
                {booking.status === "checked_in" && (
                  <button
                    onClick={() => updateStatus("checked_out")}
                    disabled={saving}
                    className="text-[13px] font-semibold text-white bg-[#5E5848] px-4 h-[36px] rounded-lg hover:bg-[#16130C] transition-colors disabled:opacity-50"
                  >
                    Check out
                  </button>
                )}
                {(booking.status === "confirmed" || booking.status === "checked_in") && !showCancelConfirm && (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={saving}
                    className="text-[13px] font-semibold text-red-600 bg-red-50 px-4 h-[36px] rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Cancel booking
                  </button>
                )}
                {booking.status === "confirmed" && (
                  <button
                    onClick={() => updateStatus("no_show")}
                    disabled={saving}
                    className="text-[13px] font-semibold text-[#9C9485] bg-[#F4F1EC] px-4 h-[36px] rounded-lg hover:bg-[#E2DDD5] transition-colors disabled:opacity-50"
                  >
                    No show
                  </button>
                )}
              </div>

              {/* Cancel confirm */}
              {showCancelConfirm && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-[13px] font-semibold text-red-700 mb-2">
                    Cancel this booking for {booking.guest_name}?
                  </p>
                  <p className="text-[12px] text-red-600 mb-3">
                    This action cannot be undone. The dates will become available again.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus("cancelled")}
                      disabled={saving}
                      className="text-[12px] font-semibold text-white bg-red-600 px-3 h-[32px] rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Cancelling..." : "Yes, cancel"}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="text-[12px] font-semibold text-[#5E5848] bg-white px-3 h-[32px] rounded-lg border border-[#E2DDD5] hover:bg-[#F4F1EC] transition-colors"
                    >
                      Keep booking
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancelled state */}
          {booking.status === "cancelled" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-[13px] font-semibold text-red-700">
                This booking has been cancelled
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-3 border-t border-[#E2DDD5]">
            <p className="text-[11px] text-[#9C9485]">
              Booked{" "}
              {new Date(booking.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {booking.external_id && (
              <p className="text-[11px] text-[#9C9485] mt-0.5">
                External ID: <span className="font-mono">{booking.external_id}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Record Payment Sub-form ---------- */

function RecordPaymentForm({
  bookingId,
  balance,
  onSuccess,
  onError,
}: {
  bookingId: string;
  balance: number;
  onSuccess: (booking: any, payment: Payment, payments: Payment[]) => void;
  onError: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(balance > 0 ? balance : 0);
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(n);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      onError("Amount must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/properties/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_kes: amount,
          method,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess(data.booking, data.payment, data.payments);
      } else {
        onError(data.error ?? "Failed to record payment");
      }
    } catch {
      onError("Network error");
    }
    setSaving(false);
  };

  return (
    <div className="mt-3 bg-[#4F46E5]/5 border border-[#4F46E5]/20 rounded-lg p-3 space-y-3">
      <p className="text-[12px] font-semibold text-[#4F46E5]">Record payment</p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Amount (KSh) *</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] text-[#9C9485] mb-0.5">Method *</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors bg-white"
          >
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-[#9C9485] mb-0.5">Reference</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
          placeholder={method === "mpesa" ? "M-Pesa ref e.g. SH3F2K..." : "Optional reference"}
        />
      </div>

      <div>
        <label className="block text-[11px] text-[#9C9485] mb-0.5">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
          placeholder="Optional"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-[36px] bg-[#4F46E5] text-white font-semibold text-[12px] rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50"
      >
        {saving ? "Saving..." : `Save payment (${fmt(amount)})`}
      </button>
    </div>
  );
}
