"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";
import {
  Room,
  Booking,
  BlockedDate,
  DragState,
  CellMap,
  RoomRow,
  Enquiry,
  EnquiryMap,
  addDays,
  dateStr,
  isSameDay,
} from "../../[id]/_components/CalendarGrid";

/* ---------- Extended types for unified view ---------- */

export interface RoomWithProperty extends Room {
  property_id: string;
}

export interface BookingWithProperty extends Booking {
  property_id: string;
}

export interface PropertyMeta {
  id: string;
  name: string;
  city: string | null;
  property_type: string;
}

export interface EnquiryWithProperty extends Enquiry {
  property_id: string;
}

interface UnifiedCalendarGridProps {
  properties: PropertyMeta[];
  rooms: RoomWithProperty[];
  bookings: BookingWithProperty[];
  blockedDates: BlockedDate[];
  enquiries?: EnquiryWithProperty[];
  onClickBooking: (booking: BookingWithProperty) => void;
  onClickEnquiry?: (enquiry: EnquiryWithProperty) => void;
  onClickEmpty: (
    propertyId: string,
    roomId: string,
    checkIn: string,
    checkOut: string
  ) => void;
}

/* ---------- Helpers ---------- */

function nextDay(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

/* ---------- Component ---------- */

export function UnifiedCalendarGrid({
  properties,
  rooms,
  bookings,
  blockedDates,
  enquiries = [],
  onClickBooking,
  onClickEnquiry,
  onClickEmpty,
}: UnifiedCalendarGridProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [collapsedProperties, setCollapsedProperties] = useState<Set<string>>(
    () => new Set()
  );

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [shakeCell, setShakeCell] = useState<string | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  dragStateRef.current = dragState;

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

  const roomsWithEnquiries = useMemo(
    () => new Set(enquiries.map((e) => e.room_id)),
    [enquiries]
  );

  // Global drag-end handler
  useEffect(() => {
    const handleEnd = () => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const checkIn =
        ds.startDate <= ds.currentDate ? ds.startDate : ds.currentDate;
      const checkOut = nextDay(
        ds.startDate <= ds.currentDate ? ds.currentDate : ds.startDate
      );
      // Look up propertyId from rooms
      const room = rooms.find((r) => r.id === ds.roomId);
      if (room) {
        onClickEmpty(room.property_id, ds.roomId, checkIn, checkOut);
      }
      setDragState(null);
    };
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchend", handleEnd);
    return () => {
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchend", handleEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  const handleDragStart = useCallback((roomId: string, date: string) => {
    setDragState({ roomId, startDate: date, currentDate: date });
  }, []);

  const handleDragEnter = useCallback(
    (roomId: string, date: string) => {
      setDragState((prev) => {
        if (!prev || prev.roomId !== roomId) return prev;
        const cellKey = `${roomId}:${date}`;
        if (cellMap.has(cellKey)) {
          setShakeCell(cellKey);
          setTimeout(() => setShakeCell(null), 400);
          return prev;
        }
        return { ...prev, currentDate: date };
      });
    },
    [cellMap]
  );

  // Persist collapsed state to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("unified-cal-collapsed");
      if (saved) setCollapsedProperties(new Set(JSON.parse(saved) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = useCallback((propertyId: string) => {
    setCollapsedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      try {
        localStorage.setItem(
          "unified-cal-collapsed",
          JSON.stringify([...next])
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Navigation
  const goBack = useCallback(() => setStartDate((d) => addDays(d, -30)), []);
  const goForward = useCallback(() => setStartDate((d) => addDays(d, 30)), []);
  const goToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  }, []);

  const days = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDays(startDate, i)),
    [startDate]
  );

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

  // Group rooms by property
  const propertyGroups = useMemo(
    () =>
      properties.map((p) => ({
        property: p,
        rooms: rooms.filter((r) => r.property_id === p.id),
      })),
    [properties, rooms]
  );

  return (
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
          {/* Header: room label + date columns */}
          <div className="sticky left-0 z-10 bg-[#FAFAF8] border-b border-r border-[#E2DDD5] px-3 py-2 text-[10px] font-bold text-[#9C9485] uppercase tracking-wider">
            Room
          </div>
          {days.map((day) => {
            const ds = dateStr(day);
            const isToday = isSameDay(ds, todayStr);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            return (
              <div
                key={ds}
                className={`border-b border-r border-[#E2DDD5] px-1 py-1.5 text-center ${
                  isToday
                    ? "bg-[#4F46E5]/8"
                    : isWeekend
                      ? "bg-[#F4F1EC]/60"
                      : "bg-[#FAFAF8]"
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

          {/* Property groups */}
          {propertyGroups.map(({ property, rooms: propRooms }) => {
            const isCollapsed = collapsedProperties.has(property.id);
            return (
              <Fragment key={property.id}>
                {/* Property header row */}
                <button
                  onClick={() => toggleCollapsed(property.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F4F1EC] hover:bg-[#EAE6DE] transition-colors border-b border-[#E2DDD5] text-left"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <svg
                    className={`size-3.5 text-[#5E5848] shrink-0 transition-transform duration-150 ${
                      isCollapsed ? "-rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                  <span className="text-[12px] font-bold text-[#16130C]">
                    {property.name}
                  </span>
                  {property.city && (
                    <span className="text-[11px] text-[#9C9485]">
                      {property.city}
                    </span>
                  )}
                  <span className="text-[10px] text-[#9C9485] ml-0.5">
                    · {propRooms.length}{" "}
                    {propRooms.length === 1 ? "room" : "rooms"}
                  </span>
                </button>

                {/* Room rows */}
                {!isCollapsed &&
                  propRooms.map((room) => {
                    const dr =
                      dragState?.roomId === room.id
                        ? {
                            start:
                              dragState.startDate <= dragState.currentDate
                                ? dragState.startDate
                                : dragState.currentDate,
                            end:
                              dragState.startDate <= dragState.currentDate
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
                        onClickBooking={(b) =>
                          onClickBooking(b as BookingWithProperty)
                        }
                        onClickEnquiry={(e) =>
                          onClickEnquiry?.(e as EnquiryWithProperty)
                        }
                        onClickEmpty={(roomId, checkIn, checkOut) =>
                          onClickEmpty(property.id, roomId, checkIn, checkOut)
                        }
                        onDragStart={handleDragStart}
                        onDragEnter={handleDragEnter}
                      />
                    );
                  })}
              </Fragment>
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
            <div
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-[#9C9485]">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div
            className="size-2.5 rounded-sm bg-[#9C9485] opacity-40"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
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
  );
}
