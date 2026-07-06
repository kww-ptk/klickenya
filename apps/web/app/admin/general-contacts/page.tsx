import { adminClient } from "@/lib/supabase/admin";
import { DeleteButton } from "../_components/DeleteButton";
import Link from "next/link";

export const revalidate = 0;

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

// Where a contact came from. Prefer the stored `source` column (migration 077);
// fall back to the "[Partner]" tag in the subject; else it's the main website.
function sourceInfo(contact: Record<string, unknown>): { label: string; partner: boolean } {
  const stored = (contact.source as string | null) || "";
  const tagged = String(contact.subject || "").match(/^\[([^\]]+)\]/)?.[1] || "";
  const raw = (stored || tagged).trim();
  if (!raw) return { label: "Website", partner: false };
  return { label: raw.charAt(0).toUpperCase() + raw.slice(1), partner: true };
}

export default async function GeneralContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const source = params.source || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * PER_PAGE;

  let query = adminClient
    .from("general_contacts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  // Source filter. Uses the reliable "[Partner]" subject tag so it works whether
  // or not the `source` column (migration 077) has been applied yet.
  if (source === "website") {
    query = query.not("subject", "ilike", "[%"); // untagged = main website
  } else if (source) {
    query = query.ilike("subject", `[${source}]%`);
  }

  query = query.range(offset, offset + PER_PAGE - 1);

  const { data: contacts, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  const items = contacts ?? [];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (q) base.q = q;
    if (source) base.source = source;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...overrides };
    if (merged.page === "1") delete merged.page;
    if (!merged.q) delete merged.q;
    if (!merged.source) delete merged.source;
    const qs = new URLSearchParams(
      merged as Record<string, string>
    ).toString();
    return `/admin/general-contacts${qs ? `?${qs}` : ""}`;
  }

  // Source filter options (partners known today; becomes dynamic once the
  // `source` column is populated). "Website" = the main site (untagged).
  const sourceFilters = [
    { key: "", label: "All sources" },
    { key: "claris", label: "Claris" },
    { key: "website", label: "Website" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">General Contacts</h1>
            <span className="text-[12px] font-semibold text-text3 bg-[#F0EDE8] px-2 py-0.5 rounded-full">{totalCount}</span>
          </div>
          <p className="text-[13px] text-text3 mt-1">Messages sent through the main website contact form — not tied to any specific listing.</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-[#F0EDE8] overflow-hidden">
        {/* Source filter + Search */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-6 pt-5 pb-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {sourceFilters.map((f) => (
              <Link
                key={f.key || "all"}
                href={buildUrl({ source: f.key || undefined, page: undefined })}
                className={`px-3 py-1.5 text-[12px] font-semibold rounded-full border transition-colors ${
                  source === f.key
                    ? "bg-amber/10 text-amber border-amber/30"
                    : "bg-white text-text3 border-[#F0EDE8] hover:bg-[#F7F5F2]"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <form
            action="/admin/general-contacts"
            method="get"
            className="relative"
          >
            {source && <input type="hidden" name="source" value={source} />}
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
                  Subject
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-[11px] uppercase text-text3 tracking-wider font-medium">
                  Source
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
                    colSpan={6}
                    className="px-6 py-16 text-center text-[14px] text-text3"
                  >
                    No general contacts found.
                  </td>
                </tr>
              ) : (
                items.map((contact: Record<string, unknown>) => (
                  <tr
                    key={contact.id as string}
                    className="border-b border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors"
                  >
                    <td className="px-6 py-3.5 text-dark whitespace-nowrap">
                      {formatDate(contact.created_at as string)}
                    </td>
                    <td className="px-6 py-3.5 text-dark">
                      {truncate(contact.subject as string, 40)}
                    </td>
                    <td className="px-6 py-3.5 text-dark font-medium">
                      {(contact.name as string) || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5 text-dark">
                      {(contact.email as string) || "\u2014"}
                    </td>
                    <td className="px-6 py-3.5">
                      {(() => {
                        const s = sourceInfo(contact);
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.partner ? "bg-amber/10 text-amber" : "bg-[#F0EDE8] text-text3"
                          }`}>
                            {s.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/general-contacts/${contact.id}`}
                          className="text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
                        >
                          View
                        </Link>
                        <DeleteButton table="general_contacts" id={contact.id as string} />
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
