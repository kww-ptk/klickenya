import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DeleteButton } from "../_components/DeleteButton";
import Link from "next/link";

export const revalidate = 0;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseListingType(notes: string | null): string {
  if (!notes) return "Unknown";
  if (notes.includes("— AGENT")) return "Agent";
  if (notes.includes("— OWNER")) return "Owner";
  if (notes.includes("— DEVELOPER")) return "Developer";
  if (notes.includes("— OTHER")) return "Other";
  return "Unknown";
}

function parseField(notes: string | null, field: string): string {
  if (!notes) return "—";
  const regex = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const match = notes.match(regex);
  return match ? match[1].trim() : "—";
}

export default async function PropertyListingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const status = params.status || "all";
  const q = params.q || "";

  let query = adminClient
    .from("contact_requests")
    .select("*")
    .like("notes", "%PROPERTY LISTING REQUEST%")
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,notes.ilike.%${q}%`);
  }

  const { data: requests, error } = await query;
  const items = (requests ?? []) as Record<string, unknown>[];

  // Count by status
  const { count: totalNew } = await adminClient
    .from("contact_requests")
    .select("*", { count: "exact", head: true })
    .like("notes", "%PROPERTY LISTING REQUEST%")
    .eq("status", "new");

  const { count: totalAll } = await adminClient
    .from("contact_requests")
    .select("*", { count: "exact", head: true })
    .like("notes", "%PROPERTY LISTING REQUEST%");

  const TABS = [
    { label: "All", value: "all", count: totalAll ?? 0 },
    { label: "New", value: "new", count: totalNew ?? 0 },
    { label: "Responded", value: "responded" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-bold text-dark">
            Property Listing Requests
          </h1>
          <p className="text-[14px] text-text3 mt-1">
            Submissions from /real-estate/list — agents, owners, and developers
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/property-listings${tab.value !== "all" ? `?status=${tab.value}` : ""}${q ? `&q=${q}` : ""}`}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              status === tab.value
                ? "bg-purple-500 text-white"
                : "bg-surface text-text2 hover:bg-border"
            }`}
          >
            {tab.label}
            {"count" in tab && tab.count != null && (
              <span className="ml-1.5 text-[11px] opacity-70">({tab.count})</span>
            )}
          </Link>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, or details..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-[14px] focus:border-purple-500 outline-none"
          />
          <input type="hidden" name="status" value={status} />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-purple-500 text-white text-[13px] font-bold hover:bg-purple-600 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-[40px] block mb-3">🏠</span>
          <p className="text-[16px] font-semibold text-dark mb-1">
            No property listing requests yet
          </p>
          <p className="text-[14px] text-text3">
            They&apos;ll appear here when people submit via /real-estate/list
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-text3">
                <th className="text-left py-3 px-3 font-semibold">Type</th>
                <th className="text-left py-3 px-3 font-semibold">Name</th>
                <th className="text-left py-3 px-3 font-semibold">Email</th>
                <th className="text-left py-3 px-3 font-semibold">Details</th>
                <th className="text-left py-3 px-3 font-semibold">Status</th>
                <th className="text-left py-3 px-3 font-semibold">Date</th>
                <th className="text-left py-3 px-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((req) => {
                const notes = req.notes as string | null;
                const listingType = parseListingType(notes);
                const city =
                  parseField(notes, "City") !== "—"
                    ? parseField(notes, "City")
                    : parseField(notes, "Cities");

                const typeColors: Record<string, string> = {
                  Agent: "bg-purple-100 text-purple-700",
                  Owner: "bg-emerald-100 text-emerald-700",
                  Developer: "bg-amber-100 text-amber-700",
                  Other: "bg-gray-100 text-gray-600",
                  Unknown: "bg-gray-100 text-gray-600",
                };

                return (
                  <tr
                    key={req.id as string}
                    className="border-b border-surface hover:bg-canvas transition-colors"
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${typeColors[listingType]}`}
                      >
                        {listingType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-dark">
                      {(req.full_name as string) || "—"}
                    </td>
                    <td className="py-3 px-3 text-text2">
                      <a
                        href={`mailto:${req.email as string}`}
                        className="hover:text-purple-600 transition-colors"
                      >
                        {req.email as string}
                      </a>
                    </td>
                    <td className="py-3 px-3 text-text3 max-w-[200px] truncate">
                      {city !== "—" ? city : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={(req.status as string) || "new"} />
                    </td>
                    <td className="py-3 px-3 text-text3 whitespace-nowrap">
                      {formatDate(req.created_at as string)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/contact-requests/${req.id}`}
                          className="text-[12px] font-semibold text-purple-600 hover:underline"
                        >
                          View
                        </Link>
                        <DeleteButton
                          table="contact_requests"
                          id={req.id as string}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
