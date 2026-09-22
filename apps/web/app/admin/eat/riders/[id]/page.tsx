import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { getEatMetrics, riderStats } from "@/lib/eat/adminMetrics";
import { Kpi } from "../../_components/Kpi";

export const dynamic = "force-dynamic";

/** One rider: who they are, what they have done, and whose money they hold. */
export default async function RiderProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The order window and this rider's kitchens do not depend on each other.
  const [m, { data: links }] = await Promise.all([
    getEatMetrics(30),
    adminClient.from("rider_menus").select("menu_id").eq("rider_id", id),
  ]);
  const rider = m.riders.get(id);
  if (!rider) notFound();

  const stats = riderStats(m.orders, id);

  // Which kitchens they ride for.
  const kitchens = (links ?? [])
    .map((l) => m.restaurants.get(l.menu_id as string))
    .filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/eat/riders" className="text-[13px] text-zinc-500 hover:text-zinc-900">
          ← All riders
        </Link>
        <h2 className="font-display text-[24px] font-bold text-zinc-900 mt-2">{rider.name}</h2>
        <p className="text-[13.5px] text-zinc-500">
          {rider.phone} ·{" "}
          <span className={rider.is_active ? "text-emerald-700" : "text-zinc-500"}>
            {rider.is_active ? "active" : "not active"}
          </span>
        </p>
        {kitchens.length > 0 && (
          <p className="text-[13px] text-zinc-500 mt-1">Rides for {kitchens.join(", ")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Delivered" value={stats.delivered} hint="Last 30 days" />
        <Kpi label="In flight" value={stats.inFlight} tone={stats.inFlight > 0 ? "alert" : "plain"} />
        <Kpi
          label="Average time"
          value={stats.averageMinutes !== null ? `${stats.averageMinutes} min` : "—"}
          hint="Accepting to delivering"
        />
        <Kpi
          label="Cash held"
          value={`KSh ${stats.cashCollectedKes.toLocaleString()}`}
          hint="Recorded at the door"
        />
      </div>

      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
          Their deliveries
        </h3>
        {stats.orders.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-[13.5px] text-zinc-500">Nothing in the last 30 days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
            <table className="w-full text-[13.5px] min-w-[680px]">
              <thead className="bg-zinc-50 text-left">
                <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Restaurant</th>
                  <th className="px-4 py-3 font-semibold">To</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Cash</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.orders.map((o) => (
                  <tr key={o.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-mono text-[12px] font-bold text-zinc-900">
                      #{o.id.slice(0, 8).toUpperCase()}
                      <span className="block font-sans font-normal text-[11.5px] text-zinc-400">
                        {new Date(o.created_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {m.restaurants.get(o.menu_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 max-w-[220px]">
                      {o.delivery_address ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 whitespace-nowrap">
                      KSh {(o.total_kes ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.cash_collected_kes !== null ? (
                        <span
                          className={
                            Number(o.cash_collected_kes) !== Number(o.total_kes ?? 0)
                              ? "font-bold text-amber-700"
                              : "text-zinc-600"
                          }
                        >
                          KSh {Number(o.cash_collected_kes).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
