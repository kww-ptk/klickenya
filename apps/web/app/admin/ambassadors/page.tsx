import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteButton } from "../_components/DeleteButton";
import Link from "next/link";

export const revalidate = 0;

const TABS = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
] as const;

const PER_PAGE = 20;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(str: string | null | undefined, max: number) {
  if (!str) return "\u2014";
  return str.length > max ? str.slice(0, max) + "\u2026" : str;
}

export default async function AmbassadorsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const status = params.status || "all";
  const q = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PER_PAGE;

  let query = adminClient
    .from("ambassador_applications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  query = query.range(offset, offset + PER_PAGE - 1);

  const { data: applications, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const items = applications ?? [];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (status !== "all") base.status = status;
    if (q) base.q = q;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...overrides };
    // Remove keys with undefined or default values
    if (merged.status === "all") delete merged.status;
    if (merged.page === "1") delete merged.page;
    if (!merged.q) delete merged.q;
    const qs = new URLSearchParams(
      merged as Record<string, string>
    ).toString();
    return `/admin/ambassadors${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold text-dark">
            Ambassador Applications
          </h1>
          <p className="text-[14px] text-text3 mt-1">
            {totalCount} total application{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-5 pb-0">
          {/* Status tabs */}
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const isActive = status === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={buildUrl({
                    status: tab.value,
                    page: "1",
                  })}
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
          <form
            action="/admin/ambassadors"
            method="get"
            className="relative"
          >
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search name or email..."
              className="w-full sm:w-[260px] pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#F0EDE8] bg-[#F7F5F2] text-dark placeholder:text-text3 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber"
            />
          </form>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Date
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  City
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Social
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-16 text-center text-[14px] text-text3"
                  >
                    No ambassador applications found.
                  </td>
                </tr>
              ) : (
                items.map((app: Record<string, unknown>) => (
                  <tr
                    key={app.id as string}
                    className="border-b border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors"
                  >
                    <td className="px-6 py-3.5 text-dark whitespace-nowrap">
                      {formatDate(app.created_at as string)}
                    </td>
                    <td className="px-6 py-3.5 text-dark font-medium">
                      {(app.name as string) || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 text-dark">
                      {(app.role as string) || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 text-dark">
                      {(app.city as string) || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 text-dark">
                      {truncate(app.social_handle as string, 20)}
                    </td>
                    <td className="px-6 py-3.5 text-dark">
                      {(app.email as string) || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={(app.status as string) || "new"} />
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/ambassadors/${app.id}`}
                          className="text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
                        >
                          View
                        </Link>
                        <DeleteButton table="ambassador_applications" id={app.id as string} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0EDE8]">
            <p className="text-[13px] text-text3">
              Showing {offset + 1}&ndash;
              {Math.min(offset + PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-dark hover:bg-[#F7F5F2] transition-colors"
                >
                  Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-text3 opacity-50 cursor-not-allowed">
                  Previous
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-dark hover:bg-[#F7F5F2] transition-colors"
                >
                  Next
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-[13px] font-medium rounded-lg border border-[#F0EDE8] text-text3 opacity-50 cursor-not-allowed">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
