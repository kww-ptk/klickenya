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
} from "./UnifiedCalendarGrid";
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
  stats: Stats;
}

export function UnifiedCalendarWrapper({
  properties,
  rooms,
  bookings: initialBookings,
  blockedDates,
  stats,
}: UnifiedCalendarWrapperProps) {
  const [bookings, setBookings] = useState<BookingWithProperty[]>(initialBookings);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithProperty | null>(null);
  const [newBookingTarget, setNewBookingTarget] = useState<{
    propertyId: string;
    roomId: string;
    date: string;
  } | null>(null);

  // Realtime subscriptions — one per property
  useEffect(() => {
    const supabase = createClient();
    const channels = properties.map((p) =>
      supabase
        .channel(`unified-bookings-${p.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "bookings",
            filter: `property_id=eq.${p.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setBookings((prev) => [
                ...prev,
                { ...(payload.new as BookingWithProperty) },
              ]);
            } else if (payload.eventType === "UPDATE") {
              setBookings((prev) =>
                prev.map((b) =>
                  b.id === (payload.new as BookingWithProperty).id
                    ? (payload.new as BookingWithProperty)
                    : b
                )
              );
            } else if (payload.eventType === "DELETE") {
              setBookings((prev) =>
                prev.filter(
                  (b) => b.id !== (payload.old as { id: string }).id
                )
              );
            }
          }
        )
        .subscribe()
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [properties]);

  const todayStr = new Date().toISOString().split("T")[0];

  const roomsForProperty = (propertyId: string) =>
    rooms.filter((r) => r.property_id === propertyId);

  return (
    <ToastProvider>
      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em]">
          All Properties Calendar
        </h2>
        <button
          onClick={() => {
            // Default to first property's first room
            const firstProp = properties[0];
            const firstRoom = rooms.find((r) => r.property_id === firstProp?.id);
            if (firstProp && firstRoom) {
              setNewBookingTarget({
                propertyId: firstProp.id,
                roomId: firstRoom.id,
                date: todayStr,
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
        onClickBooking={(booking) => setSelectedBooking(booking)}
        onClickEmpty={(propertyId, roomId, date) =>
          setNewBookingTarget({ propertyId, roomId, date })
        }
      />

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

      {/* New booking panel */}
      {newBookingTarget && (
        <NewBookingSidePanel
          roomId={newBookingTarget.roomId}
          date={newBookingTarget.date}
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
