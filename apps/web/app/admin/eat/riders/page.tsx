import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { getEatMetrics, riderStats } from "@/lib/eat/adminMetrics";
import { AddRider } from "./AddRider";

export const dynamic = "force-dynamic";

/** Every rider, with what they have actually done in the last 30 days. */
export default async function EatAdminRiders() {
  // Three independent reads: the order window, which kitchens each rider
  // serves, and the restaurants a rider could be assigned to.
  const [m, linksRes, { data: menuRows }] = await Promise.all([
    getEatMetrics(30),
    // Caught rather than awaited bare: the table does not exist until 088
    // is applied, and a pre-088 database must still render this page.
    Promise.resolve(adminClient.from("rider_menus").select("rider_id")).catch(
      () => ({ data: null }),
    ),
    // Only restaurants that deliver — the rest have nothing to ride.
    adminClient
      .from("menus")
      .select("id, name")
      .eq("delivery_enabled", true)
      .order("name", { ascending: true }),
  ]);

  const linkCounts = new Map<string, number>();
  for (const l of (linksRes.data ?? []) as { rider_id: string }[]) {
    linkCounts.set(l.rider_id, (linkCounts.get(l.rider_id) ?? 0) + 1);
  }

  const menuOptions = (menuRows ?? []).map((x) => ({
    id: x.id as string,
    name: String(x.name ?? "").replace(/\s+menu\s*$/i, "").trim() || String(x.name),
  }));

  const riders = [...m.riders.values()]
    .map((r) => ({ rider: r, stats: riderStats(m.orders, r.id) }))
    .sort((a, b) => b.stats.delivered - a.stats.delivered);

  if (m.ridersUnavailable) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
        <p className="font-display text-[17px] font-bold text-zinc-900">Riders aren&apos;t set up</p>
        <p className="text-[13.5px] text-zinc-600 mt-1 max-w-[560px]">
          Apply migration <span className="font-mono">088_riders.sql</span>, then add riders
          from a restaurant&apos;s <span className="font-semibold">Riders</span> tab. They sign in
          at <span className="font-semibold">klickenya.com/rider</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-zinc-500">
          {riders.length} rider{riders.length === 1 ? "" : "s"}. Figures cover the last 30 days.
        </p>
      </div>

      <AddRider menus={menuOptions} />

      {riders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
          <p className="font-display text-[17px] font-bold text-zinc-900">No riders yet</p>
          <p className="text-[13px] text-zinc-500 mt-1 max-w-[500px] mx-auto">
            Hire a Klickenya rider above — they work every restaurant that delivers. A
            restaurant can also add its own from its Riders tab.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-[13.5px] min-w-[760px]">
            <thead className="bg-zinc-50 text-left">
              <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Rider</th>
                <th className="px-4 py-3 font-semibold">Works for</th>
                <th className="px-4 py-3 font-semibold">Delivered</th>
                <th className="px-4 py-3 font-semibold">In flight</th>
                <th className="px-4 py-3 font-semibold">Avg time</th>
                <th className="px-4 py-3 font-semibold">Cash held</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {riders.map(({ rider, stats }) => (
                <tr key={rider.id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/eat/riders/${rider.id}`}
                      className="font-bold text-zinc-900 underline"
                    >
                      {rider.name}
                    </Link>
                    <span className="block text-[12px] text-zinc-500">{rider.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    {rider.is_platform ? (
                      <span className="inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-zinc-900 text-white">
                        Klickenya
                      </span>
                    ) : (
                      <span className="text-zinc-600">
                        {linkCounts.get(rider.id) ?? 0} restaurant
                        {(linkCounts.get(rider.id) ?? 0) === 1 ? "" : "s"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{stats.delivered}</td>
                  <td className="px-4 py-3 text-zinc-600">{stats.inFlight}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {stats.averageMinutes !== null ? `${stats.averageMinutes} min` : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900 whitespace-nowrap">
                    KSh {stats.cashCollectedKes.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        rider.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {rider.is_active ? "active" : "off"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
