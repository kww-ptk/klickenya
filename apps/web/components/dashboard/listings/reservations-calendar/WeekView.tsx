"use client";

// TODO V2: MonthView.tsx and drag-to-reassign land in V2.

import { useState, useRef, useEffect, useCallback } from "react";

export interface CalendarReservation {
  id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  party_size: number;
  reserved_for: string;
  duration_minutes: number;
  area_id: string | null;
  area_name: string | null;
  area_color_hex: string | null;
  status: string;
  source: string;
  guest_message: string | null;
  owner_note: string | null;
  decline_reason: string | null;
  created_at: string;
}

interface WeekViewProps {
  reservations: CalendarReservation[];
  menuName: string;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  updatingIds: Set<string>;
}

/* ── Constants ── */
const ROW_HEIGHT = 64; // px per hour
const START_HOUR = 12; // 12:00
const END_HOUR = 23;   // 23:00 (last tick)
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

/* ── Nairobi helpers ── */
function getNairobiHourMinute(iso: string): { hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(iso));
  const hour = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  return { hour, minute };
}

function getNairobiDateStr(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(iso));
}

function getMondayOfWeek(): string {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  }).format(new Date(`${todayStr}T09:00:00Z`));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIdx = weekdays.indexOf(weekdayName);
  const daysSinceMonday = (dayIdx + 6) % 7;
  const monday = new Date(`${todayStr}T00:00:00+03:00`);
  monday.setDate(monday.getDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDayHeader(dateStr: string): { weekday: string; day: string } {
  const d = new Date(`${dateStr}T09:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  }).format(d);
  const day = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
  }).format(d);
  return { weekday, day };
}

function formatPopoverTime(iso: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function blockColor(status: string): { bg: string; border: string; text: string } {
  if (status === "pending") return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" };
  if (status === "approved") return { bg: "#DCFCE7", border: "#16A34A", text: "#14532D" };
  return { bg: "#F3F4F6", border: "#9CA3AF", text: "#6B7280" };
}

/* ── Popover ── */
interface PopoverState {
  reservationId: string;
  top: number;
  left: number;
}

/* ── Main component ── */
export function WeekView({ reservations, menuName, onApprove, onDecline, onCancel, updatingIds }: WeekViewProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const mondayStr = getMondayOfWeek();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysToDate(mondayStr, i));

  // Group reservations by date
  const byDate = new Map<string, CalendarReservation[]>();
  for (const r of reservations) {
    const dateStr = getNairobiDateStr(r.reserved_for);
    const existing = byDate.get(dateStr) ?? [];
    existing.push(r);
    byDate.set(dateStr, existing);
  }

  const handleBlockClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (popover?.reservationId === id) {
      setPopover(null);
      return;
    }
    const el = blockRefs.current.get(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      const left = Math.min(rect.left, window.innerWidth - 320);
      const top = rect.bottom + 8;
      setPopover({ reservationId: id, top, left });
    }
  }, [popover]);

  // Close popover on outside click
  useEffect(() => {
    const handler = () => setPopover(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const activeReservation = popover
    ? reservations.find(r => r.id === popover.reservationId) ?? null
    : null;

  const gridHeight = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT;

  return (
    <div>
      {/* Week navigation header */}
      <div className="flex gap-1 mb-4 items-center">
        <span className="text-[13px] font-semibold text-text2">
          Week of {new Intl.DateTimeFormat("en-KE", { month: "short", day: "numeric", timeZone: "Africa/Nairobi" }).format(new Date(`${mondayStr}T09:00:00Z`))}
        </span>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day header row */}
          <div className="flex" style={{ paddingLeft: "44px" }}>
            {weekDays.map((d) => {
              const { weekday, day } = formatDayHeader(d);
              const isToday = d === todayStr;
              return (
                <div key={d} className="flex-1 text-center pb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-amber" : "text-text3"}`}>
                    {weekday}
                  </span>
                  <div className={`text-[15px] font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-amber text-white" : "text-dark"
                  }`}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex" ref={containerRef}>
            {/* Time labels */}
            <div className="shrink-0 w-11 relative" style={{ height: `${gridHeight}px` }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[11px] text-text3 tabular-nums"
                  style={{ top: `${(h - START_HOUR) * ROW_HEIGHT - 6}px` }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((d) => {
              const isToday = d === todayStr;
              const dayReservations = byDate.get(d) ?? [];
              return (
                <div
                  key={d}
                  className={`flex-1 relative border-l border-surface ${isToday ? "bg-[#FFFBF4]" : "bg-white"}`}
                  style={{ height: `${gridHeight}px` }}
                >
                  {/* Hour gridlines */}
                  {HOURS.map((h) => (
                    <div key={h}>
                      {/* Full hour line */}
                      <div
                        className="absolute left-0 right-0 border-t border-surface"
                        style={{ top: `${(h - START_HOUR) * ROW_HEIGHT}px` }}
                      />
                      {/* Half-hour line (dotted) */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-surface"
                        style={{ top: `${(h - START_HOUR) * ROW_HEIGHT + ROW_HEIGHT / 2}px` }}
                      />
                    </div>
                  ))}

                  {/* Reservation blocks */}
                  {dayReservations.map((r) => {
                    const { hour, minute } = getNairobiHourMinute(r.reserved_for);
                    const minutesFromStart = (hour - START_HOUR) * 60 + minute;
                    if (minutesFromStart < 0 || minutesFromStart > (END_HOUR - START_HOUR) * 60) return null;

                    const top = (minutesFromStart / 60) * ROW_HEIGHT;
                    const height = Math.max((r.duration_minutes / 60) * ROW_HEIGHT, 20);
                    const colors = blockColor(r.status);
                    const isSelected = popover?.reservationId === r.id;

                    return (
                      <div
                        key={r.id}
                        ref={(el) => {
                          if (el) blockRefs.current.set(r.id, el);
                          else blockRefs.current.delete(r.id);
                        }}
                        onClick={(e) => handleBlockClick(r.id, e)}
                        className="absolute left-0.5 right-0.5 rounded-md cursor-pointer overflow-hidden transition-opacity hover:opacity-90"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: colors.bg,
                          border: `1.5px solid ${colors.border}`,
                          outline: isSelected ? `2px solid ${colors.border}` : "none",
                          opacity: r.status === "declined" || r.status === "cancelled" || r.status === "no_show" ? 0.4 : 1,
                        }}
                      >
                        <div className="px-1 py-0.5 h-full overflow-hidden">
                          <p className="text-[10px] font-bold truncate" style={{ color: colors.text }}>
                            {new Intl.DateTimeFormat("en-GB", {
                              hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi",
                            }).format(new Date(r.reserved_for))} · {r.guest_name.split(" ")[0]}
                          </p>
                          {height >= 32 && (
                            <p className="text-[9px] truncate" style={{ color: colors.text }}>
                              ×{r.party_size}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hand-rolled popover (fixed positioned, click outside to close) */}
      {popover && activeReservation && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-[300px] bg-white rounded-xl border border-border shadow-xl"
          style={{ top: `${Math.min(popover.top, window.innerHeight - 400)}px`, left: `${popover.left}px` }}
        >
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-dark">{activeReservation.guest_name}</p>
                <p className="text-[11px] text-text3">{formatPopoverTime(activeReservation.reserved_for)}</p>
              </div>
              <button
                onClick={() => setPopover(null)}
                className="shrink-0 size-6 flex items-center justify-center rounded-full text-text3 hover:bg-surface transition-colors"
              >
                ×
              </button>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-text3">Party size</span>
                <span className="font-semibold text-dark">×{activeReservation.party_size}</span>
              </div>
              {activeReservation.area_name && (
                <div className="flex justify-between">
                  <span className="text-text3">Area</span>
                  <span className="font-semibold text-dark">{activeReservation.area_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text3">Status</span>
                <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                  activeReservation.status === "pending" ? "bg-amber-100 text-amber-700" :
                  activeReservation.status === "approved" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{activeReservation.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Phone</span>
                <a href={`tel:${activeReservation.guest_phone}`} className="font-semibold text-amber hover:underline">
                  {activeReservation.guest_phone}
                </a>
              </div>
              {activeReservation.guest_email && (
                <div className="flex justify-between">
                  <span className="text-text3">Email</span>
                  <span className="font-semibold text-dark truncate ml-2 text-right">{activeReservation.guest_email}</span>
                </div>
              )}
            </div>

            {activeReservation.guest_message && (
              <div className="bg-surface rounded-lg p-2.5 text-[12px] text-text2 italic">
                "{activeReservation.guest_message}"
              </div>
            )}

            {/* No email warning */}
            {!activeReservation.guest_email && (
              <p className="text-[11px] text-amber-600">
                ⚠️ No email on file — only WhatsApp link available
              </p>
            )}

            {/* Actions */}
            {activeReservation.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { onApprove(activeReservation.id); setPopover(null); }}
                  disabled={updatingIds.has(activeReservation.id)}
                  className="flex-1 h-8 rounded-full bg-green text-white text-[12px] font-bold hover:bg-[#15803D] transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => { onDecline(activeReservation.id); setPopover(null); }}
                  disabled={updatingIds.has(activeReservation.id)}
                  className="flex-1 h-8 rounded-full border border-[#DC2626] text-[#DC2626] text-[12px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            )}
            {activeReservation.status === "approved" && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => { onCancel(activeReservation.id); setPopover(null); }}
                  disabled={updatingIds.has(activeReservation.id)}
                  className="w-full h-8 rounded-full border border-border text-text3 text-[12px] font-semibold hover:border-red-300 hover:text-[#DC2626] transition-colors disabled:opacity-50"
                >
                  Cancel reservation
                </button>
              </div>
            )}
            {activeReservation.status === "declined" && activeReservation.decline_reason && (
              <div className="text-[11px] text-text3 bg-surface rounded-lg p-2">
                Declined: {activeReservation.decline_reason}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 text-[11px] text-text3 flex gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-500" /> Approved</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-400 opacity-40" /> Other</span>
      </div>
    </div>
  );
}
