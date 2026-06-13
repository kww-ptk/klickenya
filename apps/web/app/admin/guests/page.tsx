import { adminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const PER_PAGE = 50;

function fmt(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PER_PAGE;

  // Fetch guests: users who have at least one booking or contact_request linked via guest_user_id
  // We use a raw RPC-style approach via adminClient: query bookings group by guest_user_id
  // then join with auth.users. Since we can't join auth.users directly in PostgREST, we:
  // 1. Get distinct guest_user_ids from bookings + contact_requests
  // 2. Fetch their auth.users records via admin auth API in batches

  // Step 1: aggregate per guest
  const [bookingAgg, enquiryAgg] = await Promise.all([
    adminClient
      .from("bookings")
      .select("guest_user_id, total_kes, created_at")
      .not("guest_user_id", "is", null),
    adminClient
      .from("contact_requests")
      .select("guest_user_id, created_at")
      .not("guest_user_id", "is", null),
  ]);

  type GuestRow = {
    id: string;
    bookingCount: number;
    enquiryCount: number;
    totalSpend: number;
    lastActivity: string;
    email?: string;
    name?: string;
    createdAt?: string;
  };

  // Build a map of guest stats
  const guestMap = new Map<string, GuestRow>();

  for (const b of bookingAgg.data ?? []) {
    if (!b.guest_user_id) continue;
    const existing = guestMap.get(b.guest_user_id);
    if (existing) {
      existing.bookingCount += 1;
      existing.totalSpend += b.total_kes ?? 0;
      if (b.created_at > existing.lastActivity) existing.lastActivity = b.created_at;
    } else {
      guestMap.set(b.guest_user_id, {
        id: b.guest_user_id,
        bookingCount: 1,
        enquiryCount: 0,
        totalSpend: b.total_kes ?? 0,
        lastActivity: b.created_at,
      });
    }
  }

  for (const e of enquiryAgg.data ?? []) {
    if (!e.guest_user_id) continue;
    const existing = guestMap.get(e.guest_user_id);
    if (existing) {
      existing.enquiryCount += 1;
      if (e.created_at > existing.lastActivity) existing.lastActivity = e.created_at;
    } else {
      guestMap.set(e.guest_user_id, {
        id: e.guest_user_id,
        bookingCount: 0,
        enquiryCount: 1,
        totalSpend: 0,
        lastActivity: e.created_at,
      });
    }
  }

  // Sort by lastActivity desc
  let allGuests = Array.from(guestMap.values()).sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  // Fetch auth user details for current page of guests
  const totalCount = allGuests.length;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const pageGuests = allGuests.slice(offset, offset + PER_PAGE);

  // Enrich with auth user data
  const enriched = await Promise.all(
    pageGuests.map(async (g) => {
      try {
        const { data } = await adminClient.auth.admin.getUserById(g.id);
        const meta = data.user?.user_metadata ?? {};
        const email = data.user?.email ?? "";
        const name = meta.full_name ?? meta.name ?? email.split("@")[0] ?? "Guest";
        const createdAt = data.user?.created_at;
        return { ...g, email, name, createdAt };
      } catch {
        return { ...g, email: "", name: "Unknown" };
      }
    })
  );

  // Apply search filter after enrichment
  const filtered = q
    ? enriched.filter(
        (g) =>
          g.name?.toLowerCase().includes(q.toLowerCase()) ||
          g.email?.toLowerCase().includes(q.toLowerCase())
      )
    : enriched;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (q) base.q = q;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...overrides };
    if (merged.page === "1") delete merged.page;
    if (!merged.q) delete merged.q;
    const qs = new URLSearchParams(merged as Record<string, string>).toString();
    return `/admin/guests${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold text-dark">Guests</h1>
          <p className="text-[14px] text-text3 mt-1">
            {totalCount} registered guest{totalCount !== 1 ? "s" : ""} with activity
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
        {/* Search */}
        <div className="px-6 pt-5 pb-4">
          <form action="/admin/guests" method="get" className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name or email..."
              className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#F0EDE8] bg-[#F7F5F2] text-dark placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
            />
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">Guest</th>
                <th className="text-right px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">Bookings</th>
                <th className="text-right px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">Enquiries</th>
                <th className="text-right px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">Total spend</th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">Last activity</th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">Joined</th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[14px] text-text3">
                    No guests found.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr key={g.id} className="border-b border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-dark">{g.name}</p>
                      {g.email && <p className="text-[12px] text-text3">{g.email}</p>}
                    </td>
                    <td className="px-6 py-3.5 text-right text-dark font-medium">{g.bookingCount}</td>
                    <td className="px-6 py-3.5 text-right text-text3">{g.enquiryCount}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-dark whitespace-nowrap">
                      {g.totalSpend > 0 ? fmt(g.totalSpend) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-text3 whitespace-nowrap">
                      {formatDate(g.lastActivity)}
                    </td>
                    <td className="px-6 py-3.5 text-text3 whitespace-nowrap">
                      {g.createdAt ? formatDate(g.createdAt) : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/admin/guests/${g.id}`}
                        className="text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > PER_PAGE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0EDE8]">
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
