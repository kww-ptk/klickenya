"use client";

import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { CalendarGrid } from "./CalendarGrid";
import { NewBookingSidePanel } from "./NewBookingSidePanel";

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

export function PropertyCalendarWrapper({
  propertyId,
  rooms,
  bookings,
  blockedDates,
}: {
  propertyId: string;
  rooms: Room[];
  bookings: Booking[];
  blockedDates: BlockedDate[];
}) {
  const [newBookingTarget, setNewBookingTarget] = useState<{
    roomId: string;
    checkIn: string;
    checkOut: string;
  } | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowStr = (() => {
    const d = new Date(todayStr + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })();

  return (
    <ToastProvider>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em]">
          Availability Calendar
        </h2>
        <button
          onClick={() => {
            if (rooms.length > 0) {
              setNewBookingTarget({
                roomId: rooms[0].id,
                checkIn: todayStr,
                checkOut: tomorrowStr,
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

      <CalendarGrid
        propertyId={propertyId}
        rooms={rooms}
        bookings={bookings}
        blockedDates={blockedDates}
      />

      {newBookingTarget && rooms.length > 0 && (
        <NewBookingSidePanel
          roomId={newBookingTarget.roomId}
          date={newBookingTarget.checkIn}
          checkOutDate={newBookingTarget.checkOut}
          rooms={rooms}
          propertyId={propertyId}
          onClose={() => setNewBookingTarget(null)}
          onCreated={() => setNewBookingTarget(null)}
        />
      )}
    </ToastProvider>
  );
}
