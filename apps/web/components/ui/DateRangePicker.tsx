"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

/* ── Helpers ─────────────────────────────────── */

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d: Date, start: Date, end: Date): boolean {
  return d > start && d < end;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* ── Types ───────────────────────────────────── */

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  /** Min selectable date. Defaults to today. */
  minDate?: string;
  /** Accent color for selected range. */
  accentColor?: string;
}

/* ── Component ───────────────────────────────── */

export function DateRangePicker({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  minDate,
  accentColor = "#E8A020",
}: DateRangePickerProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const minD = useMemo(() => (minDate ? parseDate(minDate) : today) ?? today, [minDate, today]);

  const startD = useMemo(() => parseDate(checkIn), [checkIn]);
  const endD = useMemo(() => parseDate(checkOut), [checkOut]);

  // Which phase of selection are we in?
  const [selecting, setSelecting] = useState<"check-in" | "check-out">(
    checkIn ? "check-out" : "check-in"
  );
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Current displayed month
  const [viewMonth, setViewMonth] = useState(() => {
    if (startD) return startOfMonth(startD);
    return startOfMonth(today);
  });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const numDays = daysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const prevMonth = useCallback(() => {
    setViewMonth(new Date(year, month - 1, 1));
  }, [year, month]);

  const nextMonth = useCallback(() => {
    setViewMonth(new Date(year, month + 1, 1));
  }, [year, month]);

  const canGoPrev = new Date(year, month, 0) >= minD;

  const handleDayClick = useCallback(
    (day: Date) => {
      if (day < minD) return;

      if (selecting === "check-in") {
        onCheckInChange(toDateStr(day));
        onCheckOutChange("");
        setSelecting("check-out");
      } else {
        // check-out
        if (startD && day <= startD) {
          // Clicked before check-in — restart
          onCheckInChange(toDateStr(day));
          onCheckOutChange("");
          setSelecting("check-out");
        } else {
          onCheckOutChange(toDateStr(day));
          setSelecting("check-in");
        }
      }
    },
    [selecting, startD, minD, onCheckInChange, onCheckOutChange]
  );

  // Preview range on hover
  const previewEnd = selecting === "check-out" && startD && hoveredDate && hoveredDate > startD
    ? hoveredDate
    : null;

  const effectiveEnd = endD ?? previewEnd;

  // Build day cells
  const cells = useMemo(() => {
    const result: (Date | null)[] = [];
    // Leading blanks
    for (let i = 0; i < firstDayOfWeek; i++) result.push(null);
    // Days
    for (let d = 1; d <= numDays; d++) result.push(new Date(year, month, d));
    return result;
  }, [year, month, numDays, firstDayOfWeek]);

  return (
    <div className="select-none">
      {/* Selection labels */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => setSelecting("check-in")}
          className={cn(
            "text-left px-2.5 py-2 rounded-lg border-2 transition-all",
            selecting === "check-in"
              ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5"
              : "border-[#E2DDD5]"
          )}
          style={{ "--accent": accentColor } as React.CSSProperties}
        >
          <p className="text-[9px] font-bold text-[#9C9485] uppercase tracking-wide">Check-in</p>
          <p className={cn("text-[13px] font-semibold", startD ? "text-[#16130C]" : "text-[#9C9485]")}>
            {startD
              ? startD.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
              : "Add date"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => { if (startD) setSelecting("check-out"); }}
          className={cn(
            "text-left px-2.5 py-2 rounded-lg border-2 transition-all",
            selecting === "check-out"
              ? "border-[color:var(--accent)] bg-[color:var(--accent)]/5"
              : "border-[#E2DDD5]",
            !startD && "opacity-50 cursor-not-allowed"
          )}
          style={{ "--accent": accentColor } as React.CSSProperties}
        >
          <p className="text-[9px] font-bold text-[#9C9485] uppercase tracking-wide">Check-out</p>
          <p className={cn("text-[13px] font-semibold", endD ? "text-[#16130C]" : "text-[#9C9485]")}>
            {endD
              ? endD.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
              : "Add date"}
          </p>
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="size-7 flex items-center justify-center rounded-full hover:bg-[#F4F1EC] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <svg className="size-3.5 text-[#16130C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <p className="text-[13px] font-bold text-[#16130C] tracking-[-0.01em]">
          {MONTHS[month]} {year}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          className="size-7 flex items-center justify-center rounded-full hover:bg-[#F4F1EC] transition-colors"
        >
          <svg className="size-3.5 text-[#16130C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#9C9485] py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`blank-${i}`} className="aspect-square" />;
          }

          const isPast = day < minD && !isSameDay(day, minD);
          const isStart = startD ? isSameDay(day, startD) : false;
          const isEnd = effectiveEnd ? isSameDay(day, effectiveEnd) : false;
          const isInRange = startD && effectiveEnd ? isBetween(day, startD, effectiveEnd) : false;
          const isToday = isSameDay(day, today);
          const isPreviewRange = !endD && previewEnd && startD && isBetween(day, startD, previewEnd);

          return (
            <div
              key={day.getDate()}
              className={cn(
                "relative aspect-square flex items-center justify-center",
                (isInRange || isPreviewRange) && "bg-[color:var(--accent)]/10",
                isStart && effectiveEnd && "bg-gradient-to-r from-transparent via-transparent to-[color:var(--accent)]/10",
                isEnd && startD && "bg-gradient-to-l from-transparent via-transparent to-[color:var(--accent)]/10",
              )}
              style={{ "--accent": accentColor } as React.CSSProperties}
            >
              <button
                type="button"
                disabled={isPast}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                className={cn(
                  "relative z-10 size-7 sm:size-8 flex items-center justify-center rounded-full text-[12px] transition-all duration-150",
                  !isPast && !isStart && !isEnd && "text-[#16130C] hover:bg-[#F4F1EC]",
                  isPast && "text-[#E2DDD5] cursor-not-allowed",
                  isToday && !isStart && !isEnd && "font-bold",
                  (isStart || isEnd) && "text-white font-bold",
                  isInRange && !isStart && !isEnd && "text-[#16130C] font-medium",
                )}
                style={
                  isStart || isEnd
                    ? { backgroundColor: accentColor }
                    : undefined
                }
              >
                {day.getDate()}
                {isToday && !isStart && !isEnd && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-[3px] rounded-full" style={{ backgroundColor: accentColor }} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Nights summary */}
      {startD && effectiveEnd && (
        <p className="mt-2 text-center text-[11px] text-[#9C9485]">
          {Math.ceil((effectiveEnd.getTime() - startD.getTime()) / 86400000)} night{Math.ceil((effectiveEnd.getTime() - startD.getTime()) / 86400000) !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
