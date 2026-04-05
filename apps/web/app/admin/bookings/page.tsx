import { adminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_TABS = [
  { label: "All",          value: "all" },
  { label: "Confirmed",    value: "confirmed" },
  { label: "Checked in",  value: "checked_in" },
  { label: "Checked out", value: "checked_out" },
  { label: "Cancelled",   value: "cancelled" },
] as const;

const PAYMENT_TABS = [
  { label: "All",     value: "all" },
  { label: "Paid",    value: "paid" },
  { label: "Partial", value: "partial" },
  { label: "Pending", value: "pending" },
] as const;

const PER_PAGE = 50;

function fmt(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const BOOKING_STATUS_BADGE: Record<string, string> = {
  confirmed:   "bg-[#4F46E5]/15 text-[#4F46E5]",
  checked_in:  "bg-[#22C55E]/15 text-[#22C55E]",
  checked_out: "bg-[#9C9485]/15 text-[#9C9485]",
  cancelled:   "bg-red-100 text-red-600",
  no_show:     "bg-red-100 text-red-600",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid:     "bg-[#22C55E]/15 text-[#22C55E]",
  partial:  "bg-[#E8A020]/15 text-[#E8A020]",
  pending:  "bg-red-100 text-red-600",
  refunded: "bg-[#9C9485]/15 text-[#9C9485]",
};

const SOURCE_BADGE: Record<string, string> = {
  direct:      "bg-[#4F46E5]/10 text-[#4F46E5]",
  airbnb:      "bg-[#FF5A5F]/10 text-[#FF5A5F]",
  booking_com: "bg-[#003580]/10 text-[#003580]",
  manual:      "bg-[#9C9485]/10 text-[#9C9485]",
  walkin:      "bg-[#E8A020]/10 text-[#E8A020]",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const status = params.status || "all";
  const payment = params.payment || "all";
  const q = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PER_PAGE;

  let query = adminClient
    .from("bookings")
    .select(
      `id, guest_name, guest_email, check_in_date, check_out_date, nights,
       total_kes, amount_paid_kes, balance_kes, status, payment_status,
       source, created_at, property_id, room_id,
       property:properties(name),
       room:rooms(name)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (payment !== "all") query = query.eq("payment_status", payment);
  if (q) query = query.or(`guest_name.ilike.%${q}%,guest_email.ilike.%${q}%`);

  query = query.range(offset, offset + PER_PAGE - 1);

  const { data: bookings, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const items = bookings ?? [];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (status !== "all") base.status = status;
    if (payment !== "all") base.payment = payment;
    if (q) base.q = q;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...overrides };
    if (merged.status === "all") delete merged.status;
    if (merged.payment === "all") delete merged.payment;
    if (merged.page === "1") delete merged.page;
    if (!merged.q) delete merged.q;
    const qs = new URLSearchParams(merged as Record<string, string>).toString();
    return `/admin/bookings${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold text-[#16130C]">All Bookings</h1>
          <p className="text-[14px] text-[#9C9485] mt-1">
            {totalCount} booking{totalCount !== 1 ? "s" : ""} across all properties
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
        {/* Filters bar */}
        <div className="flex flex-col gap-3 px-6 pt-5 pb-0">
          {/* Status tabs */}
          <nav className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const isActive = status === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={buildUrl({ status: tab.value, page: "1" })}
                  className={`px-3 py-2 text-[13px] font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-[#E8A020] border-[#E8A020]"
                      : "text-[#9C9485] border-transparent hover:text-[#16130C]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            <span className="px-2 text-[#F0EDE8]">|</span>
            {PAYMENT_TABS.map((tab) => {
              const isActive = payment === tab.value;
              return (
                <Link
                  key={`pay-${tab.value}`}
                  href={buildUrl({ payment: tab.value, page: "1" })}
                  className={`px-3 py-2 text-[13px] font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-[#4F46E5] border-[#4F46E5]"
                      : "text-[#9C9485] border-transparent hover:text-[#16130C]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <form action="/admin/bookings" method="get" className="pb-4">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            {payment !== "all" && <input type="hidden" name="payment" value={payment} />}
            <div className="relative max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9C9485]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search guest name or email..."
                className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#F0EDE8] bg-[#F7F5F2] text-[#16130C] placeholder:text-[#9C9485] focus:outline-none focus:ring-2 focus:ring-[#E8A020]/30 focus:border-[#E8A020]"
              />
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Guest</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Property / Room</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Dates</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Total</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Paid</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Balance</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Status</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Payment</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium whitespace-nowrap">Source</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase text-[#9C9485] tracking-wider font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center text-[14px] text-[#9C9485]">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                items.map((b: Record<string, unknown>) => {
                  const prop = Array.isArray(b.property) ? b.property[0] : b.property as Record<string, string> | null;
                  const room = Array.isArray(b.room) ? b.room[0] : b.room as Record<string, string> | null;
                  const balance = (b.balance_kes as number) ?? 0;

                  return (
                    <tr key={b.id as string} className="border-b border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-[#16130C]">{(b.guest_name as string) || "—"}</p>
                        {b.guest_email ? (
                          <p className="text-[12px] text-[#9C9485] truncate max-w-[160px]">{b.guest_email as string}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[#16130C]">{prop?.name || "—"}</p>
                        <p className="text-[12px] text-[#9C9485]">{room?.name || "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-[#16130C]">{formatDate(b.check_in_date as string)}</p>
                        <p className="text-[12px] text-[#9C9485]">→ {formatDate(b.check_out_date as string)} · {b.nights as number}n</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-[#16130C] whitespace-nowrap">
                        {fmt(b.total_kes as number)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#16130C] whitespace-nowrap">
                        {fmt(b.amount_paid_kes as number)}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-medium whitespace-nowrap ${balance > 0 ? "text-red-600" : "text-[#9C9485]"}`}>
                        {balance > 0 ? fmt(balance) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${BOOKING_STATUS_BADGE[b.status as string] || "bg-[#F0EDE8] text-[#9C9485]"}`}>
                          {(b.status as string)?.replace("_", " ") ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${PAYMENT_STATUS_BADGE[b.payment_status as string] || "bg-[#F0EDE8] text-[#9C9485]"}`}>
                          {(b.payment_status as string) ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${SOURCE_BADGE[b.source as string] || "bg-[#F0EDE8] text-[#9C9485]"}`}>
                          {(b.source as string) ?? "direct"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/bookings/${b.id}`}
                          className="text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[#F0EDE8]">
            <p className="text-[13px] text-[#9C9485]">
              Showing {offset + 1}–{Math.min(offset + PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-[#16130C] hover:bg-[#F7F5F2] transition-colors">
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-[#9C9485] opacity-50 cursor-not-allowed">Previous</span>
              )}
              {page < totalPages ? (
                <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-[#16130C] hover:bg-[#F7F5F2] transition-colors">
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-[#9C9485] opacity-50 cursor-not-allowed">Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
