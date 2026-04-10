"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ui/PhoneInput";
import type { RestaurantArea } from "./ReservationSheet";

/* ── Shared pure utilities (mirrors ReservationSheet) ─────────────────────── */

/* ── Time string helpers ─────────────────────────────────────────────────── */

function timeStrToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function getTodayNairobi(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDateChip(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T09:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
  });
  const parts = fmt.formatToParts(d);
  return {
    weekday: parts.find((p) => p.type === "weekday")?.value ?? "",
    day: parts.find((p) => p.type === "day")?.value ?? "",
  };
}

interface TimeSlot {
  value: string;
  label: string;
  disabled: boolean;
}

function generateTimeSlots(
  dateStr: string,
  openTimeStr: string,   // "HH:MM" or "HH:MM:SS"
  closeTimeStr: string,  // "HH:MM" or "HH:MM:SS"
  leadTimeHours: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const cutoffMs = Date.now() + leadTimeHours * 3600 * 1000;
  const todayNairobi = getTodayNairobi();
  const isToday = dateStr === todayNairobi;

  const openMins = timeStrToMinutes(openTimeStr.slice(0, 5));
  const closeMins = timeStrToMinutes(closeTimeStr.slice(0, 5));
  const lastSlotMins = closeMins - 30; // last booking at close - 30 min

  let cursor = openMins;
  while (cursor <= lastSlotMins) {
    const h = Math.floor(cursor / 60);
    const min = cursor % 60;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    let disabled = false;
    if (isToday) {
      const slotMs = new Date(`${dateStr}T${value}:00+03:00`).getTime();
      disabled = slotMs < cutoffMs;
    }
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const label = `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
    slots.push({ value, label, disabled });
    cursor += 30;
  }
  return slots;
}

function formatConfirmation(dateStr: string, timeStr: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(`${dateStr}T${timeStr}:00+03:00`));
}

/* ── Props ─────────────────────────────────────────────────────────────────── */

interface ReservationInlineProps {
  menuId: string;
  menuName: string;
  bookableOpenTime: string;   // "HH:MM" — from menus.reservations_open_time
  bookableCloseTime: string;  // "HH:MM" — from menus.reservations_close_time
  areas: RestaurantArea[];
  maxPartySize: number;
  maxAdvanceDays: number;
  leadTimeHours: number;
  durationMinutes?: number;
  restaurantPhone?: string | null;
  onSuccess?: (reservationId: string) => void;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function ReservationInline({
  menuId,
  menuName,
  bookableOpenTime,
  bookableCloseTime,
  areas,
  maxPartySize,
  maxAdvanceDays,
  leadTimeHours,
  durationMinutes = 90,
  restaurantPhone,
  onSuccess,
}: ReservationInlineProps) {
  /* ── form state ── */
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+254");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  /* ── submission state ── */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");
  const [reservationId, setReservationId] = useState("");

  /* ── date pagination ── */
  const [dateScrollIdx, setDateScrollIdx] = useState(0);
  const DATES_VISIBLE = 4;

  /* ── derived ── */
  const today = getTodayNairobi();

  // All dates available — no per-day closed days in V1.5
  const allDates: string[] = [];
  for (let i = 0; i <= maxAdvanceDays; i++) {
    allDates.push(addDays(today, i));
  }

  const visibleDates = allDates.slice(dateScrollIdx, dateScrollIdx + DATES_VISIBLE);
  const canScrollBack = dateScrollIdx > 0;
  const canScrollFwd = dateScrollIdx + DATES_VISIBLE < allDates.length;
  const timeSlots = date ? generateTimeSlots(date, bookableOpenTime, bookableCloseTime, leadTimeHours) : [];
  const activeAreas = areas.filter((a) => a.is_active ?? true).sort((a, b) => a.display_order - b.display_order);
  const showAreaField = activeAreas.length >= 2;
  const emailValid = email.includes("@") && email.includes(".");
  const canSubmit = !!date && !!time && name.trim().length >= 2 && phone.length >= 8 && emailValid;

  /* ── submit ── */
  const handleSubmit = useCallback(async () => {
    if (!date || !time || !name.trim() || !phone) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/menu/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          guest_name: name.trim(),
          guest_phone: phone,
          guest_email: email.trim() || null,
          party_size: partySize,
          reserved_for: `${date}T${time}:00+03:00`,
          area_id: areaId || null,
          guest_message: message.trim() || null,
          source: "listing",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit reservation");
      setReservationId(data.reservation_id);
      setStep("success");
      onSuccess?.(data.reservation_id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [menuId, date, time, partySize, areaId, name, phone, message, onSuccess]);

  /* ── WhatsApp ── */
  const waPhone = restaurantPhone?.replace(/\D/g, "");
  const waText = reservationId
    ? encodeURIComponent(
        `Hi, I just submitted a reservation for ${partySize} on ${formatConfirmation(date, time)}. Reservation ID: ${reservationId}.`,
      )
    : "";

  /* ── Render ── */
  if (step === "success") {
    return (
      <div className="space-y-4 py-2">
        <div className="flex flex-col items-center gap-3 pt-1">
          <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="size-6 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold text-dark">Reservation submitted!</p>
            <p className="text-[13px] text-text2 mt-0.5">
              We&apos;ll confirm within{" "}
              <span className="text-amber font-semibold">
                {leadTimeHours > 0 ? `${leadTimeHours}h` : "shortly"}
              </span>.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface/50 p-4 space-y-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-text2">Date &amp; time</span>
            <span className="font-semibold text-text text-right max-w-[170px]">{formatConfirmation(date, time)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-text2">Party size</span>
            <span className="font-semibold text-text">{partySize} guests</span>
          </div>
          {areaId && activeAreas.find((a) => a.id === areaId) && (
            <div className="flex justify-between text-[13px]">
              <span className="text-text2">Area</span>
              <span className="font-semibold text-text">{activeAreas.find((a) => a.id === areaId)?.name}</span>
            </div>
          )}
          <div className="flex justify-between text-[13px]">
            <span className="text-text2">Ref</span>
            <span className="font-mono text-[12px] text-text3">{reservationId.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>

        {waPhone && (
          <a
            href={`https://wa.me/${waPhone}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-[42px] rounded-full border border-[#25D366] text-[#25D366] text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#25D366]/5 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Message {menuName}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Date row ──────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2.5">Select a date</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDateScrollIdx((i) => Math.max(0, i - DATES_VISIBLE))}
            disabled={!canScrollBack}
            className="shrink-0 size-7 rounded-full border border-border flex items-center justify-center text-text3 hover:border-dark hover:text-dark transition-colors disabled:opacity-20"
          >
            <ChevronLeft className="size-3.5" />
          </button>

          <div className="flex gap-1.5 flex-1">
            {visibleDates.map((d) => {
              const chip = formatDateChip(d);
              const isSelected = d === date;
              const isToday = d === today;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDate(d); setTime(""); }}
                  className={cn(
                    "flex-1 min-w-0 flex flex-col items-center py-2.5 rounded-[14px] border transition-all text-center",
                    isSelected
                      ? "border-amber bg-amber/10"
                      : "border-border hover:border-amber/40 hover:bg-surface/60",
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wide leading-none mb-1",
                    isSelected ? "text-amber" : "text-text3",
                  )}>
                    {isToday ? "Today" : chip.weekday}
                  </span>
                  <span className={cn(
                    "text-[18px] font-extrabold leading-none",
                    isSelected ? "text-amber" : "text-dark",
                  )}>
                    {chip.day}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setDateScrollIdx((i) => i + DATES_VISIBLE)}
            disabled={!canScrollFwd}
            className="shrink-0 size-7 rounded-full border border-border flex items-center justify-center text-text3 hover:border-dark hover:text-dark transition-colors disabled:opacity-20"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Party size ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border border-border rounded-[14px] px-4 py-3">
        <div>
          <p className="text-[11px] font-bold text-text2 uppercase tracking-wide leading-none mb-0.5">Guests</p>
          <p className="text-[14px] font-semibold text-dark">
            {partySize} {partySize === 1 ? "guest" : "guests"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPartySize((n) => Math.max(1, n - 1))}
            disabled={partySize <= 1}
            className="size-8 rounded-full border border-border flex items-center justify-center text-[16px] text-text2 hover:border-dark transition-colors disabled:opacity-30"
          >
            &minus;
          </button>
          <span className="text-[15px] font-bold w-4 text-center">{partySize}</span>
          <button
            type="button"
            onClick={() => setPartySize((n) => Math.min(maxPartySize, n + 1))}
            disabled={partySize >= maxPartySize}
            className="size-8 rounded-full border border-border flex items-center justify-center text-[16px] text-text2 hover:border-dark transition-colors disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* ── Time picker (appears after date selected) ───────────────────── */}
      {date && (
        <div>
          <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2.5">Select a time</p>
          {timeSlots.length === 0 ? (
            <p className="text-[13px] text-text3">No slots available for this date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  disabled={slot.disabled}
                  onClick={() => setTime(slot.value)}
                  className={cn(
                    "py-2 rounded-[11px] border text-[12px] font-semibold transition-colors",
                    slot.disabled
                      ? "border-border text-text3 opacity-30 cursor-not-allowed"
                      : time === slot.value
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-border hover:border-amber/40 text-text",
                  )}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Area preference ─────────────────────────────────────────────── */}
      {showAreaField && (
        <div>
          <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2">Seating preference</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAreaId(null)}
              className={cn(
                "px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-colors",
                areaId === null
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-border hover:border-amber/40 text-text2",
              )}
            >
              No preference
            </button>
            {activeAreas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAreaId(a.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full border text-[12px] font-semibold transition-colors",
                  areaId === a.id
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-border hover:border-amber/40 text-text2",
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Contact details ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full border border-border rounded-[12px] px-4 py-2.5 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <PhoneInput value={phone} onChange={setPhone} required />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full border border-border rounded-[12px] px-4 py-2.5 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white"
          />
          <p className="text-[11px] text-text3 mt-1">We&apos;ll email your confirmation to this address.</p>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
            Special requests
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Birthday dinner, window table…"
            rows={2}
            className="w-full border border-border rounded-[12px] px-4 py-2.5 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white resize-none"
          />
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {submitError && (
        <div className="rounded-[12px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
          {submitError}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full h-[46px] rounded-full bg-gradient-to-r from-amber to-amber2 text-dark text-[14px] font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? "Submitting…" : "Request reservation"}
      </button>

      <p className="text-[11px] text-text3 text-center leading-relaxed">
        Confirmed once the restaurant approves.
        {leadTimeHours > 0 && ` Book at least ${leadTimeHours}h ahead.`}
      </p>
    </div>
  );
}
