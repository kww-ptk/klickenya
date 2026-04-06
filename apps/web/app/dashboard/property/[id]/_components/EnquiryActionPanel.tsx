"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import type { Enquiry } from "./CalendarGrid";
import type { Booking, Room } from "./CalendarGrid";

/* ---------- Helpers ---------- */

function hoursUntil(iso: string): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

function nightsBetween(a: string, b: string): number {
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function fmt(n: number) {
  return `KSh ${n.toLocaleString()}`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/** Parse key-value lines out of the notes text blob */
function parseNotes(notes: string | null | undefined): Record<string, string> {
  if (!notes) return {};
  const result: Record<string, string> = {};
  for (const line of notes.split("\n")) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    }
  }
  return result;
}

/* ---------- Types ---------- */

interface PropertyFee {
  id: string;
  name: string;
  fee_type: "fixed" | "per_night" | "per_guest" | "percentage";
  amount: number;
  apply_by_default: boolean;
  is_active: boolean;
}

/* ---------- Props ---------- */

interface EnquiryActionPanelProps {
  enquiry: Enquiry;
  rooms: Room[];
  propertyId: string;
  bookings: Booking[];
  onClose: () => void;
  onConverted: (booking: Booking) => void;
  onDeclined: () => void;
  onRoomChanged: (updated: Enquiry) => void;
  onHeld?: () => void;
}

/* ---------- Component ---------- */

export function EnquiryActionPanel({
  enquiry,
  rooms,
  propertyId,
  bookings,
  onClose,
  onConverted,
  onDeclined,
  onRoomChanged,
  onHeld,
}: EnquiryActionPanelProps) {
  const { showToast } = useToast();

  // Availability check
  const [availability, setAvailability] = useState<{
    available: boolean;
    conflictBooking?: Booking;
  } | null>(null);

  // Panel action state
  const [action, setAction] = useState<"idle" | "accept" | "decline" | "move" | "hold">("idle");

  // Accept form
  const [ratePerNight, setRatePerNight] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [accepting, setAccepting] = useState(false);

  // Decline form
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  // Move room form
  const [targetRoomId, setTargetRoomId] = useState("");
  const [moving, setMoving] = useState(false);

  // Hold form
  const [holdType, setHoldType] = useState<"soft" | "internal" | "deposit">("soft");
  const [depositAmount, setDepositAmount] = useState("");
  const [holding, setHolding] = useState(false);

  // Fees
  const [fees, setFees] = useState<PropertyFee[]>([]);

  const nights = nightsBetween(enquiry.check_in, enquiry.check_out);
  const parsedNotes = parseNotes(enquiry.notes);
  const firstName = enquiry.full_name.split(" ")[0];
  const expiresInHours = hoursUntil(enquiry.expires_at);
  const currentRoom = rooms.find((r) => r.id === enquiry.room_id);

  // Pre-fill rate from room base price
  useEffect(() => {
    if (currentRoom) {
      setRatePerNight(String(currentRoom.base_price_kes));
    }
  }, [currentRoom]);

  // Fetch property fees
  useEffect(() => {
    fetch(`/api/properties/${propertyId}/fees`)
      .then((r) => r.json())
      .then((d) => setFees((d.fees ?? []).filter((f: PropertyFee) => f.is_active)))
      .catch(() => {});
  }, [propertyId]);

  // Check availability on mount
  useEffect(() => {
    const conflict = bookings.find(
      (b) =>
        b.room_id === enquiry.room_id &&
        b.status !== "cancelled" &&
        b.check_in_date < enquiry.check_out &&
        b.check_out_date > enquiry.check_in
    );
    setAvailability({ available: !conflict, conflictBooking: conflict });
  }, [enquiry, bookings]);

  /* ---- Accept ---- */
  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/properties/enquiries/${enquiry.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate_per_night: Number(ratePerNight),
          payment_method: paymentMethod,
          amount_paid: Number(amountPaid),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to convert");
      showToast("Booking confirmed!", "success");
      onConverted(json.booking);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
    setAccepting(false);
  }

  /* ---- Decline ---- */
  async function handleDecline() {
    setDeclining(true);
    try {
      const res = await fetch(`/api/properties/enquiries/${enquiry.id}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason }),
      });
      if (!res.ok) throw new Error("Failed to decline");
      showToast("Enquiry declined", "success");
      onDeclined();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
    setDeclining(false);
  }

  /* ---- Move room ---- */
  async function handleMoveRoom() {
    if (!targetRoomId) return;
    setMoving(true);
    try {
      const res = await fetch(`/api/properties/enquiries/${enquiry.id}/room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: targetRoomId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to move");
      showToast("Enquiry moved to new room", "success");
      onRoomChanged(json.enquiry);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
    setMoving(false);
  }

  /* ---- Hold ---- */
  async function handleHold() {
    if (holdType === "deposit" && !depositAmount) return;
    setHolding(true);
    try {
      const res = await fetch(`/api/properties/enquiries/${enquiry.id}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hold_type: holdType,
          deposit_amount: holdType === "deposit" ? Number(depositAmount) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to set hold");
      const labels = { soft: "Soft hold set (24h)", internal: "Flagged for follow-up", deposit: "Deposit request sent" };
      showToast(labels[holdType], "success");
      onHeld?.();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error", "error");
    }
    setHolding(false);
  }

  const estimatedTotal = ratePerNight ? Number(ratePerNight) * nights : null;

  // Quotation breakdown
  const quoteRate = Number(ratePerNight) || currentRoom?.base_price_kes || 0;
  const roomSubtotal = quoteRate * nights;
  const guests = enquiry.guests ?? 1;

  function feeAmount(fee: PropertyFee): number {
    switch (fee.fee_type) {
      case "fixed":     return fee.amount;
      case "per_night": return fee.amount * nights;
      case "per_guest": return fee.amount * guests;
      case "percentage": return Math.round(roomSubtotal * fee.amount / 100);
      default:          return 0;
    }
  }

  function feeLabel(fee: PropertyFee): string {
    switch (fee.fee_type) {
      case "per_night":   return `KSh ${fee.amount.toLocaleString()} × ${nights}n`;
      case "per_guest":   return `KSh ${fee.amount.toLocaleString()} × ${guests} guest${guests !== 1 ? "s" : ""}`;
      case "percentage":  return `${fee.amount}% of room`;
      default:            return "";
    }
  }

  const mandatoryFees = fees.filter((f) => f.apply_by_default);
  const optionalFees  = fees.filter((f) => !f.apply_by_default);
  const mandatoryTotal = mandatoryFees.reduce((s, f) => s + feeAmount(f), 0);
  const grandTotal = roomSubtotal + mandatoryTotal;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2DDD5] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-[16px]">📋</span>
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#16130C] truncate">{firstName} · Enquiry</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Pending
                </span>
                <span className="text-[10px] text-[#9C9485]">
                  Expires in {expiresInHours}h
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg hover:bg-[#F4F1EC] transition-colors shrink-0 ml-2"
          >
            <svg className="size-4 text-[#9C9485]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Guest details */}
          <div className="bg-[#FAFAF8] rounded-xl border border-[#E2DDD5] p-4 space-y-2">
            <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">Guest</p>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#16130C]">{enquiry.full_name}</span>
            </div>
            {enquiry.email && (
              <a href={`mailto:${enquiry.email}`} className="block text-[12px] text-[#4F46E5] hover:underline truncate">
                {enquiry.email}
              </a>
            )}
            {enquiry.phone && (
              <a href={`tel:${enquiry.phone}`} className="block text-[12px] text-[#16130C] hover:text-[#4F46E5]">
                📱 {enquiry.phone}
              </a>
            )}
          </div>

          {/* Request summary */}
          <div className="bg-[#FAFAF8] rounded-xl border border-[#E2DDD5] p-4">
            <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wider mb-3">Request</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Room</span>
                <span className="font-medium text-[#16130C]">{currentRoom?.name ?? enquiry.room_id}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Check-in</span>
                <span className="font-medium text-[#16130C]">{fmtDate(enquiry.check_in)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Check-out</span>
                <span className="font-medium text-[#16130C]">{fmtDate(enquiry.check_out)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#9C9485]">Nights</span>
                <span className="font-medium text-[#16130C]">{nights}</span>
              </div>
              {(enquiry.guests ?? parsedNotes["Guests"]) && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">Guests</span>
                  <span className="font-medium text-[#16130C]">{enquiry.guests ?? parsedNotes["Guests"]}</span>
                </div>
              )}
              {parsedNotes["Estimated total"] && (
                <div className="flex justify-between text-[13px] pt-1 border-t border-[#E2DDD5] mt-1">
                  <span className="text-[#9C9485]">Est. total quoted</span>
                  <span className="font-bold text-[#E8A020]">{parsedNotes["Estimated total"]}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quotation summary */}
          {quoteRate > 0 && (
            <div className="bg-[#FAFAF8] rounded-xl border border-[#E2DDD5] p-4">
              <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wider mb-3">Quotation</p>
              <div className="space-y-1.5">

                {/* Room subtotal */}
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#9C9485]">
                    {fmt(quoteRate)} × {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                  <span className="font-medium text-[#16130C]">{fmt(roomSubtotal)}</span>
                </div>

                {/* Mandatory fees */}
                {mandatoryFees.map((fee) => (
                  <div key={fee.id} className="flex justify-between text-[13px]">
                    <span className="text-[#9C9485]">
                      {fee.name}
                      {feeLabel(fee) && (
                        <span className="text-[10px] ml-1 text-[#C5BFB5]">({feeLabel(fee)})</span>
                      )}
                    </span>
                    <span className="font-medium text-[#16130C]">{fmt(feeAmount(fee))}</span>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-between text-[13px] pt-2 mt-1 border-t border-[#E2DDD5]">
                  <span className="font-bold text-[#16130C]">Total</span>
                  <span className="font-bold text-[#16130C]">{fmt(grandTotal)}</span>
                </div>

                {/* Optional fees */}
                {optionalFees.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-[#E2DDD5] space-y-1.5">
                    <p className="text-[10px] text-[#9C9485] font-medium">Optional add-ons</p>
                    {optionalFees.map((fee) => (
                      <div key={fee.id} className="flex justify-between text-[12px]">
                        <span className="text-[#9C9485]">
                          {fee.name}
                          {feeLabel(fee) && (
                            <span className="text-[10px] ml-1 text-[#C5BFB5]">({feeLabel(fee)})</span>
                          )}
                        </span>
                        <span className="text-[#9C9485]">{fmt(feeAmount(fee))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Availability status */}
          {availability && (
            <div className={`rounded-xl border p-3 flex items-start gap-2.5 ${availability.available ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <span className="text-[16px] shrink-0">{availability.available ? "✅" : "⚠️"}</span>
              <div>
                <p className={`text-[12px] font-semibold ${availability.available ? "text-green-700" : "text-red-700"}`}>
                  {availability.available ? "Room available for these dates" : "Conflicts with existing booking"}
                </p>
                {availability.conflictBooking && (
                  <p className="text-[11px] text-red-600 mt-0.5">
                    {availability.conflictBooking.guest_name} · {availability.conflictBooking.check_in_date} → {availability.conflictBooking.check_out_date}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── ACCEPT form ── */}
          {action === "accept" && (
            <div className="bg-white rounded-xl border border-[#4F46E5]/30 p-4 space-y-3">
              <p className="text-[12px] font-bold text-[#4F46E5] uppercase tracking-wider">Confirm booking</p>
              <div>
                <label className="block text-[11px] text-[#9C9485] mb-1">Rate per night (KSh)</label>
                <input
                  type="number"
                  value={ratePerNight}
                  onChange={(e) => setRatePerNight(e.target.value)}
                  className="w-full border border-[#E2DDD5] rounded-lg px-3 py-2 text-[13px] text-[#16130C] outline-none focus:border-[#4F46E5]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#9C9485] mb-1">Payment method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-[#E2DDD5] rounded-lg px-3 py-2 text-[13px] text-[#16130C] outline-none focus:border-[#4F46E5]"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#9C9485] mb-1">Amount paid now (KSh)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full border border-[#E2DDD5] rounded-lg px-3 py-2 text-[13px] text-[#16130C] outline-none focus:border-[#4F46E5]"
                />
              </div>
              {estimatedTotal !== null && (
                <div className="flex justify-between items-center pt-1 border-t border-[#E2DDD5]">
                  <span className="text-[12px] text-[#9C9485]">Total ({nights}n × {fmt(Number(ratePerNight))})</span>
                  <span className="text-[14px] font-bold text-[#16130C]">{fmt(estimatedTotal)}</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAction("idle")}
                  className="flex-1 py-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccept}
                  disabled={accepting || !ratePerNight}
                  className="flex-1 py-2 rounded-lg bg-[#4F46E5] text-white text-[13px] font-bold hover:bg-[#4338CA] transition-colors disabled:opacity-50"
                >
                  {accepting ? "Confirming…" : "Confirm booking"}
                </button>
              </div>
            </div>
          )}

          {/* ── DECLINE form ── */}
          {action === "decline" && (
            <div className="bg-white rounded-xl border border-red-200 p-4 space-y-3">
              <p className="text-[12px] font-bold text-red-600 uppercase tracking-wider">Decline enquiry</p>
              <textarea
                placeholder="Optional: reason to share with guest"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                className="w-full border border-[#E2DDD5] rounded-lg px-3 py-2 text-[13px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-red-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setAction("idle")}
                  className="flex-1 py-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDecline}
                  disabled={declining}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {declining ? "Declining…" : "Decline enquiry"}
                </button>
              </div>
            </div>
          )}

          {/* ── HOLD form ── */}
          {action === "hold" && (
            <div className="bg-white rounded-xl border border-[#E8A020]/40 p-4 space-y-3">
              <p className="text-[12px] font-bold text-[#E8A020] uppercase tracking-wider">Hold enquiry</p>
              <div className="space-y-2">
                {/* Soft hold */}
                <button
                  onClick={() => setHoldType("soft")}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${holdType === "soft" ? "border-[#E8A020] bg-[#FFFBEB]" : "border-[#E2DDD5] hover:border-[#E8A020]/40"}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[18px] shrink-0">🔒</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C]">Soft hold (24h)</p>
                      <p className="text-[11px] text-[#9C9485] mt-0.5">Block this room for 24 hours while you confirm with the guest. Auto-releases if not converted.</p>
                    </div>
                  </div>
                </button>
                {/* Internal note */}
                <button
                  onClick={() => setHoldType("internal")}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${holdType === "internal" ? "border-[#E8A020] bg-[#FFFBEB]" : "border-[#E2DDD5] hover:border-[#E8A020]/40"}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[18px] shrink-0">📌</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C]">Internal note</p>
                      <p className="text-[11px] text-[#9C9485] mt-0.5">Flag this enquiry for follow-up. Room stays available for other bookings.</p>
                    </div>
                  </div>
                </button>
                {/* Awaiting deposit */}
                <button
                  onClick={() => setHoldType("deposit")}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${holdType === "deposit" ? "border-[#E8A020] bg-[#FFFBEB]" : "border-[#E2DDD5] hover:border-[#E8A020]/40"}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[18px] shrink-0">💳</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#16130C]">Awaiting deposit</p>
                      <p className="text-[11px] text-[#9C9485] mt-0.5">Request a deposit from the guest before confirming.</p>
                    </div>
                  </div>
                </button>
                {holdType === "deposit" && (
                  <div className="pt-1">
                    <label className="block text-[11px] text-[#9C9485] mb-1">Deposit amount (KSh)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full border border-[#E2DDD5] rounded-lg px-3 py-2 text-[13px] text-[#16130C] outline-none focus:border-[#E8A020]"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAction("idle")}
                  className="flex-1 py-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHold}
                  disabled={holding || (holdType === "deposit" && !depositAmount)}
                  className="flex-1 py-2 rounded-lg bg-[#E8A020] text-white text-[13px] font-bold hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                >
                  {holding ? "Saving…" : holdType === "soft" ? "Set 24h hold" : holdType === "internal" ? "Flag for follow-up" : "Send deposit request"}
                </button>
              </div>
            </div>
          )}

          {/* ── MOVE ROOM form ── */}
          {action === "move" && (
            <div className="bg-white rounded-xl border border-[#E2DDD5] p-4 space-y-3">
              <p className="text-[12px] font-bold text-[#9C9485] uppercase tracking-wider">Move to different room</p>
              <div className="space-y-2">
                {rooms
                  .filter((r) => r.id !== enquiry.room_id)
                  .map((r) => {
                    const hasConflict = bookings.some(
                      (b) =>
                        b.room_id === r.id &&
                        b.status !== "cancelled" &&
                        b.check_in_date < enquiry.check_out &&
                        b.check_out_date > enquiry.check_in
                    );
                    return (
                      <button
                        key={r.id}
                        onClick={() => setTargetRoomId(r.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                          targetRoomId === r.id
                            ? "border-[#4F46E5] bg-[#4F46E5]/5"
                            : "border-[#E2DDD5] hover:border-[#4F46E5]/50"
                        }`}
                      >
                        <span className="text-[13px] font-medium text-[#16130C]">{r.name}</span>
                        {hasConflict ? (
                          <span className="text-[10px] text-red-600 font-semibold">Conflict</span>
                        ) : (
                          <span className="text-[10px] text-green-600 font-semibold">Available</span>
                        )}
                      </button>
                    );
                  })}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setAction("idle")}
                  className="flex-1 py-2 rounded-lg border border-[#E2DDD5] text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveRoom}
                  disabled={moving || !targetRoomId}
                  className="flex-1 py-2 rounded-lg bg-[#16130C] text-white text-[13px] font-bold hover:bg-[#2A2416] transition-colors disabled:opacity-50"
                >
                  {moving ? "Moving…" : "Move room"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {action === "idle" && (
          <div className="shrink-0 border-t border-[#E2DDD5] px-5 pt-3 pb-4 space-y-2">
            <button
              onClick={() => setAction("accept")}
              disabled={!availability?.available}
              className="w-full py-3 rounded-xl bg-[#4F46E5] text-white text-[14px] font-bold hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Accept — convert to booking
            </button>
            <button
              onClick={() => setAction("hold")}
              className="w-full py-2.5 rounded-xl border-2 border-[#E8A020]/50 text-[13px] font-semibold text-[#E8A020] hover:bg-[#FFFBEB] transition-colors"
            >
              🔒 Hold
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setAction("move")}
                className="flex-1 py-2.5 rounded-xl border border-[#E2DDD5] text-[13px] font-semibold text-[#5E5848] hover:border-[#9C9485] transition-colors"
              >
                Move room
              </button>
              <button
                onClick={() => setAction("decline")}
                className="flex-1 py-2.5 rounded-xl border border-red-200 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
