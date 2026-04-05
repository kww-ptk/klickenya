"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookingSidePanel } from "./BookingSidePanel";
import { NewBookingSidePanel } from "./NewBookingSidePanel";
import { EnquiryActionPanel } from "./EnquiryActionPanel";

/* ---------- Types ---------- */

export interface Room {
  id: string;
  name: string;
  room_number: string | null;
  room_type: string;
  max_guests: number;
  base_price_kes: number;
  is_active: boolean;
}

export interface Booking {
  id: string;
  room_id: string;
  property_id?: string;
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

export interface BlockedDate {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface Enquiry {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  room_id: string;
  check_in: string;
  check_out: string;
  guests?: number | null;
  calendar_status: string;
  expires_at: string;
  listing_title?: string | null;
  notes?: string | null;
  property_id?: string;
}

export type EnquiryMap = Map<string, Enquiry[]>;

export interface DragState {
  roomId: string;
  startDate: string;
  currentDate: string;
}

export type CellMap = Map<
  string,
  { type: "booking"; booking: Booking } | { type: "blocked"; block: BlockedDate }
>;

interface CalendarGridProps {
  propertyId: string;
  rooms: Room[];
  bookings: Booking[];
  blockedDates: BlockedDate[];
  enquiries?: Enquiry[];
}

/* ---------- Helpers ---------- */

export const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  direct: { bg: "#4F46E5", text: "#FFFFFF" },
  airbnb: { bg: "#FF5A5F", text: "#FFFFFF" },
  booking_com: { bg: "#003580", text: "#FFFFFF" },
  manual: { bg: "#E8A020", text: "#16130C" },
  walkin: { bg: "#E8A020", text: "#16130C" },
};

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function nextDay(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/* ---------- Component ---------- */

export function CalendarGrid({
  propertyId,
  rooms,
  bookings: initialBookings,
  blockedDates: initialBlocked,
  enquiries: initialEnquiries = [],
}: CalendarGridProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [blockedDates] = useState<BlockedDate[]>(initialBlocked);
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [newBookingTarget, setNewBookingTarget] = useState<{
    roomId: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [shakeCell, setShakeCell] = useState<string | null>(null); // "roomId:date"
  const dragStateRef = useRef<DragState | null>(null);
  dragStateRef.current = dragState;

  // 30-day window
  const days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  // Navigate
  const goBack = useCallback(() => setStartDate((d) => addDays(d, -30)), []);
  const goForward = useCallback(() => setStartDate((d) => addDays(d, 30)), []);
  const goToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  }, []);

  // Build cellMap
  const cellMap = useMemo<CellMap>(() => {
    const map: CellMap = new Map();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const checkIn = new Date(b.check_in_date + "T00:00:00");
      const checkOut = new Date(b.check_out_date + "T00:00:00");
      let d = new Date(checkIn);
      while (d < checkOut) {
        map.set(`${b.room_id}:${dateStr(d)}`, { type: "booking", booking: b });
        d = addDays(d, 1);
      }
    }
    for (const bl of blockedDates) {
      const start = new Date(bl.start_date + "T00:00:00");
      const end = new Date(bl.end_date + "T00:00:00");
      let d = new Date(start);
      while (d < end) {
        const key = `${bl.room_id}:${dateStr(d)}`;
        if (!map.has(key)) map.set(key, { type: "blocked", block: bl });
        d = addDays(d, 1);
      }
    }
    return map;
  }, [bookings, blockedDates]);

  // Build enquiryMap: "roomId:date" → Enquiry[]
  const enquiryMap = useMemo<EnquiryMap>(() => {
    const map: EnquiryMap = new Map();
    for (const e of enquiries) {
      if (!e.room_id || !e.check_in || !e.check_out) continue;
      const start = new Date(e.check_in + "T00:00:00");
      const end = new Date(e.check_out + "T00:00:00");
      let d = new Date(start);
      while (d < end) {
        const key = `${e.room_id}:${dateStr(d)}`;
        const existing = map.get(key) ?? [];
        map.set(key, [...existing, e]);
        d = addDays(d, 1);
      }
    }
    return map;
  }, [enquiries]);

  // Rooms that have at least one active enquiry (used to expand row height)
  const roomsWithEnquiries = useMemo(
    () => new Set(enquiries.map((e) => e.room_id)),
    [enquiries]
  );

  // Global drag-end handler (mouseup + touchend)
  useEffect(() => {
    const handleEnd = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const checkIn =
        ds.startDate <= ds.currentDate ? ds.startDate : ds.currentDate;
      const checkOut = nextDay(
        ds.startDate <= ds.currentDate ? ds.currentDate : ds.startDate
      );
      setNewBookingTarget({ roomId: ds.roomId, checkIn, checkOut });
      setDragState(null);
    };
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
    };
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((roomId: string, date: string) => {
    setDragState({ roomId, startDate: date, currentDate: date });
  }, []);

  const handleDragEnter = useCallback(
    (roomId: string, date: string) => {
      setDragState((prev) => {
        if (!prev || prev.roomId !== roomId) return prev;
        const cellKey = `${roomId}:${date}`;
        if (cellMap.has(cellKey)) {
          // Boundary — shake and hold
          setShakeCell(cellKey);
          setTimeout(() => setShakeCell(null), 400);
          return prev;
        }
        return { ...prev, currentDate: date };
      });
    },
    [cellMap]
  );

  // Month label
  const monthLabel = useMemo(() => {
    const first = days[0];
    const last = days[days.length - 1];
    const fMonth = first.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const lMonth = last.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    return fMonth === lMonth
      ? fMonth
      : `${first.toLocaleDateString("en-GB", { month: "short" })} — ${last.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
  }, [days]);

  const todayStr = dateStr(new Date());

  // Realtime subscriptions — bookings + enquiries
  useEffect(() => {
    const supabase = createClient();

    const bookingChannel = supabase
      .channel(`bookings-${propertyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `property_id=eq.${propertyId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBookings((prev) => [...prev, payload.new as Booking]);
          } else if (payload.eventType === "UPDATE") {
            setBookings((prev) =>
              prev.map((b) => b.id === (payload.new as Booking).id ? (payload.new as Booking) : b)
            );
          } else if (payload.eventType === "DELETE") {
            setBookings((prev) => prev.filter((b) => b.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    const enquiryChannel = supabase
      .channel(`enquiries-${propertyId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests", filter: `property_id=eq.${propertyId}` },
        (payload) => {
          const now = new Date().toISOString();
          if (payload.eventType === "INSERT") {
            const e = payload.new as Enquiry;
            if (e.calendar_status === "pending" && e.room_id && e.check_in && e.check_out && e.expires_at > now) {
              setEnquiries((prev) => [...prev, e]);
            }
          } else if (payload.eventType === "UPDATE") {
            const e = payload.new as Enquiry;
            if (e.calendar_status !== "pending" || !e.room_id || !e.check_in || !e.check_out || e.expires_at <= now) {
              setEnquiries((prev) => prev.filter((x) => x.id !== e.id));
            } else {
              setEnquiries((prev) => prev.map((x) => x.id === e.id ? e : x));
            }
          } else if (payload.eventType === "DELETE") {
            setEnquiries((prev) => prev.filter((x) => x.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
      supabase.removeChannel(enquiryChannel);
    };
  }, [propertyId]);

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
        <div className={`overflow-x-auto${dragState ? " select-none" : ""}`}>
          <div
            className="min-w-[900px]"
            style={{
              display: "grid",
              gridTemplateColumns: `140px repeat(${days.length}, minmax(36px, 1fr))`,
              cursor: dragState ? "crosshair" : undefined,
            }}
          >
            {/* Header row */}
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
                  <p className={`text-[12px] font-semibold leading-tight mt-0.5 ${isToday ? "text-[#4F46E5]" : "text-[#16130C]"}`}>
                    {day.getDate()}
                  </p>
                </div>
              );
            })}

            {/* Room rows */}
            {rooms.map((room) => {
              const dr = dragState?.roomId === room.id
                ? {
                    start: dragState.startDate <= dragState.currentDate
                      ? dragState.startDate
                      : dragState.currentDate,
                    end: dragState.startDate <= dragState.currentDate
                      ? dragState.currentDate
                      : dragState.startDate,
                  }
                : null;
              const shakeDate = shakeCell?.startsWith(room.id + ":")
                ? shakeCell.slice(room.id.length + 1)
                : null;
              return (
                <RoomRow
                  key={room.id}
                  room={room}
                  days={days}
                  todayStr={todayStr}
                  cellMap={cellMap}
                  enquiryMap={enquiryMap}
                  hasEnquiries={roomsWithEnquiries.has(room.id)}
                  dragRange={dr}
                  shakeDate={shakeDate}
                  onClickBooking={setSelectedBooking}
                  onClickEnquiry={setSelectedEnquiry}
                  onClickEmpty={(roomId, checkIn, checkOut) =>
                    setNewBookingTarget({ roomId, checkIn, checkOut })
                  }
                  onDragStart={handleDragStart}
                  onDragEnter={handleDragEnter}
                />
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#E2DDD5] flex-wrap">
          {[
            { label: "Direct", color: "#4F46E5" },
            { label: "Airbnb", color: "#FF5A5F" },
            { label: "Booking.com", color: "#003580" },
            { label: "Manual", color: "#E8A020" },
            { label: "Checked in", color: "#16A34A" },
            { label: "Checked out", color: "#9C9485" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-[#9C9485]">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-sm bg-[#9C9485] opacity-40"
              style={{
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
              }}
            />
            <span className="text-[10px] text-[#9C9485]">Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-sm border border-dashed border-[#EAB308]"
              style={{ backgroundColor: "#FEF9C3" }}
            />
            <span className="text-[10px] text-[#9C9485]">Enquiry</span>
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
          onBookingUpdated={(updated) => {
            setBookings((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b))
            );
            setSelectedBooking(updated);
          }}
        />
      )}
      {selectedEnquiry && (
        <EnquiryActionPanel
          enquiry={selectedEnquiry}
          rooms={rooms}
          propertyId={propertyId}
          bookings={bookings}
          onClose={() => setSelectedEnquiry(null)}
          onConverted={(booking) => {
            setBookings((prev) => [...prev, booking]);
            setEnquiries((prev) => prev.filter((e) => e.id !== selectedEnquiry.id));
            setSelectedEnquiry(null);
          }}
          onDeclined={() => {
            setEnquiries((prev) => prev.filter((e) => e.id !== selectedEnquiry.id));
            setSelectedEnquiry(null);
          }}
          onRoomChanged={(updatedEnquiry) => {
            setEnquiries((prev) => prev.map((e) => e.id === updatedEnquiry.id ? updatedEnquiry : e));
            setSelectedEnquiry(updatedEnquiry);
          }}
        />
      )}
      {newBookingTarget && (
        <NewBookingSidePanel
          roomId={newBookingTarget.roomId}
          date={newBookingTarget.checkIn}
          checkOutDate={newBookingTarget.checkOut}
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

/* ---------- RoomRow ---------- */

export function RoomRow({
  room,
  days,
  todayStr,
  cellMap,
  enquiryMap,
  hasEnquiries,
  dragRange,
  shakeDate,
  onClickBooking,
  onClickEnquiry,
  onClickEmpty,
  onDragStart,
  onDragEnter,
}: {
  room: Room;
  days: Date[];
  todayStr: string;
  cellMap: CellMap;
  enquiryMap?: EnquiryMap;
  hasEnquiries?: boolean;
  dragRange: { start: string; end: string } | null;
  shakeDate: string | null;
  onClickBooking: (b: Booking) => void;
  onClickEnquiry?: (e: Enquiry) => void;
  onClickEmpty: (roomId: string, checkIn: string, checkOut: string) => void;
  onDragStart: (roomId: string, date: string) => void;
  onDragEnter: (roomId: string, date: string) => void;
}) {
  const renderedBookings = new Set<string>();
  const renderedEnquiries = new Set<string>();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDragging = useRef(false);
  const cellH = hasEnquiries ? "60px" : "44px";

  return (
    <>
      {/* Room name (sticky left) */}
      <div className="sticky left-0 z-10 bg-white border-b border-r border-[#E2DDD5] px-3 py-2 flex items-center" style={{ minHeight: cellH }}>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[#16130C] truncate">{room.name}</p>
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
        const isInDragRange = dragRange
          ? ds >= dragRange.start && ds <= dragRange.end
          : false;
        const isShaking = shakeDate === ds;

        // Enquiry data for this cell
        const cellEnquiries = enquiryMap?.get(key) ?? [];
        const hasEnquiryHere = cellEnquiries.length > 0;
        const firstEnquiry = cellEnquiries[0] as Enquiry | undefined;
        const extraCount = cellEnquiries.length - 1;
        let isEnqStart = false;
        let isEnqEnd = false;
        let shouldShowEnqLabel = false;
        if (firstEnquiry) {
          isEnqStart = firstEnquiry.check_in === ds;
          isEnqEnd = isSameDay(dateStr(addDays(new Date(firstEnquiry.check_out + "T00:00:00"), -1)), ds);
          shouldShowEnqLabel = isEnqStart || (!renderedEnquiries.has(firstEnquiry.id) && dayIndex === 0);
          if (shouldShowEnqLabel) renderedEnquiries.add(firstEnquiry.id);
        }
        const hasConflict = !!cell && cell.type === "booking" && hasEnquiryHere;

        // Reusable enquiry strip rendered at bottom of cell
        const enquiryStrip = hasEnquiryHere && firstEnquiry ? (
          <button
            onClick={(e) => { e.stopPropagation(); onClickEnquiry?.(firstEnquiry); }}
            className="absolute bottom-[2px] left-0 right-0 h-[18px] overflow-hidden flex items-center"
            title={`Enquiry: ${firstEnquiry.full_name}`}
            style={{
              backgroundColor: "#FEF9C3",
              border: "1.5px dashed #EAB308",
              borderTopLeftRadius: isEnqStart ? 4 : 0,
              borderBottomLeftRadius: isEnqStart ? 4 : 0,
              borderTopRightRadius: isEnqEnd ? 4 : 0,
              borderBottomRightRadius: isEnqEnd ? 4 : 0,
              marginLeft: isEnqStart ? 1 : 0,
              marginRight: isEnqEnd ? 1 : 0,
            }}
          >
            {shouldShowEnqLabel && (
              <span className="text-[9px] italic text-amber-700 font-semibold px-1 truncate whitespace-nowrap flex-1">
                {firstEnquiry.full_name.split(" ")[0]}?
              </span>
            )}
            {hasConflict && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 shrink-0" title="Conflicts with confirmed booking" />
            )}
            {extraCount > 0 && isEnqStart && (
              <span className="absolute right-1 text-[8px] font-bold text-amber-700">+{extraCount}</span>
            )}
          </button>
        ) : null;

        if (!cell) {
          return (
            <button
              key={ds}
              data-date={ds}
              data-room-id={room.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onDragStart(room.id, ds);
              }}
              onMouseEnter={() => onDragEnter(room.id, ds)}
              onMouseUp={() => {}}
              onTouchStart={() => {
                touchDragging.current = false;
                longPressTimer.current = setTimeout(() => {
                  touchDragging.current = true;
                  onDragStart(room.id, ds);
                }, 400);
              }}
              onTouchMove={(e) => {
                if (!touchDragging.current) {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                  return;
                }
                const touch = e.changedTouches[0];
                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                if (el) {
                  const cellEl = (el as HTMLElement).closest("[data-date]") as HTMLElement | null;
                  if (cellEl?.dataset.date && cellEl?.dataset.roomId) {
                    onDragEnter(cellEl.dataset.roomId, cellEl.dataset.date);
                  }
                }
              }}
              onTouchEnd={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
                if (!touchDragging.current) {
                  onClickEmpty(room.id, ds, nextDay(ds));
                }
                touchDragging.current = false;
              }}
              className={[
                "border-b border-r border-[#E2DDD5] transition-colors relative",
                isInDragRange
                  ? "bg-[#4F46E5]/30"
                  : isToday
                    ? "bg-[#4F46E5]/[0.03] hover:bg-[#4F46E5]/10"
                    : isWeekend
                      ? "bg-[#F4F1EC]/30 hover:bg-[#4F46E5]/5"
                      : "hover:bg-[#4F46E5]/5",
                isShaking ? "animate-cal-shake" : "",
              ].filter(Boolean).join(" ")}
              style={{ minHeight: cellH }}
              title={hasEnquiryHere ? `Enquiry: ${firstEnquiry?.full_name}` : `Available — ${ds}`}
            >
              {enquiryStrip}
            </button>
          );
        }

        if (cell.type === "blocked") {
          return (
            <div
              key={ds}
              data-date={ds}
              data-room-id={room.id}
              className={`border-b border-r border-[#E2DDD5] relative${isShaking ? " animate-cal-shake" : ""}`}
              style={{
                minHeight: cellH,
                backgroundColor: "#F4F1EC",
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(156,148,133,0.2) 3px, rgba(156,148,133,0.2) 5px)",
              }}
              title={cell.block.reason ? `Blocked: ${cell.block.reason}` : "Blocked"}
            >
              {enquiryStrip}
            </div>
          );
        }

        // Booking cell
        const booking = cell.booking;
        const isStart = isSameDay(booking.check_in_date, ds);
        const checkOutDate = new Date(booking.check_out_date + "T00:00:00");
        const isEnd = isSameDay(dateStr(addDays(checkOutDate, -1)), ds);
        const colors =
          booking.status === "checked_in"
            ? { bg: "#16A34A", text: "#FFFFFF" }
            : booking.status === "checked_out"
              ? { bg: "#9C9485", text: "#FFFFFF" }
              : (SOURCE_COLORS[booking.source] ?? SOURCE_COLORS.direct);

        const shouldShowLabel =
          isStart || (!renderedBookings.has(booking.id) && dayIndex === 0);
        if (shouldShowLabel) renderedBookings.add(booking.id);

        let spanDays = 0;
        if (shouldShowLabel) {
          const visStart = isStart ? dayIndex : 0;
          for (let i = visStart; i < days.length; i++) {
            const c = cellMap.get(`${room.id}:${dateStr(days[i])}`);
            if (c?.type === "booking" && c.booking.id === booking.id) {
              spanDays++;
            } else break;
          }
        }

        // When an enquiry strip is present, shrink booking block to leave space
        const bookingBottom = hasEnquiryHere ? "24px" : "4px";

        return (
          <button
            key={ds}
            onClick={() => onClickBooking(booking)}
            className="border-b border-r border-[#E2DDD5] relative cursor-pointer group"
            style={{ minHeight: cellH }}
            title={`${booking.guest_name} (${booking.source})`}
          >
            <div
              className="absolute left-0 right-0 flex items-center overflow-hidden"
              style={{
                top: 4,
                bottom: bookingBottom,
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
                  style={{ maxWidth: `calc(${spanDays} * 100%)` }}
                >
                  {booking.guest_name}
                  {booking.nights ? ` · ${booking.nights}n` : ""}
                </span>
              )}
            </div>
            {enquiryStrip}
          </button>
        );
      })}
    </>
  );
}
