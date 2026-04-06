"use client";

import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { BookingSidePanel } from "./BookingSidePanel";
import { EnquiryActionPanel } from "./EnquiryActionPanel";

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

interface Enquiry {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  room_id: string;
  check_in: string;
  check_out: string;
  guests?: number | null;
  calendar_status: string;
  hold_type?: string | null;
  expires_at: string;
  listing_title?: string | null;
  notes?: string | null;
  property_id?: string;
}

export function TodaySnapshot({
  bookings,
  rooms,
  propertyId,
  enquiries = [],
}: {
  bookings: Booking[];
  rooms: Room[];
  propertyId: string;
  enquiries?: Enquiry[];
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const checkIns = bookings.filter(
    (b) => b.check_in_date === todayStr && b.status !== "cancelled"
  );
  const checkOuts = bookings.filter(
    (b) => b.check_out_date === todayStr && b.status !== "cancelled"
  );

  const [expanded, setExpanded] = useState<"checkin" | "checkout" | "enquiries" | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [localEnquiries, setLocalEnquiries] = useState<Enquiry[]>(enquiries);

  const toggle = (key: "checkin" | "checkout" | "enquiries") =>
    setExpanded((prev) => (prev === key ? null : key));

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  return (
    <ToastProvider>
      {/* 3-tile grid */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        {/* Checking in */}
        <button
          onClick={() => checkIns.length > 0 && toggle("checkin")}
          className={`bg-white rounded-xl lg:rounded-2xl border py-3 px-2 lg:p-4 text-center shadow-sm transition-colors ${
            checkIns.length > 0
              ? "cursor-pointer hover:border-[#16A34A]/40 hover:bg-[#F0FDF4]"
              : "cursor-default"
          } ${expanded === "checkin" ? "border-[#16A34A]/40 bg-[#F0FDF4]" : "border-[#E2DDD5]"}`}
        >
          <div className="flex items-center justify-center gap-1">
            <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#16A34A]">
              {checkIns.length}
            </p>
            {checkIns.length > 0 && (
              <svg
                className={`size-3 text-[#16A34A] shrink-0 transition-transform ${expanded === "checkin" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">Checking in</p>
        </button>

        {/* Checking out */}
        <button
          onClick={() => checkOuts.length > 0 && toggle("checkout")}
          className={`bg-white rounded-xl lg:rounded-2xl border py-3 px-2 lg:p-4 text-center shadow-sm transition-colors ${
            checkOuts.length > 0
              ? "cursor-pointer hover:border-[#E8A020]/40 hover:bg-[#FFFBEB]"
              : "cursor-default"
          } ${expanded === "checkout" ? "border-[#E8A020]/40 bg-[#FFFBEB]" : "border-[#E2DDD5]"}`}
        >
          <div className="flex items-center justify-center gap-1">
            <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#E8A020]">
              {checkOuts.length}
            </p>
            {checkOuts.length > 0 && (
              <svg
                className={`size-3 text-[#E8A020] shrink-0 transition-transform ${expanded === "checkout" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">Checking out</p>
        </button>

        {/* Enquiries */}
        <button
          onClick={() => localEnquiries.length > 0 && toggle("enquiries")}
          className={`bg-white rounded-xl lg:rounded-2xl border py-3 px-2 lg:p-4 text-center shadow-sm transition-colors ${
            localEnquiries.length > 0
              ? "cursor-pointer hover:border-[#4F46E5]/40 hover:bg-[#4F46E5]/5"
              : "cursor-default"
          } ${expanded === "enquiries" ? "border-[#4F46E5]/40 bg-[#4F46E5]/5" : "border-[#E2DDD5]"}`}
        >
          <div className="flex items-center justify-center gap-1">
            <p className={`font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none ${localEnquiries.length > 0 ? "text-[#E8A020]" : "text-[#16130C]"}`}>
              {localEnquiries.length}
            </p>
            {localEnquiries.length > 0 && (
              <svg
                className={`size-3 text-[#E8A020] shrink-0 transition-transform ${expanded === "enquiries" ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">Enquiries</p>
        </button>
      </div>

      {/* Expanded booking list */}
      {(expanded === "checkin" || expanded === "checkout") && (
        <div className="mt-2 bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wider px-3 pt-3 pb-1.5">
            {expanded === "checkin" ? "Arriving today" : "Departing today"}
          </p>
          {(expanded === "checkin" ? checkIns : checkOuts).map((b) => {
            const room = rooms.find((r) => r.id === b.room_id);
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBooking(b)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F4F1EC] transition-colors text-left border-t border-[#F4F1EC] first:border-t-0"
              >
                <div className="size-8 rounded-lg bg-[#F4F1EC] flex items-center justify-center shrink-0 text-[14px]">
                  {expanded === "checkin" ? "🏠" : "👋"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#16130C] truncate">{b.guest_name}</p>
                  <p className="text-[11px] text-[#9C9485]">
                    {room?.name ?? "—"} · {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#4F46E5] shrink-0">Open →</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded enquiry list */}
      {expanded === "enquiries" && localEnquiries.length > 0 && (
        <div className="mt-2 bg-white rounded-xl border border-[#E2DDD5] shadow-sm overflow-hidden">
          <p className="text-[10px] font-bold text-[#9C9485] uppercase tracking-wider px-3 pt-3 pb-1.5">
            Pending enquiries
          </p>
          {localEnquiries.map((e) => {
            const room = rooms.find((r) => r.id === e.room_id);
            return (
              <button
                key={e.id}
                onClick={() => setSelectedEnquiry(e)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F4F1EC] transition-colors text-left border-t border-[#F4F1EC] first:border-t-0"
              >
                <div className="size-8 rounded-lg bg-[#E8A020]/10 flex items-center justify-center shrink-0 text-[14px]">
                  ✉️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-semibold text-[#16130C] truncate">{e.full_name}</p>
                    {e.calendar_status === "held" && (
                      <span className="text-[9px] font-bold bg-[#E8A020]/15 text-[#E8A020] px-1.5 py-0.5 rounded-full shrink-0">HELD</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9C9485]">
                    {room?.name ?? "—"} · {fmtDate(e.check_in)} → {fmtDate(e.check_out)}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#4F46E5] shrink-0">Open →</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Booking detail panel */}
      {selectedBooking && (
        <BookingSidePanel
          booking={selectedBooking}
          rooms={rooms}
          propertyId={propertyId}
          onClose={() => setSelectedBooking(null)}
          onBookingUpdated={(updated) => setSelectedBooking(updated)}
        />
      )}

      {/* Enquiry detail panel */}
      {selectedEnquiry && (
        <EnquiryActionPanel
          enquiry={selectedEnquiry}
          rooms={rooms}
          propertyId={propertyId}
          bookings={bookings}
          onClose={() => setSelectedEnquiry(null)}
          onConverted={(booking) => {
            setLocalEnquiries((prev) => prev.filter((e) => e.id !== selectedEnquiry.id));
            setSelectedEnquiry(null);
            setExpanded(null);
          }}
          onDeclined={() => {
            setLocalEnquiries((prev) => prev.filter((e) => e.id !== selectedEnquiry.id));
            setSelectedEnquiry(null);
          }}
          onRoomChanged={(updated) => {
            setLocalEnquiries((prev) =>
              prev.map((e) => (e.id === updated.id ? { ...updated } : e))
            );
            setSelectedEnquiry({ ...updated });
          }}
        />
      )}
    </ToastProvider>
  );
}
