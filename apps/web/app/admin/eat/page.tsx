import Link from "next/link";
import { getEatMetrics, riderStats } from "@/lib/eat/adminMetrics";
import { Kpi } from "./_components/Kpi";

export const dynamic = "force-dynamic";

/** /admin/eat — is the operation healthy right now, and what needs chasing? */
export default async function EatAdminOverview() {
  const m = await getEatMetrics(30);
  const t = m.totals;

  const activeRiders = [...m.riders.values()].filter((r) => r.is_active);
  const busiest = activeRiders
    .map((r) => ({ rider: r, stats: riderStats(m.orders, r.id) }))
    .sort((a, b) => b.stats.delivered - a.stats.delivered)
    .slice(0, 5);

  // Restaurants taking orders in this window, by volume.
  const byRestaurant = new Map<string, number>();
  for (const o of m.orders) byRestaurant.set(o.menu_id, (byRestaurant.get(o.menu_id) ?? 0) + 1);
  const topRestaurants = [...byRestaurant.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {m.schemaError && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 mb-4">
          <p className="text-[13.5px] font-bold text-red-800">
            These numbers are not real — the orders query was rejected
          </p>
          <p className="text-[13px] text-red-700 mt-1">
            Apply <span className="font-mono">088_riders.sql</span>. Until then this page has
            no data to read and everything below shows zero.
          </p>
          <p className="text-[12px] font-mono text-red-600 mt-2">{m.schemaError}</p>
        </div>
      )}
      {!m.schemaError && m.ridersUnavailable && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-[13.5px] font-bold text-zinc-900">Riders are not set up yet</p>
          <p className="text-[13px] text-zinc-600 mt-1">
            Migration <span className="font-mono">088_riders.sql</span> has not been applied,
            so there are no rider records to read. Everything else on this page is live.
          </p>
        </div>
      )}

      <section>
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
          Last 30 days
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Orders" value={t.all} hint={`${t.ordersPerDay} a day`} />
          <Kpi
            label="Average order"
            value={`KSh ${t.averageOrderKes.toLocaleString()}`}
            hint="Delivered orders only"
          />
          <Kpi
            label="Revenue"
            value={`KSh ${t.revenueKes.toLocaleString()}`}
            hint={`${t.delivered} delivered`}
          />
          <Kpi
            label="In flight"
            value={t.inFlight}
            tone={t.inFlight > 0 ? "alert" : "plain"}
            hint="Being cooked or delivered"
          />
        </div>
      </section>

      <section>
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
          Money
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi
            label="Cash recorded"
            value={`KSh ${t.cashCollectedKes.toLocaleString()}`}
            hint="What riders say they took"
          />
          <Kpi
            label="Cash not recorded"
            value={t.cashUnrecorded}
            tone={t.cashUnrecorded > 0 ? "alert" : "good"}
            hint={
              t.cashUnrecorded > 0
                ? "Delivered, but nobody entered an amount — chase these"
                : "Every delivery has an amount against it"
            }
          />
          <Kpi label="Deliveries" value={t.deliveries} hint={`of ${t.all} orders`} />
          <Kpi
            label="Cancelled"
            value={t.cancelled}
            tone={t.cancelled > 0 ? "alert" : "plain"}
          />
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
            Busiest riders
          </h2>
          <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
            {busiest.length === 0 ? (
              <p className="p-5 text-[13.5px] text-zinc-500">No riders yet.</p>
            ) : (
              busiest.map(({ rider, stats }) => (
                <Link
                  key={rider.id}
                  href={`/admin/eat/riders/${rider.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-zinc-900">{rider.name}</p>
                    <p className="text-[12.5px] text-zinc-500">{rider.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold text-zinc-900">
                      {stats.delivered} delivered
                    </p>
                    <p className="text-[12.5px] text-zinc-500">
                      KSh {stats.cashCollectedKes.toLocaleString()} cash
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 mb-2.5">
            Busiest restaurants
          </h2>
          <div className="rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
            {topRestaurants.length === 0 ? (
              <p className="p-5 text-[13.5px] text-zinc-500">No orders in this window.</p>
            ) : (
              topRestaurants.map(([menuId, count]) => (
                <div key={menuId} className="flex items-center justify-between gap-3 p-4">
                  <p className="text-[14px] font-bold text-zinc-900">
                    {m.restaurants.get(menuId) ?? "Unknown"}
                  </p>
                  <p className="text-[14px] text-zinc-600">{count} orders</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
