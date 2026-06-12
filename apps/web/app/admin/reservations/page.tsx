import { adminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_TABS = [
  { label: "All",       value: "all" },
  { label: "Pending",   value: "pending" },
  { label: "Approved",  value: "approved" },
  { label: "Declined",  value: "declined" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No-show",   value: "no_show" },
] as const;

const PER_PAGE = 50;

const RESERVATION_STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber/15 text-amber",
  approved:  "bg-[#22C55E]/15 text-[#22C55E]",
  declined:  "bg-red-100 text-red-600",
  cancelled: "bg-text3/15 text-text3",
  completed: "bg-[#4F46E5]/15 text-[#4F46E5]",
  no_show:   "bg-red-100 text-red-600",
};

function formatNairobiDateTime(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "all";
  const q = params.q ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PER_PAGE;

  let query = adminClient
    .from("reservations")
    .select(
      `id, guest_name, guest_email, party_size, reserved_for, status, created_at, menu_id,
       menu:menus(display_name, slug)`,
      { count: "exact" },
    )
    .order("reserved_for", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`guest_name.ilike.%${q}%,guest_email.ilike.%${q}%`);
  query = query.range(offset, offset + PER_PAGE - 1);

  const { data: reservations, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const items = reservations ?? [];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (status !== "all") base.status = status;
    if (q) base.q = q;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...overrides };
    if (merged.status === "all") delete merged.status;
    if (merged.page === "1") delete merged.page;
    if (!merged.q) delete merged.q;
    const qs = new URLSearchParams(merged as Record<string, string>).toString();
    return `/admin/reservations${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold text-dark">All Reservations</h1>
          <p className="text-[14px] text-text3 mt-1">
            {totalCount} reservation{totalCount !== 1 ? "s" : ""} across all restaurants
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
                      ? "text-amber border-amber"
                      : "text-text3 border-transparent hover:text-dark"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <form action="/admin/reservations" method="get" className="pb-4">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <div className="relative max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search guest name or email..."
                className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#F0EDE8] bg-[#F7F5F2] text-dark placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
              />
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                <th className="text-left px-5 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium whitespace-nowrap">Guest</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium whitespace-nowrap">Restaurant</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium whitespace-nowrap">Date / Time</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium whitespace-nowrap">Party</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium whitespace-nowrap">Status</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-[14px] text-text3">
                    No reservations found.
                  </td>
                </tr>
              ) : (
                items.map((r: Record<string, unknown>) => {
                  const menu = Array.isArray(r.menu) ? r.menu[0] : r.menu as Record<string, string> | null;
                  const { date, time } = formatNairobiDateTime(r.reserved_for as string);
                  return (
                    <tr key={r.id as string} className="border-b border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-dark">{(r.guest_name as string) || "—"}</p>
                        {r.guest_email ? (
                          <p className="text-[12px] text-text3 truncate max-w-[160px]">{r.guest_email as string}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-dark">{menu?.display_name ?? menu?.slug ?? "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-dark">{date}</p>
                        <p className="text-[12px] text-text3">{time}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-dark">
                        {r.party_size as number} {(r.party_size as number) === 1 ? "person" : "people"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${RESERVATION_STATUS_BADGE[r.status as string] ?? "bg-[#F0EDE8] text-text3"}`}>
                          {(r.status as string)?.replace("_", "-") ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/reservations/${r.id}`}
                          className="text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
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
            <p className="text-[13px] text-text3">
              Showing {offset + 1}–{Math.min(offset + PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-dark hover:bg-[#F7F5F2] transition-colors">
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-text3 opacity-50 cursor-not-allowed">Previous</span>
              )}
              {page < totalPages ? (
                <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-dark hover:bg-[#F7F5F2] transition-colors">
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-text3 opacity-50 cursor-not-allowed">Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
