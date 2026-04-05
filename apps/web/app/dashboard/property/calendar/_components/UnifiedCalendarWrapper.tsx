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

function StatsBar({ stats }: { stats: Stats }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      notation: "compact",
    }).format(n);

  const items = [
    {
      label: "Occupied tonight",
      value: stats.occupiedTonight,
      color: "text-[#4F46E5]",
    },
    {
      label: "Checking in",
      value: stats.checkInsToday,
      color: "text-[#16A34A]",
    },
    {
      label: "Checking out",
      value: stats.checkOutsToday,
      color: "text-[#E8A020]",
    },
    {
      label: "Available tonight",
      value: stats.availableTonight,
      color: "text-[#16130C]",
    },
    {
      label: "Revenue this month",
      value: fmt(stats.revenueThisMonth),
      color: "text-[#16130C]",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-3 mb-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-xl border border-[#E2DDD5] py-3 px-3 shadow-sm"
        >
          <p className={`font-display text-[20px] lg:text-[22px] font-bold tracking-[-0.02em] leading-none ${item.color}`}>
            {item.value}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            {item.label}
          </p>
        </div>
      ))}
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
      <StatsBar stats={stats} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em]">
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
        <div className="fixed top-4 right-4 z-[60] bg-[#16130C] text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 pointer-events-none">
          <svg className="size-4 text-[#16A34A] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
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
                <div className="px-5 py-4 border-b border-[#E2DDD5]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-[#16130C]">
                        {chooserRoom?.name ?? "Room"}
                      </p>
                      <p className="text-[12px] text-[#9C9485] mt-0.5">
                        {fmtD(dragChooser.checkIn)} → {fmtD(dragChooser.checkOut)} · {nights} night{nights !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button onClick={closeDragChooser} className="size-7 flex items-center justify-center rounded-lg hover:bg-[#F4F1EC] text-[#9C9485]">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {dragChooserMode === "choose" && (
                    <>
                      <button
                        onClick={() => { setNewBookingTarget({ propertyId: dragChooser.propertyId, roomId: dragChooser.roomId, checkIn: dragChooser.checkIn, checkOut: dragChooser.checkOut }); setDragChooser(null); }}
                        className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-[#E2DDD5] hover:border-[#4F46E5]/50 hover:bg-[#4F46E5]/5 transition-colors text-left"
                      >
                        <span className="text-[20px] shrink-0">📅</span>
                        <div>
                          <p className="text-[13px] font-semibold text-[#16130C]">Add booking</p>
                          <p className="text-[11px] text-[#9C9485]">Create a manual booking for these dates</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setDragChooserMode("block")}
                        className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-[#E2DDD5] hover:border-[#9C9485]/50 hover:bg-[#F4F1EC] transition-colors text-left"
                      >
                        <span className="text-[20px] shrink-0">🚫</span>
                        <div>
                          <p className="text-[13px] font-semibold text-[#16130C]">Block dates</p>
                          <p className="text-[11px] text-[#9C9485]">Block this room for maintenance or personal use</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setDragChooserMode("rate")}
                        className="w-full flex items-start gap-3 p-3.5 rounded-xl border-2 border-[#E2DDD5] hover:border-[#E8A020]/50 hover:bg-[#FFFBEB] transition-colors text-left"
                      >
                        <span className="text-[20px] shrink-0">💰</span>
                        <div>
                          <p className="text-[13px] font-semibold text-[#16130C]">Change rate</p>
                          <p className="text-[11px] text-[#9C9485]">Set a custom nightly rate for these specific dates</p>
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
                        className="w-full border border-[#E2DDD5] rounded-xl px-3 py-2.5 text-[13px] text-[#16130C] placeholder:text-[#9C9485] outline-none focus:border-[#9C9485]"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setDragChooserMode("choose")} className="flex-1 py-2.5 rounded-xl border border-[#E2DDD5] text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">← Back</button>
                        <button onClick={handleBlock} disabled={blocking} className="flex-1 py-2.5 rounded-xl bg-[#16130C] text-white text-[13px] font-bold hover:bg-[#2A2416] disabled:opacity-50 transition-colors">
                          {blocking ? "Blocking…" : "Block dates"}
                        </button>
                      </div>
                    </div>
                  )}

                  {dragChooserMode === "rate" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-[#9C9485] mb-1">Rate per night (KSh)</label>
                        <input
                          type="number"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          className="w-full border border-[#E2DDD5] rounded-xl px-3 py-2.5 text-[13px] text-[#16130C] outline-none focus:border-[#E8A020]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setDragChooserMode("choose")} className="flex-1 py-2.5 rounded-xl border border-[#E2DDD5] text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">← Back</button>
                        <button onClick={handleSetRate} disabled={settingRate || !newRate} className="flex-1 py-2.5 rounded-xl bg-[#E8A020] text-white text-[13px] font-bold hover:bg-[#d4911c] disabled:opacity-50 transition-colors">
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
