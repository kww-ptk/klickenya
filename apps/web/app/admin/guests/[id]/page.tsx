import { adminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

function fmt(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const BOOKING_STATUS_BADGE: Record<string, string> = {
  confirmed:   "bg-[#4F46E5]/15 text-[#4F46E5]",
  checked_in:  "bg-[#22C55E]/15 text-[#22C55E]",
  checked_out: "bg-text3/15 text-text3",
  cancelled:   "bg-red-100 text-red-600",
  no_show:     "bg-red-100 text-red-600",
};

const ENQUIRY_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Awaiting response", className: "bg-amber/15 text-amber" },
  held:      { label: "On hold",           className: "bg-[#4F46E5]/15 text-[#4F46E5]" },
  converted: { label: "Booking confirmed", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  declined:  { label: "Declined",          className: "bg-text3/15 text-text3" },
};

export default async function AdminGuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch auth user + their bookings + enquiries in parallel
  const [userRes, bookingsRes, enquiriesRes] = await Promise.all([
    adminClient.auth.admin.getUserById(id),
    adminClient
      .from("bookings")
      .select(`
        id, check_in_date, check_out_date, nights, status, payment_status,
        total_kes, amount_paid_kes, balance_kes, created_at,
        property:properties(name),
        room:rooms(name)
      `)
      .eq("guest_user_id", id)
      .order("check_in_date", { ascending: false }),
    adminClient
      .from("contact_requests")
      .select("id, listing_title, check_in, check_out, calendar_status, created_at")
      .eq("guest_user_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!userRes.data?.user) notFound();

  const user = userRes.data.user;
  const meta = user.user_metadata ?? {};
  const displayName = meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Guest";
  const bookings = bookingsRes.data ?? [];
  const enquiries = enquiriesRes.data ?? [];

  const totalSpend = bookings.reduce((sum, b) => sum + (b.total_kes ?? 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + (b.amount_paid_kes ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/admin/guests"
        className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to guests
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-[22px] font-display font-bold text-dark">{displayName}</h1>
        <p className="text-[14px] text-text3 mt-1">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">

          {/* Bookings */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EDE8]">
              <h2 className="text-[16px] font-display font-bold text-dark">
                Bookings <span className="text-text3 font-normal text-[14px]">({bookings.length})</span>
              </h2>
              <Link href={`/admin/bookings?q=${encodeURIComponent(user.email ?? "")}`} className="text-[12px] text-amber hover:text-[#C78A1A]">
                View in bookings →
              </Link>
            </div>
            {bookings.length === 0 ? (
              <p className="px-6 py-8 text-[14px] text-text3 text-center">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-[#F0EDE8]">
                {bookings.map((b) => {
                  const prop = Array.isArray(b.property) ? b.property[0] : b.property as Record<string, string> | null;
                  const room = Array.isArray(b.room) ? b.room[0] : b.room as Record<string, string> | null;
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-dark">{prop?.name ?? "—"} · {room?.name ?? "—"}</p>
                        <p className="text-[12px] text-text3 mt-0.5">
                          {formatDate(b.check_in_date)} → {formatDate(b.check_out_date)} · {b.nights}n
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${BOOKING_STATUS_BADGE[b.status] || "bg-[#F0EDE8] text-text3"}`}>
                          {b.status?.replace("_", " ") ?? "—"}
                        </span>
                        <span className="text-[13px] font-semibold text-dark whitespace-nowrap">{fmt(b.total_kes)}</span>
                        <Link href={`/admin/bookings/${b.id}`} className="text-[12px] text-amber hover:text-[#C78A1A]">View</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enquiries */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F0EDE8]">
              <h2 className="text-[16px] font-display font-bold text-dark">
                Enquiries <span className="text-text3 font-normal text-[14px]">({enquiries.length})</span>
              </h2>
            </div>
            {enquiries.length === 0 ? (
              <p className="px-6 py-8 text-[14px] text-text3 text-center">No enquiries.</p>
            ) : (
              <div className="divide-y divide-[#F0EDE8]">
                {enquiries.map((e) => {
                  const badge = ENQUIRY_STATUS_LABELS[e.calendar_status ?? "pending"] ?? ENQUIRY_STATUS_LABELS.pending;
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-4 px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-dark truncate">{e.listing_title ?? "Property enquiry"}</p>
                        <p className="text-[12px] text-text3 mt-0.5">
                          {e.check_in && e.check_out ? `${formatDate(e.check_in)} → ${formatDate(e.check_out)}` : "No dates"}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Profile */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[16px] font-display font-bold text-dark">Profile</h2>
            <div className="space-y-3 text-[13px]">
              <div>
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1">Email</p>
                <a href={`mailto:${user.email}`} className="text-amber hover:underline">{user.email}</a>
              </div>
              {meta.phone ? (
                <div>
                  <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1">Phone</p>
                  <a href={`tel:${String(meta.phone)}`} className="text-amber hover:underline">{String(meta.phone)}</a>
                </div>
              ) : null}
              <div>
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1">Joined</p>
                <p className="text-dark">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text3 uppercase tracking-wider font-medium mb-1">User ID</p>
                <p className="font-mono text-[12px] text-text3 break-all">{user.id}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[16px] font-display font-bold text-dark">Stats</h2>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-text3">Bookings</span>
                <span className="font-semibold text-dark">{bookings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Enquiries</span>
                <span className="text-dark">{enquiries.length}</span>
              </div>
              <div className="border-t border-[#F0EDE8] pt-3 flex justify-between">
                <span className="text-text3">Total billed</span>
                <span className="font-semibold text-dark">{totalSpend > 0 ? fmt(totalSpend) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text3">Total paid</span>
                <span className="font-semibold text-[#22C55E]">{totalPaid > 0 ? fmt(totalPaid) : "—"}</span>
              </div>
              {totalSpend > totalPaid && (
                <div className="flex justify-between">
                  <span className="text-text3">Balance due</span>
                  <span className="font-semibold text-red-600">{fmt(totalSpend - totalPaid)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
