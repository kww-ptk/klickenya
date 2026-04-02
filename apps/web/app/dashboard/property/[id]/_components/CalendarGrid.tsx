"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookingSidePanel } from "./BookingSidePanel";
import { NewBookingSidePanel } from "./NewBookingSidePanel";

/* ---------- Types ---------- */

interface Room {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string;
  max_guests: number;
  base_price_kes: number;
  is_active: boolean;
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

interface BlockedDate {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface CalendarGridProps {
  propertyId: string;
  rooms: Room[];
  bookings: Booking[];
  blockedDates: BlockedDate[];
}

/* ---------- Helpers ---------- */

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  direct: { bg: "#4F46E5", text: "#FFFFFF" },
  airbnb: { bg: "#FF5A5F", text: "#FFFFFF" },
  booking_com: { bg: "#003580", text: "#FFFFFF" },
  manual: { bg: "#E8A020", text: "#16130C" },
  walkin: { bg: "#E8A020", text: "#16130C" },
};

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

/* ---------- Component ---------- */

export function CalendarGrid({
  propertyId,
  rooms,
  bookings: initialBookings,
  blockedDates: initialBlocked,
}: CalendarGridProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [blockedDates] = useState<BlockedDate[]>(initialBlocked);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newBookingTarget, setNewBookingTarget] = useState<{
    roomId: string;
    date: string;
  } | null>(null);

  // 30-day window
  const days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  // Navigate
  const goBack = useCallback(() => {
    setStartDate((d) => addDays(d, -30));
  }, []);
  const goForward = useCallback(() => {
    setStartDate((d) => addDays(d, 30));
  }, []);
  const goToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`bookings-${propertyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBookings((prev) => [...prev, payload.new as Booking]);
          } else if (payload.eventType === "UPDATE") {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === (payload.new as Booking).id
                  ? (payload.new as Booking)
                  : b
              )
            );
          } else if (payload.eventType === "DELETE") {
            setBookings((prev) =>
              prev.filter((b) => b.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  // Build a lookup: roomId + dateStr → booking | blocked | null
  const cellMap = useMemo(() => {
    const map = new Map<string, { type: "booking"; booking: Booking } | { type: "blocked"; block: BlockedDate }>();

    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const checkIn = new Date(b.check_in_date + "T00:00:00");
      const checkOut = new Date(b.check_out_date + "T00:00:00");
      let d = new Date(checkIn);
      while (d < checkOut) {
        const key = `${b.room_id}:${dateStr(d)}`;
        map.set(key, { type: "booking", booking: b });
        d = addDays(d, 1);
      }
    }

    for (const bl of blockedDates) {
      const start = new Date(bl.start_date + "T00:00:00");
      const end = new Date(bl.end_date + "T00:00:00");
      let d = new Date(start);
      while (d < end) {
        const key = `${bl.room_id}:${dateStr(d)}`;
        if (!map.has(key)) {
          map.set(key, { type: "blocked", block: bl });
        }
        d = addDays(d, 1);
      }
    }

    return map;
  }, [bookings, blockedDates]);

  // Month label for header
  const monthLabel = useMemo(() => {
    const first = days[0];
    const last = days[days.length - 1];
    const fMonth = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    const lMonth = last.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return fMonth === lMonth ? fMonth : `${first.toLocaleDateString("en-GB", { month: "short" })} — ${last.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
  }, [days]);

  const todayStr = dateStr(new Date());

  return (
    <>
      <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] shadow-sm overflow-hidden">
        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2DDD5]">
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              className="size-8 flex items-center justify-center rounded-lg hover:bg-[#F4F1EC] transition-colors text-[#5E5848]"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={goToday}
              className="text-[12px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors px-2 py-1 rounded-lg hover:bg-[#4F46E5]/5"
            >
              Today
            </button>
            <button
              onClick={goForward}
              className="size-8 flex items-center justify-center rounded-lg hover:bg-[#F4F1EC] transition-colors text-[#5E5848]"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <p className="text-[13px] font-semibold text-[#16130C]">{monthLabel}</p>
        </div>

        {/* Calendar grid */}
        <div className="overflow-x-auto">
          <div
            className="min-w-[900px]"
            style={{
              display: "grid",
              gridTemplateColumns: `140px repeat(${days.length}, minmax(36px, 1fr))`,
            }}
          >
            {/* Header row — room label + date columns */}
            <div className="sticky left-0 z-10 bg-[#FAFAF8] border-b border-r border-[#E2DDD5] px-3 py-2 text-[10px] font-bold text-[#9C9485] uppercase tracking-wider">
              Room
            </div>
            {days.map((day) => {
              const isToday = isSameDay(dateStr(day), todayStr);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={dateStr(day)}
                  className={`border-b border-r border-[#E2DDD5] px-1 py-1.5 text-center ${
                    isToday ? "bg-[#4F46E5]/8" : isWeekend ? "bg-[#F4F1EC]/60" : "bg-[#FAFAF8]"
                  }`}
                >
                  <p className="text-[9px] text-[#9C9485] leading-none">
                    {day.toLocaleDateString("en-GB", { weekday: "short" })}
                  </p>
                  <p
                    className={`text-[12px] font-semibold leading-tight mt-0.5 ${
                      isToday ? "text-[#4F46E5]" : "text-[#16130C]"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>
              );
            })}

            {/* Room rows */}
            {rooms.map((room) => (
              <RoomRow
                key={room.id}
                room={room}
                days={days}
                todayStr={todayStr}
                cellMap={cellMap}
                onClickBooking={setSelectedBooking}
                onClickEmpty={(roomId, date) =>
                  setNewBookingTarget({ roomId, date })
                }
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#E2DDD5] flex-wrap">
          {[
            { label: "Direct", color: "#4F46E5" },
            { label: "Airbnb", color: "#FF5A5F" },
            { label: "Booking.com", color: "#003580" },
            { label: "Manual", color: "#E8A020" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="size-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-[#9C9485]">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-[#9C9485] opacity-40" style={{
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
            }} />
            <span className="text-[10px] text-[#9C9485]">Blocked</span>
          </div>
        </div>
      </div>

      {/* Side Panels */}
      {selectedBooking && (
        <BookingSidePanel
          booking={selectedBooking}
          rooms={rooms}
          propertyId={propertyId}
          onClose={() => setSelectedBooking(null)}
        />
      )}
      {newBookingTarget && (
        <NewBookingSidePanel
          roomId={newBookingTarget.roomId}
          date={newBookingTarget.date}
          rooms={rooms}
          propertyId={propertyId}
          onClose={() => setNewBookingTarget(null)}
          onCreated={(booking) => {
            setBookings((prev) => [...prev, booking]);
            setNewBookingTarget(null);
          }}
        />
      )}
    </>
  );
}

/* ---------- RoomRow (extracted for perf) ---------- */

function RoomRow({
  room,
  days,
  todayStr,
  cellMap,
  onClickBooking,
  onClickEmpty,
}: {
  room: Room;
  days: Date[];
  todayStr: string;
  cellMap: Map<string, { type: "booking"; booking: Booking } | { type: "blocked"; block: BlockedDate }>;
  onClickBooking: (b: Booking) => void;
  onClickEmpty: (roomId: string, date: string) => void;
}) {
  // Track which bookings we've already started rendering (to draw spans)
  const renderedBookings = new Set<string>();

  return (
    <>
      {/* Room name (sticky left) */}
      <div className="sticky left-0 z-10 bg-white border-b border-r border-[#E2DDD5] px-3 py-2 flex items-center min-h-[44px]">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#16130C] truncate">
            {room.name}
          </p>
          {room.room_number && (
            <p className="text-[10px] text-[#9C9485]">#{room.room_number}</p>
          )}
        </div>
      </div>

      {/* Date cells */}
      {days.map((day, dayIndex) => {
        const ds = dateStr(day);
        const key = `${room.id}:${ds}`;
        const cell = cellMap.get(key);
        const isToday = isSameDay(ds, todayStr);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

        if (!cell) {
          // Empty cell — available
          return (
            <button
              key={ds}
              onClick={() => onClickEmpty(room.id, ds)}
              className={`border-b border-r border-[#E2DDD5] min-h-[44px] hover:bg-[#4F46E5]/5 transition-colors cursor-pointer ${
                isToday ? "bg-[#4F46E5]/[0.03]" : isWeekend ? "bg-[#F4F1EC]/30" : ""
              }`}
              title={`Available — ${ds}`}
            />
          );
        }

        if (cell.type === "blocked") {
          return (
            <div
              key={ds}
              className="border-b border-r border-[#E2DDD5] min-h-[44px]"
              style={{
                backgroundColor: "#F4F1EC",
                backgroundImage:
                  "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(156,148,133,0.2) 3px, rgba(156,148,133,0.2) 5px)",
              }}
              title={cell.block.reason ? `Blocked: ${cell.block.reason}` : "Blocked"}
            />
          );
        }

        // Booking cell
        const booking = cell.booking;
        const isStart = isSameDay(booking.check_in_date, ds);
        const checkOutDate = new Date(booking.check_out_date + "T00:00:00");
        const isEnd = isSameDay(dateStr(addDays(checkOutDate, -1)), ds);
        const colors = SOURCE_COLORS[booking.source] ?? SOURCE_COLORS.direct;

        // For the first cell of a booking in the visible window, render the label
        const shouldShowLabel = isStart || (!renderedBookings.has(booking.id) && dayIndex === 0);
        if (shouldShowLabel) renderedBookings.add(booking.id);

        // Calculate how many remaining days this booking spans from this cell
        let spanDays = 0;
        if (shouldShowLabel) {
          const visStart = isStart ? dayIndex : 0;
          for (let i = visStart; i < days.length; i++) {
            const d = dateStr(days[i]);
            const c = cellMap.get(`${room.id}:${d}`);
            if (c?.type === "booking" && c.booking.id === booking.id) {
              spanDays++;
            } else {
              break;
            }
          }
        }

        return (
          <button
            key={ds}
            onClick={() => onClickBooking(booking)}
            className="border-b border-r border-[#E2DDD5] min-h-[44px] relative cursor-pointer group"
            title={`${booking.guest_name} (${booking.source})`}
          >
            <div
              className="absolute inset-y-[4px] inset-x-0 flex items-center overflow-hidden"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                borderTopLeftRadius: isStart ? 6 : 0,
                borderBottomLeftRadius: isStart ? 6 : 0,
                borderTopRightRadius: isEnd ? 6 : 0,
                borderBottomRightRadius: isEnd ? 6 : 0,
                marginLeft: isStart ? 2 : 0,
                marginRight: isEnd ? 2 : 0,
              }}
            >
              {shouldShowLabel && (
                <span
                  className="text-[10px] font-semibold truncate px-1.5 whitespace-nowrap"
                  style={{
                    maxWidth: `calc(${spanDays} * 100%)`,
                  }}
                >
                  {booking.guest_name}
                  {booking.nights ? ` · ${booking.nights}n` : ""}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </>
  );
}
