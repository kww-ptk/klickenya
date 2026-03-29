import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

interface EventRow {
  id: string;
  title: string;
  city: string | null;
  status: string;
  submitted_at: string;
  is_new_host: boolean;
  host_id: string;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
};

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: events } = await adminClient
    .from("events_pending")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(100);

  const rows = (events ?? []) as EventRow[];

  // Fetch host display names
  const hostIds = [...new Set(rows.map((r) => r.host_id))];
  const { data: hosts } = await adminClient
    .from("host_profiles")
    .select("user_id, display_name")
    .in("user_id", hostIds);

  const hostMap = new Map(
    (hosts ?? []).map((h: { user_id: string; display_name: string }) => [h.user_id, h.display_name])
  );

  return (
    <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8">
      <h1 className="text-[28px] font-bold text-text mb-6">Events</h1>

      {rows.length === 0 ? (
        <p className="text-text2 text-[15px]">No event submissions yet.</p>
      ) : (
        <div className="rounded-xl border border-[#E2DDD5] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface text-[12px] font-semibold text-text2 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Host</th>
                <th className="px-4 py-3 hidden md:table-cell">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DDD5]">
              {rows.map((row) => {
                const st = STATUS_STYLES[row.status] ?? STATUS_STYLES.pending;
                return (
                  <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3 text-[14px] font-medium text-text max-w-[200px] truncate">
                      {row.title}
                      {row.is_new_host && (
                        <span className="ml-2 text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">New host</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                      {hostMap.get(row.host_id) ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                      {row.city ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-text2 hidden md:table-cell">
                      {new Date(row.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/events/${row.id}`}
                        className="text-[13px] font-semibold text-[#E8A020] hover:underline"
                      >
                        View →
                      </Link>
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
