import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { createClient } from "@/lib/supabase/server";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

const BOOKING_STATUS: Record<string, { label: string; className: string }> = {
  confirmed:   { label: "Confirmed",   className: "bg-[#4F46E5]/15 text-[#4F46E5]" },
  checked_in:  { label: "Checked in",  className: "bg-[#22C55E]/15 text-[#22C55E]" },
  checked_out: { label: "Completed",   className: "bg-[#9C9485]/15 text-[#9C9485]" },
  cancelled:   { label: "Cancelled",   className: "bg-red-100 text-red-600" },
  no_show:     { label: "No show",     className: "bg-red-100 text-red-600" },
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  paid:    { label: "Paid",            className: "bg-[#22C55E]/15 text-[#22C55E]" },
  partial: { label: "Deposit paid",    className: "bg-[#E8A020]/15 text-[#E8A020]" },
  pending: { label: "Payment pending", className: "bg-red-100 text-red-600" },
  refunded:{ label: "Refunded",        className: "bg-[#9C9485]/15 text-[#9C9485]" },
};

type Booking = {
  id: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guest_count: number;
  status: string;
  payment_status: string;
  total_kes: number;
  amount_paid_kes: number;
  balance_kes: number;
  rate_per_night: number;
  subtotal_kes: number;
  discount_kes: number;
  internal_notes: string | null;
  property_id: string;
  room_id: string;
  property: { name: string; address: string | null; check_in_time: string | null } | null;
  room: { name: string } | null;
  booking_fees: Array<{ name: string; amount_kes: number }>;
};

export default async function GuestBookingsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id, check_in_date, check_out_date, nights, guest_count,
      status, payment_status, total_kes, amount_paid_kes, balance_kes,
      rate_per_night, subtotal_kes, discount_kes, internal_notes,
      property_id, room_id,
      property:properties(name, address, check_in_time),
      room:rooms(name),
      booking_fees(name, amount_kes)
    `)
    .eq("guest_user_id", user.id)
    .order("check_in_date", { ascending: false });

  const items = (bookings ?? []) as unknown as Booking[];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-display font-bold text-[#16130C]">My Bookings</h1>
        <p className="text-[14px] text-[#9C9485] mt-1">
          {items.length} booking{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-12 text-center">
          <p className="text-[15px] font-semibold text-[#16130C]">No bookings yet</p>
          <p className="text-[13px] text-[#9C9485] mt-1 mb-6">
            Once a host confirms your enquiry you&apos;ll see your bookings here
          </p>
          <Link
            href="/stays"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8A020] text-white text-[13px] font-semibold rounded-xl hover:bg-[#C78A1A] transition-colors"
          >
            Browse stays
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((b) => {
            const bStatus = BOOKING_STATUS[b.status] ?? BOOKING_STATUS.confirmed;
            const pStatus = PAYMENT_STATUS[b.payment_status] ?? PAYMENT_STATUS.pending;
            const propertyName = (Array.isArray(b.property) ? b.property[0] : b.property)?.name ?? "Property";
            const roomName = (Array.isArray(b.room) ? b.room[0] : b.room)?.name ?? "Room";
            const propData = Array.isArray(b.property) ? b.property[0] : b.property;
            const fees = b.booking_fees ?? [];
            const balance = b.balance_kes ?? (b.total_kes - b.amount_paid_kes);

            return (
              <div key={b.id} className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
                {/* Card header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-[#16130C] truncate">{propertyName}</p>
                      <p className="text-[13px] text-[#9C9485] mt-0.5">{roomName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${bStatus.className}`}>
                        {bStatus.label}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${pStatus.className}`}>
                        {pStatus.label}
                      </span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-[#16130C]">
                    <span>
                      <span className="text-[#9C9485]">Check-in:</span>{" "}
                      {formatDate(b.check_in_date)}
                    </span>
                    <span>
                      <span className="text-[#9C9485]">Check-out:</span>{" "}
                      {formatDate(b.check_out_date)}
                    </span>
                    <span className="text-[#9C9485]">
                      {b.nights} night{b.nights !== 1 ? "s" : ""} · {b.guest_count} guest{b.guest_count !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Financial summary */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                    <span>
                      <span className="text-[#9C9485]">Total:</span>{" "}
                      <span className="font-semibold text-[#16130C]">{fmt(b.total_kes)}</span>
                    </span>
                    <span>
                      <span className="text-[#9C9485]">Paid:</span>{" "}
                      <span className="font-semibold text-[#16130C]">{fmt(b.amount_paid_kes)}</span>
                    </span>
                    {balance > 0 && (
                      <span>
                        <span className="text-[#9C9485]">Balance due:</span>{" "}
                        <span className="font-semibold text-red-600">{fmt(balance)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable detail */}
                <details className="group">
                  <summary className="flex items-center gap-1.5 px-5 py-3 border-t border-[#F0EDE8] text-[12px] font-medium text-[#9C9485] hover:text-[#16130C] cursor-pointer transition-colors select-none list-none">
                    <svg className="size-3.5 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                    Full breakdown
                  </summary>

                  <div className="px-5 pb-5 pt-3 border-t border-[#F0EDE8] space-y-4">
                    {/* Booking ref */}
                    <div>
                      <p className="text-[11px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">Booking reference</p>
                      <p className="text-[13px] font-mono text-[#16130C]">{shortId(b.id)}</p>
                    </div>

                    {/* Financial breakdown */}
                    <div>
                      <p className="text-[11px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">Financials</p>
                      <div className="space-y-1.5 text-[13px]">
                        <div className="flex justify-between">
                          <span className="text-[#9C9485]">
                            {fmt(b.rate_per_night)} × {b.nights} night{b.nights !== 1 ? "s" : ""}
                          </span>
                          <span className="text-[#16130C]">{fmt(b.subtotal_kes)}</span>
                        </div>
                        {b.discount_kes > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[#22C55E]">Discount</span>
                            <span className="text-[#22C55E]">−{fmt(b.discount_kes)}</span>
                          </div>
                        )}
                        {fees.map((f, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-[#9C9485]">{f.name}</span>
                            <span className="text-[#16130C]">{fmt(f.amount_kes)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-semibold border-t border-[#F0EDE8] pt-1.5">
                          <span className="text-[#16130C]">Total</span>
                          <span className="text-[#16130C]">{fmt(b.total_kes)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#9C9485]">Paid</span>
                          <span className="text-[#22C55E] font-medium">{fmt(b.amount_paid_kes)}</span>
                        </div>
                        {balance > 0 && (
                          <div className="flex justify-between font-semibold">
                            <span className="text-red-600">Balance due</span>
                            <span className="text-red-600">{fmt(balance)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Property info */}
                    {propData && (propData.address || propData.check_in_time) && (
                      <div>
                        <p className="text-[11px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">Property info</p>
                        <div className="space-y-1 text-[13px] text-[#16130C]">
                          {propData.address && <p>{propData.address}</p>}
                          {propData.check_in_time && (
                            <p>
                              <span className="text-[#9C9485]">Check-in time:</span>{" "}
                              {propData.check_in_time}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/dashboard/guest/enquiries"
          className="text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
        >
          ← View my enquiries
        </Link>
      </div>
    </div>
  );
}
