"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/ui/Toast";
import { BookingSidePanel } from "../../[id]/_components/BookingSidePanel";
import { NewBookingSidePanel } from "../../[id]/_components/NewBookingSidePanel";
import {
  UnifiedCalendarGrid,
  BookingWithProperty,
  RoomWithProperty,
  PropertyMeta,
  EnquiryWithProperty,
} from "./UnifiedCalendarGrid";
import { EnquiryActionPanel } from "../../[id]/_components/EnquiryActionPanel";
import { BlockedDate } from "../../[id]/_components/CalendarGrid";

/* ---------- Stats bar ---------- */

interface Stats {
  occupiedTonight: number;
  checkInsToday: number;
  checkOutsToday: number;
  availableTonight: number;
  revenueThisMonth: number;
}

function StatsBar({
  stats,
  checkInBookings,
  checkOutBookings,
  enquiries,
  rooms,
  properties,
  onSelectBooking,
  onSelectEnquiry,
}: {
  stats: Stats;
  checkInBookings: BookingWithProperty[];
  checkOutBookings: BookingWithProperty[];
  enquiries: EnquiryWithProperty[];
  rooms: RoomWithProperty[];
  properties: PropertyMeta[];
  onSelectBooking: (b: BookingWithProperty) => void;
  onSelectEnquiry: (e: EnquiryWithProperty) => void;
}) {
  const [expanded, setExpanded] = useState<"checkin" | "checkout" | "enquiries" | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      notation: "compact",
    }).format(n);

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  const toggle = (key: "checkin" | "checkout" | "enquiries") =>
    setExpanded((prev) => (prev === key ? null : key));

  const expandedBookings = expanded === "checkin" ? checkInBookings : checkOutBookings;

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3">
        {/* Occupied tonight */}
        <div className="bg-white rounded-xl border border-border py-3 px-3 shadow-sm">
          <p className="font-display text-[20px] lg:text-[22px] font-bold tracking-[-0.02em] leading-none text-[#4F46E5]">
            {stats.occupiedTonight}
          </p>
          <p className="text-[10px] lg:text-[11px] text-text3 font-medium mt-1">Occupied tonight</p>
        </div>

        {/* Checking in — expandable */}
        <button
          onClick={() => checkInBookings.length > 0 && toggle("checkin")}
          className={`bg-white rounded-xl border py-3 px-3 shadow-sm text-left transition-colors ${
            checkInBookings.length > 0
              ? "cursor-pointer hover:border-green/40 hover:bg-[#F0FDF4]"
              : "cursor-default"
          } ${expanded === "checkin" ? "border-green/40 bg-[#F0FDF4]" : "border-border"}`}
        >
          <div className="flex items-start justify-between gap-1">
            <p className="font-display text-[20px] lg:text-[22px] font-bold tracking-[-0.02em] leading-none text-green">
              {checkInBookings.length}
            </p>
            {checkInBookings.length > 0 && (
              <svg
                className={`size-3.5 text-green shrink-0 mt-0.5 transition-transform ${expanded === "checkin" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          <p className="text-[10px] lg:text-[11px] text-text3 font-medium mt-1">Checking in</p>
        </button>

        {/* Checking out — expandable */}
        <button
          onClick={() => checkOutBookings.length > 0 && toggle("checkout")}
          className={`bg-white rounded-xl border py-3 px-3 shadow-sm text-left transition-colors ${
            checkOutBookings.length > 0
              ? "cursor-pointer hover:border-amber/40 hover:bg-[#FFFBEB]"
              : "cursor-default"
          } ${expanded === "checkout" ? "border-amber/40 bg-[#FFFBEB]" : "border-border"}`}
        >
          <div className="flex items-start justify-between gap-1">
            <p className="font-display text-[20px] lg:text-[22px] font-bold tracking-[-0.02em] leading-none text-amber">
              {checkOutBookings.length}
            </p>
            {checkOutBookings.length > 0 && (
              <svg
                className={`size-3.5 text-amber shrink-0 mt-0.5 transition-transform ${expanded === "checkout" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          <p className="text-[10px] lg:text-[11px] text-text3 font-medium mt-1">Checking out</p>
        </button>

        {/* Enquiries — expandable */}
        <button
          onClick={() => enquiries.length > 0 && toggle("enquiries")}
          className={`bg-white rounded-xl border py-3 px-3 shadow-sm text-left transition-colors ${
            enquiries.length > 0
              ? "cursor-pointer hover:border-[#4F46E5]/40 hover:bg-[#4F46E5]/5"
              : "cursor-default"
          } ${expanded === "enquiries" ? "border-[#4F46E5]/40 bg-[#4F46E5]/5" : "border-border"}`}
        >
          <div className="flex items-start justify-between gap-1">
            <p className={`font-display text-[20px] lg:text-[22px] font-bold tracking-[-0.02em] leading-none ${enquiries.length > 0 ? "text-amber" : "text-dark"}`}>
              {enquiries.length}
            </p>
            {enquiries.length > 0 && (
              <svg
                className={`size-3.5 text-amber shrink-0 mt-0.5 transition-transform ${expanded === "enquiries" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          <p className="text-[10px] lg:text-[11px] text-text3 font-medium mt-1">Enquiries</p>
        </button>

        {/* Revenue */}
        <div className="bg-white rounded-xl border border-border py-3 px-3 shadow-sm col-span-2 sm:col-span-1">
          <p className="font-display text-[20px] lg:text-[22px] font-bold tracking-[-0.02em] leading-none text-dark">
            {fmt(stats.revenueThisMonth)}
          </p>
          <p className="text-[10px] lg:text-[11px] text-text3 font-medium mt-1">Revenue this month</p>
        </div>
      </div>

      {/* Expanded booking list */}
      {(expanded === "checkin" || expanded === "checkout") && expandedBookings.length > 0 && (
        <div className="mt-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-text3 uppercase tracking-wider px-3 pt-3 pb-1.5">
            {expanded === "checkin" ? "Arriving today" : "Departing today"}
          </p>
          {expandedBookings.map((b) => {
            const room = rooms.find((r) => r.id === b.room_id);
            const property = properties.find((p) => p.id === room?.property_id);
            return (
              <button
                key={b.id}
                onClick={() => onSelectBooking(b)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface transition-colors text-left border-t border-surface first:border-t-0"
              >
                <div className="size-8 rounded-lg bg-surface flex items-center justify-center shrink-0 text-[14px]">
                  {expanded === "checkin" ? "🏠" : "👋"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-dark truncate">{b.guest_name}</p>
                  <p className="text-[11px] text-text3 truncate">
                    {property?.name && <span className="font-medium text-text2">{property.name}</span>}
                    {property?.name && room?.name && <span> · </span>}
                    {room?.name ?? "—"}
                    <span className="mx-1">·</span>
                    {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#4F46E5] shrink-0">Open →</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded enquiry list */}
      {expanded === "enquiries" && enquiries.length > 0 && (
        <div className="mt-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-text3 uppercase tracking-wider px-3 pt-3 pb-1.5">
            Pending enquiries
          </p>
          {enquiries.map((e) => {
            const room = rooms.find((r) => r.id === e.room_id);
            const property = properties.find((p) => p.id === room?.property_id);
            return (
              <button
                key={e.id}
                onClick={() => onSelectEnquiry(e)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface transition-colors text-left border-t border-surface first:border-t-0"
              >
                <div className="size-8 rounded-lg bg-amber/10 flex items-center justify-center shrink-0 text-[14px]">
                  ✉️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-dark truncate">{e.full_name}</p>
                    {e.calendar_status === "held" && (
                      <span className="text-[9px] font-bold bg-amber/15 text-amber px-1.5 py-0.5 rounded-full shrink-0">HELD</span>
                    )}
                  </div>
                  <p className="text-[11px] text-text3 truncate">
                    {property?.name && <span className="font-medium text-text2">{property.name}</span>}
                    {property?.name && room?.name && <span> · </span>}
                    {room?.name ?? "—"}
                    <span className="mx-1">·</span>
                    {fmtDate(e.check_in)} → {fmtDate(e.check_out)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#4F46E5] shrink-0">Open →</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Main wrapper ---------- */

interface UnifiedCalendarWrapperProps {
  properties: PropertyMeta[];
  rooms: RoomWithProperty[];
  bookings: BookingWithProperty[];
  blockedDates: BlockedDate[];
  enquiries?: EnquiryWithProperty[];
  stats: Stats;
  singleProperty?: boolean;
}

export function UnifiedCalendarWrapper({
  properties,
  rooms,
  bookings: initialBookings,
  blockedDates: initialBlockedDates,
  enquiries: initialEnquiries = [],
  stats,
  singleProperty = false,
}: UnifiedCalendarWrapperProps) {
  const [bookings, setBookings] = useState<BookingWithProperty[]>(initialBookings);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(initialBlockedDates);
  const [enquiries, setEnquiries] = useState<EnquiryWithProperty[]>(initialEnquiries);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithProperty | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryWithProperty | null>(null);
  const [newBookingTarget, setNewBookingTarget] = useState<{
    propertyId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  // Drag action chooser
  const [dragChooser, setDragChooser] = useState<{
    propertyId: string; roomId: string; checkIn: string; checkOut: string;
  } | null>(null);
  const [dragChooserMode, setDragChooserMode] = useState<"choose" | "block" | "rate">("choose");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [settingRate, setSettingRate] = useState(false);
  const [rateToast, setRateToast] = useState("");

  // Realtime subscriptions — bookings + enquiries, one channel per property
  useEffect(() => {
    const supabase = createClient();
    const now = () => new Date().toISOString();

    const channels = properties.flatMap((p) => [
      supabase
        .channel(`unified-bookings-${p.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bookings", filter: `property_id=eq.${p.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setBookings((prev) => [...prev, { ...(payload.new as BookingWithProperty) }]);
            } else if (payload.eventType === "UPDATE") {
              setBookings((prev) =>
                prev.map((b) => b.id === (payload.new as BookingWithProperty).id ? (payload.new as BookingWithProperty) : b)
              );
            } else if (payload.eventType === "DELETE") {
              setBookings((prev) => prev.filter((b) => b.id !== (payload.old as { id: string }).id));
            }
          }
        )
        .subscribe(),
      supabase
        .channel(`unified-enquiries-${p.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "contact_requests", filter: `property_id=eq.${p.id}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const e = payload.new as EnquiryWithProperty;
              if (e.calendar_status === "pending" && e.room_id && e.check_in && e.check_out && e.expires_at > now()) {
                setEnquiries((prev) => [...prev, e]);
              }
            } else if (payload.eventType === "UPDATE") {
              const e = payload.new as EnquiryWithProperty;
              if (e.calendar_status !== "pending" || !e.room_id || e.expires_at <= now()) {
                setEnquiries((prev) => prev.filter((x) => x.id !== e.id));
              } else {
                setEnquiries((prev) => prev.map((x) => x.id === e.id ? e : x));
              }
            } else if (payload.eventType === "DELETE") {
              setEnquiries((prev) => prev.filter((x) => x.id !== (payload.old as { id: string }).id));
            }
          }
        )
        .subscribe(),
    ]);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [properties]);

  const todayStr = new Date().toISOString().split("T")[0];

  const checkInBookings = bookings.filter((b) => b.check_in_date === todayStr && b.status !== "cancelled");
  const checkOutBookings = bookings.filter((b) => b.check_out_date === todayStr && b.status !== "cancelled");

  const roomsForProperty = (propertyId: string) =>
    rooms.filter((r) => r.property_id === propertyId);

  const closeDragChooser = () => {
    setDragChooser(null);
    setDragChooserMode("choose");
  };

  const handleDragEnd = (propertyId: string, roomId: string, checkIn: string, checkOut: string) => {
    const room = rooms.find((r) => r.id === roomId);
    setDragChooser({ propertyId, roomId, checkIn, checkOut });
    setDragChooserMode("choose");
    setBlockReason("");
    setNewRate(String(room?.base_price_kes ?? ""));
  };

  return (
    <ToastProvider>
      {/* Stats bar */}
      <StatsBar
        stats={{ ...stats, checkInsToday: checkInBookings.length, checkOutsToday: checkOutBookings.length }}
        checkInBookings={checkInBookings}
        checkOutBookings={checkOutBookings}
        enquiries={enquiries}
        rooms={rooms}
        properties={properties}
        onSelectBooking={(b) => setSelectedBooking(b)}
        onSelectEnquiry={(e) => setSelectedEnquiry(e)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-dark tracking-[-0.02em]">
          {singleProperty ? "Availability Calendar" : "All Properties Calendar"}
        </h2>
        <button
          onClick={() => {
            const firstProp = properties[0];
            const firstRoom = rooms.find((r) => r.property_id === firstProp?.id);
            if (firstProp && firstRoom) {
              const tomorrow = new Date(todayStr + "T00:00:00");
              tomorrow.setDate(tomorrow.getDate() + 1);
              setNewBookingTarget({
                propertyId: firstProp.id,
                roomId: firstRoom.id,
                checkIn: todayStr,
                checkOut: tomorrow.toISOString().split("T")[0],
              });
            }
          }}
          className="text-[13px] font-semibold text-white bg-[#4F46E5] px-4 h-[36px] rounded-lg hover:bg-[#4338CA] transition-colors flex items-center gap-1.5"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New booking
        </button>
      </div>

      {/* Unified calendar */}
      <UnifiedCalendarGrid
        properties={properties}
        rooms={rooms}
        bookings={bookings}
        blockedDates={blockedDates}
        enquiries={enquiries}
        singleProperty={singleProperty}
        onClickBooking={(booking) => setSelectedBooking(booking)}
        onClickEnquiry={(enquiry) => setSelectedEnquiry(enquiry)}
        onClickEmpty={handleDragEnd}
      />

      {/* Rate toast */}
      {rateToast && (
        <div className="fixed top-4 right-4 z-[60] bg-dark text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none">
          <svg className="size-4 text-green shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
          {rateToast}
        </div>
      )}

      {/* Drag action chooser */}
      {dragChooser && !newBookingTarget && (() => {
        const chooserRoom = rooms.find((r) => r.id === dragChooser.roomId);
        const fmtD = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const nights = Math.max(1, Math.ceil((new Date(dragChooser.checkOut + "T00:00:00").getTime() - new Date(dragChooser.checkIn + "T00:00:00").getTime()) / 86400000));

        const handleBlock = async () => {
          setBlocking(true);
          try {
            const res = await fetch("/api/properties/blocked-dates", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ room_id: dragChooser.roomId, start_date: dragChooser.checkIn, end_date: dragChooser.checkOut, reason: blockReason || null }),
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            setBlockedDates((prev) => [...prev, data.blocked]);
            closeDragChooser();
          } catch { /* silent */ }
          setBlocking(false);
        };

        const handleSetRate = async () => {
          if (!newRate) return;
          setSettingRate(true);
          try {
            const res = await fetch(`/api/properties/${dragChooser.propertyId}/pricing`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `Custom rate ${fmtD(dragChooser.checkIn)}–${fmtD(dragChooser.checkOut)}`,
                start_date: dragChooser.checkIn,
                end_date: dragChooser.checkOut,
                price_type: "fixed",
                value: Number(newRate),
                priority: 10,
              }),
            });
            if (res.ok) {
              setRateToast(`Rate set: KSh ${Number(newRate).toLocaleString()} · ${fmtD(dragChooser.checkIn)}–${fmtD(dragChooser.checkOut)}`);
              setTimeout(() => setRateToast(""), 3000);
              closeDragChooser();
            }
          } catch { /* silent */ }
          setSettingRate(false);
        };

        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" onClick={closeDragChooser} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] overflow-hidden pointer-events-auto" role="dialog">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-dark">
                        {chooserRoom?.name ?? "Room"}
                      </p>
                      <p className="text-[12px] text-text3 mt-0.5">
                        {fmtD(dragChooser.checkIn)} → {fmtD(dragChooser.checkOut)} · {nights} night{nights !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button onClick={closeDragChooser} className="size-7 flex items-center justify-center rounded-lg hover:bg-surface text-text3">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {dragChooserMode === "choose" && (
                    <>
                      <button
                        onClick={() => { setNewBookingTarget({ propertyId: dragChooser.propertyId, roomId: dragChooser.roomId, checkIn: dragChooser.checkIn, checkOut: dragChooser.checkOut }); setDragChooser(null); }}
                        className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-border hover:border-[#4F46E5]/50 hover:bg-[#4F46E5]/5 transition-colors text-left"
                      >
                        <span className="text-[20px] shrink-0">📅</span>
                        <div>
                          <p className="text-[13px] font-semibold text-dark">Add booking</p>
                          <p className="text-[11px] text-text3">Create a manual booking for these dates</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setDragChooserMode("block")}
                        className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-border hover:border-text3/50 hover:bg-surface transition-colors text-left"
                      >
                        <span className="text-[20px] shrink-0">🚫</span>
                        <div>
                          <p className="text-[13px] font-semibold text-dark">Block dates</p>
                          <p className="text-[11px] text-text3">Block this room for maintenance or personal use</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setDragChooserMode("rate")}
                        className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-border hover:border-amber/50 hover:bg-[#FFFBEB] transition-colors text-left"
                      >
                        <span className="text-[20px] shrink-0">💰</span>
                        <div>
                          <p className="text-[13px] font-semibold text-dark">Change rate</p>
                          <p className="text-[11px] text-text3">Set a custom nightly rate for these specific dates</p>
                        </div>
                      </button>
                    </>
                  )}

                  {dragChooserMode === "block" && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Reason (optional) — e.g. Maintenance, Personal use"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-dark placeholder:text-text3 outline-none focus:border-text3"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setDragChooserMode("choose")} className="flex-1 py-2.5 rounded-xl border border-border text-[13px] text-text3 hover:text-dark transition-colors">← Back</button>
                        <button onClick={handleBlock} disabled={blocking} className="flex-1 py-2.5 rounded-xl bg-dark text-white text-[13px] font-bold hover:bg-[#2A2416] disabled:opacity-50 transition-colors">
                          {blocking ? "Blocking…" : "Block dates"}
                        </button>
                      </div>
                    </div>
                  )}

                  {dragChooserMode === "rate" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-text3 mb-1">Rate per night (KSh)</label>
                        <input
                          type="number"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          className="w-full border border-border rounded-xl px-3 py-2.5 text-[13px] text-dark outline-none focus:border-amber"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setDragChooserMode("choose")} className="flex-1 py-2.5 rounded-xl border border-border text-[13px] text-text3 hover:text-dark transition-colors">← Back</button>
                        <button onClick={handleSetRate} disabled={settingRate || !newRate} className="flex-1 py-2.5 rounded-xl bg-amber text-white text-[13px] font-bold hover:bg-[#d4911c] disabled:opacity-50 transition-colors">
                          {settingRate ? "Saving…" : "Set rate"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Booking detail panel */}
      {selectedBooking && (
        <BookingSidePanel
          booking={selectedBooking}
          rooms={roomsForProperty(selectedBooking.property_id ?? "")}
          propertyId={selectedBooking.property_id ?? ""}
          onClose={() => setSelectedBooking(null)}
          onBookingUpdated={(updated) => {
            setBookings((prev) =>
              prev.map((b) =>
                b.id === updated.id
                  ? { ...updated, property_id: selectedBooking.property_id }
                  : b
              )
            );
            setSelectedBooking({ ...updated, property_id: selectedBooking.property_id });
          }}
        />
      )}

      {/* Enquiry detail panel */}
      {selectedEnquiry && (
        <EnquiryActionPanel
          enquiry={selectedEnquiry}
          rooms={roomsForProperty(selectedEnquiry.property_id ?? "")}
          propertyId={selectedEnquiry.property_id ?? ""}
          bookings={bookings.filter((b) => b.property_id === selectedEnquiry.property_id)}
          onClose={() => setSelectedEnquiry(null)}
          onConverted={(booking) => {
            setBookings((prev) => [...prev, { ...booking, property_id: selectedEnquiry.property_id }]);
            setEnquiries((prev) => prev.filter((e) => e.id !== selectedEnquiry.id));
            setSelectedEnquiry(null);
          }}
          onDeclined={() => {
            setEnquiries((prev) => prev.filter((e) => e.id !== selectedEnquiry.id));
            setSelectedEnquiry(null);
          }}
          onRoomChanged={(updated) => {
            setEnquiries((prev) => prev.map((e) => e.id === updated.id ? { ...updated, property_id: selectedEnquiry.property_id } as EnquiryWithProperty : e));
            setSelectedEnquiry({ ...updated, property_id: selectedEnquiry.property_id } as EnquiryWithProperty);
          }}
        />
      )}

      {/* New booking panel */}
      {newBookingTarget && (
        <NewBookingSidePanel
          roomId={newBookingTarget.roomId}
          date={newBookingTarget.checkIn}
          checkOutDate={newBookingTarget.checkOut}
          rooms={roomsForProperty(newBookingTarget.propertyId)}
          propertyId={newBookingTarget.propertyId}
          onClose={() => setNewBookingTarget(null)}
          onCreated={(booking) => {
            setBookings((prev) => [
              ...prev,
              { ...booking, property_id: newBookingTarget.propertyId },
            ]);
            setNewBookingTarget(null);
          }}
        />
      )}
    </ToastProvider>
  );
}
