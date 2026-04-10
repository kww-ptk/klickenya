"use client";

// TODO V2: MonthView.tsx and drag-to-reassign land in V2.

import { useState, useRef, useEffect, useCallback } from "react";
import type { CalendarReservation } from "./WeekView";

/* ── Re-use the same constants as WeekView ── */
const ROW_HEIGHT = 64;
const START_HOUR = 12;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

/* ── Nairobi helpers (same as WeekView) ── */
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

function addDaysToDate(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T09:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDayTitle(dateStr: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateStr}T09:00:00Z`));
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

function blockColor(status: string): { bg: string; border: string; text: string } {
  if (status === "pending") return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" };
  if (status === "approved") return { bg: "#DCFCE7", border: "#16A34A", text: "#14532D" };
  return { bg: "#F3F4F6", border: "#9CA3AF", text: "#6B7280" };
}

interface PopoverState {
  reservationId: string;
  top: number;
  left: number;
}

interface DayViewProps {
  reservations: CalendarReservation[];
  menuName: string;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  updatingIds: Set<string>;
}

export function DayView({ reservations, menuName, onApprove, onDecline, onCancel, updatingIds }: DayViewProps) {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const dayReservations = reservations.filter(r => getNairobiDateStr(r.reserved_for) === selectedDate);

  const handleBlockClick = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (popover?.reservationId === id) {
      setPopover(null);
      return;
    }
    const el = blockRefs.current.get(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      const left = Math.min(rect.right + 8, window.innerWidth - 320);
      setPopover({ reservationId: id, top: rect.top, left });
    }
  }, [popover]);

  useEffect(() => {
    const handler = () => setPopover(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const activeReservation = popover
    ? reservations.find(r => r.id === popover.reservationId) ?? null
    : null;

  const gridHeight = (END_HOUR - START_HOUR + 1) * ROW_HEIGHT;

  // Date navigation: show a few days around selected
  const navDates = Array.from({ length: 7 }, (_, i) => addDaysToDate(todayStr, i));

  return (
    <div>
      {/* Date navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {navDates.map((d) => {
          const isToday = d === todayStr;
          const isSelected = d === selectedDate;
          const label = new Intl.DateTimeFormat("en-KE", {
            timeZone: "Africa/Nairobi",
            weekday: "short",
            day: "numeric",
          }).format(new Date(`${d}T09:00:00Z`));
          return (
            <button
              key={d}
              onClick={() => { setSelectedDate(d); setPopover(null); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                isSelected
                  ? "bg-[#E8A020] text-white"
                  : isToday
                  ? "bg-[#E8A020]/10 text-[#E8A020] border border-[#E8A020]/30"
                  : "bg-white border border-[#E2DDD5] text-[#5E5848] hover:border-[#E8A020]/40"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className="text-[13px] font-semibold text-[#16130C] mb-3">{formatDayTitle(selectedDate)}</p>

      <div className="flex overflow-x-auto">
        <div className="shrink-0 w-11 relative" style={{ height: `${gridHeight}px` }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-[11px] text-[#9C9485] tabular-nums"
              style={{ top: `${(h - START_HOUR) * ROW_HEIGHT - 6}px` }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Single day column */}
        <div
          className="flex-1 relative border-l border-[#F4F1EC]"
          style={{ height: `${gridHeight}px`, minWidth: "280px" }}
        >
          {HOURS.map((h) => (
            <div key={h}>
              <div className="absolute left-0 right-0 border-t border-[#F4F1EC]" style={{ top: `${(h - START_HOUR) * ROW_HEIGHT}px` }} />
              <div className="absolute left-0 right-0 border-t border-dashed border-[#F4F1EC]" style={{ top: `${(h - START_HOUR) * ROW_HEIGHT + ROW_HEIGHT / 2}px` }} />
            </div>
          ))}

          {dayReservations.map((r) => {
            const { hour, minute } = getNairobiHourMinute(r.reserved_for);
            const minutesFromStart = (hour - START_HOUR) * 60 + minute;
            if (minutesFromStart < 0 || minutesFromStart > (END_HOUR - START_HOUR) * 60) return null;

            const top = (minutesFromStart / 60) * ROW_HEIGHT;
            const height = Math.max((r.duration_minutes / 60) * ROW_HEIGHT, 24);
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
                className="absolute left-1 right-1 rounded-lg cursor-pointer overflow-hidden transition-opacity hover:opacity-90"
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  backgroundColor: colors.bg,
                  border: `1.5px solid ${colors.border}`,
                  outline: isSelected ? `2px solid ${colors.border}` : "none",
                  opacity: r.status === "declined" || r.status === "cancelled" || r.status === "no_show" ? 0.4 : 1,
                }}
              >
                <div className="px-2 py-1 h-full overflow-hidden">
                  <p className="text-[11px] font-bold truncate" style={{ color: colors.text }}>
                    {new Intl.DateTimeFormat("en-GB", {
                      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Nairobi",
                    }).format(new Date(r.reserved_for))} · {r.guest_name}
                  </p>
                  {height >= 36 && (
                    <p className="text-[10px] truncate" style={{ color: colors.text }}>
                      ×{r.party_size}{r.area_name ? ` · ${r.area_name}` : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {dayReservations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#9C9485]">
              No reservations this day
            </div>
          )}
        </div>
      </div>

      {/* Hand-rolled popover */}
      {popover && activeReservation && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 w-[300px] bg-white rounded-xl border border-[#E2DDD5] shadow-xl"
          style={{ top: `${Math.min(popover.top, window.innerHeight - 400)}px`, left: `${Math.min(popover.left, window.innerWidth - 320)}px` }}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-[#16130C]">{activeReservation.guest_name}</p>
                <p className="text-[11px] text-[#9C9485]">{formatPopoverTime(activeReservation.reserved_for)}</p>
              </div>
              <button onClick={() => setPopover(null)} className="shrink-0 size-6 flex items-center justify-center rounded-full text-[#9C9485] hover:bg-[#F4F1EC]">
                ×
              </button>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <span className="text-[#9C9485]">Party size</span>
                <span className="font-semibold text-[#16130C]">×{activeReservation.party_size}</span>
              </div>
              {activeReservation.area_name && (
                <div className="flex justify-between">
                  <span className="text-[#9C9485]">Area</span>
                  <span className="font-semibold text-[#16130C]">{activeReservation.area_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#9C9485]">Phone</span>
                <a href={`tel:${activeReservation.guest_phone}`} className="font-semibold text-[#E8A020] hover:underline">
                  {activeReservation.guest_phone}
                </a>
              </div>
              {activeReservation.guest_email && (
                <div className="flex justify-between">
                  <span className="text-[#9C9485]">Email</span>
                  <span className="font-semibold text-[#16130C] truncate ml-2 text-right">{activeReservation.guest_email}</span>
                </div>
              )}
            </div>

            {activeReservation.guest_message && (
              <div className="bg-[#F4F1EC] rounded-lg p-2.5 text-[12px] text-[#5E5848] italic">
                "{activeReservation.guest_message}"
              </div>
            )}

            {!activeReservation.guest_email && (
              <p className="text-[11px] text-amber-600">⚠️ No email on file — only WhatsApp link available</p>
            )}

            {activeReservation.status === "pending" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { onApprove(activeReservation.id); setPopover(null); }}
                  disabled={updatingIds.has(activeReservation.id)}
                  className="flex-1 h-8 rounded-full bg-[#16A34A] text-white text-[12px] font-bold hover:bg-[#15803D] transition-colors disabled:opacity-50"
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
              <button
                onClick={() => { onCancel(activeReservation.id); setPopover(null); }}
                disabled={updatingIds.has(activeReservation.id)}
                className="w-full h-8 rounded-full border border-[#E2DDD5] text-[#9C9485] text-[12px] font-semibold hover:border-red-300 hover:text-[#DC2626] transition-colors disabled:opacity-50"
              >
                Cancel reservation
              </button>
            )}
            {activeReservation.status === "declined" && activeReservation.decline_reason && (
              <div className="text-[11px] text-[#9C9485] bg-[#F4F1EC] rounded-lg p-2">
                Declined: {activeReservation.decline_reason}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 text-[11px] text-[#9C9485] flex gap-4">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" /> Pending</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-500" /> Approved</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-400 opacity-40" /> Other</span>
      </div>
    </div>
  );
}
