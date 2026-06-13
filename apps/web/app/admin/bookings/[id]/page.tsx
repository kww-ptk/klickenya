import { adminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

function fmt(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDatetime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

const BOOKING_STATUS_BADGE: Record<string, string> = {
  confirmed:   "bg-[#4F46E5]/15 text-[#4F46E5]",
  checked_in:  "bg-[#22C55E]/15 text-[#22C55E]",
  checked_out: "bg-text3/15 text-text3",
  cancelled:   "bg-red-100 text-red-600",
  no_show:     "bg-red-100 text-red-600",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid:     "bg-[#22C55E]/15 text-[#22C55E]",
  partial:  "bg-amber/15 text-amber",
  pending:  "bg-red-100 text-red-600",
  refunded: "bg-text3/15 text-text3",
};

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bookingRes, feesRes, paymentsRes] = await Promise.all([
    adminClient
      .from("bookings")
      .select(`
        id, guest_name, guest_email, guest_phone, guest_count, guest_notes,
        check_in_date, check_out_date, nights,
        rate_per_night, subtotal_kes, discount_kes, extras_kes,
        total_kes, amount_paid_kes, balance_kes,
        status, payment_status, source, mpesa_ref,
        internal_notes, created_at, updated_at,
        property_id, room_id, guest_user_id,
        property:properties(id, name, address, check_in_time, owner_id),
        room:rooms(name)
      `)
      .eq("id", id)
      .single(),
    adminClient
      .from("booking_fees")
      .select("name, fee_type, amount_kes")
      .eq("booking_id", id)
      .order("amount_kes", { ascending: false }),
    adminClient
      .from("booking_payments")
      .select("id, amount_kes, method, notes, recorded_by, created_at")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const booking = bookingRes.data;
  if (!booking) notFound();

  const fees = feesRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const prop = Array.isArray(booking.property) ? booking.property[0] : booking.property as Record<string, string> | null;
  const room = Array.isArray(booking.room) ? booking.room[0] : booking.room as Record<string, string> | null;
  const balance = booking.balance_kes ?? (booking.total_kes - booking.amount_paid_kes);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to all bookings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-display font-bold text-dark">
            Booking #{shortId(booking.id)}
          </h1>
          <p className="text-[14px] text-text3 mt-1">
            {booking.guest_name} · {prop?.name ?? "—"} · {formatDate(booking.check_in_date)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${BOOKING_STATUS_BADGE[booking.status] || "bg-[#F0EDE8] text-text3"}`}>
            {booking.status?.replace("_", " ") ?? "—"}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${PAYMENT_STATUS_BADGE[booking.payment_status] || "bg-[#F0EDE8] text-text3"}`}>
            {booking.payment_status ?? "—"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — main detail */}
        <div className="lg:col-span-2 space-y-6">

          {/* Guest info */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[16px] font-display font-bold text-dark">Guest</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" value={booking.guest_name} />
              <Field label="Email" value={booking.guest_email} href={booking.guest_email ? `mailto:${booking.guest_email}` : undefined} />
              <Field label="Phone" value={booking.guest_phone} href={booking.guest_phone ? `tel:${booking.guest_phone}` : undefined} />
              <Field label="Guests" value={String(booking.guest_count ?? 1)} />
              {booking.guest_user_id && (
                <Field label="Guest user ID" value={booking.guest_user_id} mono />
              )}
              {booking.guest_notes && (
                <div className="sm:col-span-2">
                  <Field label="Guest notes" value={booking.guest_notes} />
                </div>
              )}
            </div>
          </div>

          {/* Stay details */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[16px] font-display font-bold text-dark">Stay</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Property" value={prop?.name} />
              <Field label="Room" value={room?.name} />
              <Field label="Check-in" value={formatDate(booking.check_in_date)} />
              <Field label="Check-out" value={formatDate(booking.check_out_date)} />
              <Field label="Nights" value={String(booking.nights ?? "—")} />
              <Field label="Source" value={booking.source ?? "direct"} />
              {prop?.address && <Field label="Address" value={prop.address} />}
              {prop?.check_in_time && <Field label="Check-in time" value={prop.check_in_time} />}
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[16px] font-display font-bold text-dark">Financials</h2>
            <div className="space-y-2 text-[13px]">
              <FinRow label={`${fmt(booking.rate_per_night)} × ${booking.nights} night${booking.nights !== 1 ? "s" : ""}`} value={fmt(booking.subtotal_kes)} />
              {booking.discount_kes > 0 && (
                <FinRow label="Discount" value={`−${fmt(booking.discount_kes)}`} green />
              )}
              {fees.map((f: Record<string, unknown>, i: number) => (
                <FinRow key={i} label={String(f.name)} value={fmt(f.amount_kes as number)} />
              ))}
              {(booking.extras_kes ?? 0) > 0 && (
                <FinRow label="Extras / upsells" value={fmt(booking.extras_kes ?? 0)} />
              )}
              <div className="border-t border-[#F0EDE8] pt-2">
                <FinRow label="Total" value={fmt(booking.total_kes)} bold />
              </div>
              <FinRow label="Amount paid" value={fmt(booking.amount_paid_kes)} />
              {balance > 0 && <FinRow label="Balance due" value={fmt(balance)} red />}
              {booking.mpesa_ref && <Field label="M-Pesa ref" value={booking.mpesa_ref} />}
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
              <h2 className="text-[16px] font-display font-bold text-dark">Payment history</h2>
              <div className="space-y-2">
                {payments.map((p: Record<string, unknown>) => (
                  <div key={p.id as string} className="flex items-start justify-between gap-3 text-[13px] py-2 border-b border-[#F0EDE8] last:border-0">
                    <div>
                      <p className="font-medium text-dark">{fmt(p.amount_kes as number)}</p>
                      <p className="text-[12px] text-text3">
                        {String(p.method ?? "cash")} · {formatDatetime(p.created_at as string)}
                      </p>
                      {p.notes ? <p className="text-[12px] text-text3 mt-0.5">{String(p.notes)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal notes */}
          {booking.internal_notes && (
            <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
              <h2 className="text-[16px] font-display font-bold text-dark">Internal notes</h2>
              <div className="bg-[#F7F5F2] rounded-xl p-4 text-[13px] text-dark leading-relaxed whitespace-pre-wrap">
                {booking.internal_notes}
              </div>
            </div>
          )}
        </div>

        {/* Right — sidebar */}
        <div className="space-y-6">
          {/* Quick info */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[16px] font-display font-bold text-dark">Quick info</h2>
            <div className="space-y-2 text-[13px]">
              <div>
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium">Booking ref</p>
                <p className="font-mono text-dark">{shortId(booking.id)}</p>
              </div>
              <div>
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium">Created</p>
                <p className="text-dark">{formatDatetime(booking.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[16px] font-display font-bold text-dark">Links</h2>
            {booking.guest_email && (
              <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Email guest
              </a>
            )}
            {booking.guest_phone && (
              <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Call guest
              </a>
            )}
            {prop?.id && (
              <Link href={`/dashboard/property/${prop.id}`} className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
                View property dashboard
              </Link>
            )}
            {booking.guest_user_id && (
              <Link href={`/admin/guests/${booking.guest_user_id}`} className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                View guest profile
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, href, mono }: { label: string; value?: string | null; href?: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1">{label}</p>
      {href ? (
        <a href={href} className={`text-[14px] text-amber hover:underline ${mono ? "font-mono text-[13px]" : ""}`}>
          {value ?? "—"}
        </a>
      ) : (
        <p className={`text-[14px] text-dark ${mono ? "font-mono text-[13px]" : ""}`}>{value ?? "—"}</p>
      )}
    </div>
  );
}

function FinRow({ label, value, bold, green, red }: { label: string; value: string; bold?: boolean; green?: boolean; red?: boolean }) {
  const valueClass = green ? "text-[#22C55E]" : red ? "text-red-600 font-semibold" : "text-dark";
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-semibold text-dark" : "text-text3"}>{label}</span>
      <span className={`${bold ? "font-semibold" : ""} ${valueClass}`}>{value}</span>
    </div>
  );
}
