"use client";

import { useState, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import PhoneInput from "@/components/ui/PhoneInput";
import { useRouter } from "next/navigation";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface RestaurantArea {
  id: string;
  name: string;
  capacity_total: number;
  color_hex: string | null;
  display_order: number;
  is_active?: boolean; // filtered server-side; field included for type completeness
}

export interface ReservationSheetProps {
  menuId: string;
  menuName: string;
  source: "qr_menu" | "listing";
  defaultOpen?: boolean;
  onSuccess?: (reservationId: string) => void;
  timeWindows: Array<{ open_time: string; close_time: string; is_active?: boolean }>;
  areas: RestaurantArea[];
  maxPartySize: number;
  maxAdvanceDays: number;
  leadTimeHours: number;
  restaurantPhone?: string | null;
  /** Trigger label override; defaults to "Book a table" */
  triggerLabel?: string;
  /** Extra class on the trigger button */
  triggerClassName?: string;
}

/* ── Time string helpers ─────────────────────────────────────────────────── */

function timeStrToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/* ── Date / time helpers (all Nairobi-aware) ─────────────────────────────── */
// All Intl.DateTimeFormat calls use timeZone: 'Africa/Nairobi'. No manual UTC+3.

function getTodayNairobi(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
}

function addDays(dateStr: string, n: number): string {
  // Create date at noon UTC for that date to avoid DST edge cases
  const d = new Date(`${dateStr}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): { weekday: string; day: string; monthDay: string } {
  const d = new Date(`${dateStr}T09:00:00Z`);
  const fmt = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const parts = fmt.formatToParts(d);
  return {
    weekday: parts.find((p) => p.type === "weekday")?.value ?? "",
    day: parts.find((p) => p.type === "day")?.value ?? "",
    monthDay: `${parts.find((p) => p.type === "month")?.value} ${parts.find((p) => p.type === "day")?.value}`,
  };
}

interface TimeSlot {
  value: string; // "HH:MM"
  label: string; // "7:00 PM"
  disabled: boolean;
}

function generateTimeSlots(
  dateStr: string,
  timeWindows: Array<{ open_time: string; close_time: string; is_active?: boolean }>,
  leadTimeHours: number,
): TimeSlot[] {
  const allSlots: TimeSlot[] = [];
  const cutoffMs = Date.now() + leadTimeHours * 3600 * 1000;
  const todayNairobi = getTodayNairobi();
  const isToday = dateStr === todayNairobi;

  // Only use active windows, sorted by open_time
  const activeWindows = timeWindows
    .filter((w) => w.is_active !== false)
    .sort((a, b) => timeStrToMinutes(a.open_time.slice(0, 5)) - timeStrToMinutes(b.open_time.slice(0, 5)));

  for (const w of activeWindows) {
    const openMins = timeStrToMinutes(w.open_time.slice(0, 5));
    const closeMins = timeStrToMinutes(w.close_time.slice(0, 5));
    const lastSlotMins = closeMins - 30;

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
      allSlots.push({ value, label, disabled });
      cursor += 30;
    }
  }

  return allSlots;
}

function formatConfirmationDateTime(dateStr: string, timeStr: string): string {
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

/* ── Sub-components ─────────────────────────────────────────────────────── */

function StepperButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="size-9 rounded-full border border-border flex items-center justify-center text-[18px] text-text2 hover:border-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export function ReservationSheet({
  menuId,
  menuName,
  source,
  defaultOpen = false,
  onSuccess,
  timeWindows,
  areas,
  maxPartySize,
  maxAdvanceDays,
  leadTimeHours,
  restaurantPhone,
  triggerLabel = "Book a table",
  triggerClassName,
}: ReservationSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

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

  /* ── date picker scroll ── */
  const [dateScrollIdx, setDateScrollIdx] = useState(0);
  const DATES_VISIBLE = 5;

  /* ── strip ?action=book from URL when auto-opened ── */
  useEffect(() => {
    if (defaultOpen && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("action") === "book") {
        url.searchParams.delete("action");
        router.replace(url.pathname + (url.search || ""), { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── reset form when sheet closes ── */
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        setDate("");
        setTime("");
        setPartySize(2);
        setAreaId(null);
        setName("");
        setPhone("+254");
        setEmail("");
        setMessage("");
        setSubmitError(null);
        setStep("form");
        setDateScrollIdx(0);
        setReservationId("");
      }
    },
    [],
  );

  /* ── derived data ── */
  const today = getTodayNairobi();

  // All dates available — no per-day closed days in V1.5
  const allDates: string[] = [];
  for (let i = 0; i <= maxAdvanceDays; i++) {
    allDates.push(addDays(today, i));
  }

  const visibleDates = allDates.slice(dateScrollIdx, dateScrollIdx + DATES_VISIBLE);
  const canScrollBack = dateScrollIdx > 0;
  const canScrollFwd = dateScrollIdx + DATES_VISIBLE < allDates.length;

  const timeSlots = date
    ? generateTimeSlots(date, timeWindows, leadTimeHours)
    : [];

  const activeAreas = areas.filter((a) => a.is_active ?? true).sort((a, b) => a.display_order - b.display_order);
  const showAreaField = activeAreas.length >= 2;

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
          guest_email: email.trim().toLowerCase(),
          party_size: partySize,
          reserved_for: `${date}T${time}:00+03:00`,
          area_id: areaId || null,
          guest_message: message.trim() || null,
          source,
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
  }, [menuId, date, time, partySize, areaId, name, phone, email, message, source, onSuccess]);

  /* ── WhatsApp pre-fill ── */
  const waText = reservationId && date && time
    ? encodeURIComponent(
        `Hi, I just submitted a reservation for ${partySize} on ${formatConfirmationDateTime(date, time)}. Reservation ID: ${reservationId}.`,
      )
    : "";

  const waPhone = restaurantPhone?.replace(/\D/g, "");

  /* ── Validation ── */
  const emailValid = email.includes("@") && email.includes(".");
  const canSubmit = !!date && !!time && name.trim().length >= 2 && phone.length >= 8 && emailValid;

  /* ── Render ── */
  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {/* Trigger */}
      <Dialog.Trigger asChild>
        <button
          className={cn(
            "h-[40px] px-5 rounded-full text-[13px] font-bold bg-gradient-to-r from-amber to-amber2 text-dark transition-opacity hover:opacity-90",
            triggerClassName,
          )}
        >
          {triggerLabel}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-dark/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />

        {/* Sheet content — bottom on mobile, centered on desktop */}
        <Dialog.Content
          className={cn(
            // Mobile: slide up from bottom
            "fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-[28px]",
            "max-h-[92dvh] overflow-y-auto overscroll-contain",
            // Desktop: centered modal
            "md:bottom-auto md:top-1/2 md:left-1/2 md:right-auto",
            "md:-translate-x-1/2 md:-translate-y-1/2",
            "md:w-[480px] md:max-h-[88dvh] md:rounded-2xl",
            "focus:outline-none",
          )}
        >
          {/* Handle (mobile only) */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 pb-4 md:pt-5 border-b border-border">
            <Dialog.Title className="font-display text-[18px] font-bold tracking-[-0.02em] text-dark">
              {step === "success" ? "Reservation submitted" : `Book at ${menuName}`}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="flex size-8 items-center justify-center rounded-full text-text3 transition-colors hover:bg-surface hover:text-text"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-5">
            {step === "form" ? (
              <>
                {/* ── Date picker ── */}
                <div>
                  <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2">Date</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDateScrollIdx((i) => Math.max(0, i - DATES_VISIBLE))}
                      disabled={!canScrollBack}
                      className="shrink-0 size-8 rounded-full border border-border flex items-center justify-center text-text2 hover:border-dark transition-colors disabled:opacity-30"
                    >
                      <ChevronLeft className="size-4" />
                    </button>

                    <div className="flex gap-2 overflow-hidden flex-1">
                      {visibleDates.map((d) => {
                        const lbl = formatDateLabel(d);
                        const isSelected = d === date;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => { setDate(d); setTime(""); }}
                            className={cn(
                              "flex-1 min-w-0 flex flex-col items-center py-2.5 rounded-[14px] border transition-colors text-center",
                              isSelected
                                ? "border-amber bg-amber/10 text-amber"
                                : "border-border hover:border-amber/50",
                            )}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{lbl.weekday}</span>
                            <span className={cn("text-[17px] font-bold leading-tight", isSelected ? "text-amber" : "text-dark")}>{lbl.day}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setDateScrollIdx((i) => i + DATES_VISIBLE)}
                      disabled={!canScrollFwd}
                      className="shrink-0 size-8 rounded-full border border-border flex items-center justify-center text-text2 hover:border-dark transition-colors disabled:opacity-30"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {/* ── Time picker ── */}
                {date && (
                  <div>
                    <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2">Time</p>
                    {timeSlots.length === 0 ? (
                      <p className="text-[13px] text-text3">No slots available for this date.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.value}
                            type="button"
                            disabled={slot.disabled}
                            onClick={() => setTime(slot.value)}
                            className={cn(
                              "py-2.5 rounded-[12px] border text-[13px] font-semibold transition-colors",
                              slot.disabled
                                ? "border-border text-text3 opacity-40 cursor-not-allowed"
                                : time === slot.value
                                ? "border-amber bg-amber/10 text-amber"
                                : "border-border hover:border-amber/50 text-text",
                            )}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Party size ── */}
                <div>
                  <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2">Party size</p>
                  <div className="flex items-center justify-between border border-border rounded-[14px] p-3">
                    <div>
                      <span className="text-[14px] text-text">
                        {partySize} {partySize === 1 ? "guest" : "guests"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StepperButton
                        onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                        disabled={partySize <= 1}
                      >
                        &minus;
                      </StepperButton>
                      <span className="text-[15px] font-semibold w-5 text-center">{partySize}</span>
                      <StepperButton
                        onClick={() => setPartySize((n) => Math.min(maxPartySize, n + 1))}
                        disabled={partySize >= maxPartySize}
                      >
                        +
                      </StepperButton>
                    </div>
                  </div>
                  <p className="text-[11px] text-text3 mt-1">Maximum {maxPartySize} guests per reservation</p>
                </div>

                {/* ── Area preference (only if ≥2 active areas) ── */}
                {showAreaField && (
                  <div>
                    <p className="text-[11px] font-bold text-text2 uppercase tracking-wide mb-2">Seating preference</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAreaId(null)}
                        className={cn(
                          "px-4 py-2 rounded-full border text-[13px] font-semibold transition-colors",
                          areaId === null
                            ? "border-amber bg-amber/10 text-amber"
                            : "border-border hover:border-amber/50 text-text2",
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
                            "px-4 py-2 rounded-full border text-[13px] font-semibold transition-colors",
                            areaId === a.id
                              ? "border-amber bg-amber/10 text-amber"
                              : "border-border hover:border-amber/50 text-text2",
                          )}
                        >
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Name ── */}
                <div>
                  <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    required
                    className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white"
                  />
                </div>

                {/* ── Phone ── */}
                <div>
                  <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput value={phone} onChange={setPhone} required />
                </div>

                {/* ── Email ── */}
                <div>
                  <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white"
                  />
                  <p className="text-[11px] text-text3 mt-1">
                    We'll email your confirmation to this address.
                  </p>
                </div>

                {/* ── Message (optional) ── */}
                <div>
                  <label className="block text-[11px] font-bold text-text2 uppercase tracking-wide mb-1">
                    Special requests (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Birthday dinner, window table if possible"
                    rows={3}
                    className="w-full border border-border rounded-[14px] px-4 py-3 text-[14px] text-text placeholder:text-text3 outline-none focus:border-amber transition-colors bg-white resize-none"
                  />
                </div>

                {/* ── Error ── */}
                {submitError && (
                  <div className="rounded-[14px] bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
                    {submitError}
                  </div>
                )}

                {/* ── Submit ── */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="w-full h-[48px] rounded-full bg-gradient-to-r from-amber to-amber2 text-dark text-[14px] font-bold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting…" : "Request reservation"}
                </button>

                <p className="text-[11px] text-text3 text-center">
                  Your reservation is confirmed once the restaurant approves it.
                  {leadTimeHours > 0 && ` Requests must be made at least ${leadTimeHours}h in advance.`}
                </p>
              </>
            ) : (
              /* ── Success screen ── */
              <div className="space-y-5 pb-4">
                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="size-14 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="size-7 text-green-600" />
                  </div>
                  <p className="text-[15px] font-semibold text-text text-center">
                    We&apos;ll confirm your reservation within{" "}
                    <span className="text-amber">{leadTimeHours > 0 ? `${leadTimeHours} hour${leadTimeHours !== 1 ? "s" : ""}` : "shortly"}</span>.
                  </p>
                </div>

                {/* Booking summary card */}
                <div className="rounded-[18px] border border-border bg-surface/50 p-4 space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-text2">Date &amp; time</span>
                    <span className="font-semibold text-text">{formatConfirmationDateTime(date, time)}</span>
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
                    <span className="text-text2">Reservation ID</span>
                    <span className="font-mono text-[12px] text-text3">{reservationId.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                {/* WhatsApp CTA (only if restaurant phone available) */}
                {waPhone && (
                  <a
                    href={`https://wa.me/${waPhone}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-[44px] rounded-full border border-[#25D366] text-[#25D366] text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#25D366]/5 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Message restaurant directly
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="w-full h-[44px] rounded-full bg-surface border border-border text-[13px] font-semibold text-text hover:border-dark transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
