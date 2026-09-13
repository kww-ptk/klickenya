import Link from "next/link";
import { getEatMetrics } from "@/lib/eat/adminMetrics";
import { mapsUrl } from "@/lib/orders/location";
import { DeleteOrders } from "@/components/orders/DeleteOrders";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-emerald-100 text-emerald-700",
  delivered: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-700",
};

/** Every delivery and takeaway order, newest first. Dine-in is the floor's
 *  business and would bury what this page exists to watch. */
export default async function EatAdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const { status, type } = await searchParams;
  const m = await getEatMetrics(30);

  let orders = m.orders;
  if (status) orders = orders.filter((o) => o.status === status);
  if (type) orders = orders.filter((o) => o.order_type === type);

  const filters: { label: string; href: string; on: boolean }[] = [
    { label: "All", href: "/admin/eat/orders", on: !status && !type },
    { label: "In flight", href: "/admin/eat/orders?status=new", on: status === "new" },
    { label: "Preparing", href: "/admin/eat/orders?status=preparing", on: status === "preparing" },
    { label: "Ready", href: "/admin/eat/orders?status=ready", on: status === "ready" },
    { label: "Delivered", href: "/admin/eat/orders?status=delivered", on: status === "delivered" },
    { label: "Cancelled", href: "/admin/eat/orders?status=cancelled", on: status === "cancelled" },
    { label: "Delivery only", href: "/admin/eat/orders?type=delivery", on: type === "delivery" },
  ];

  return (
    <div className="space-y-4">
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
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.href}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold border ${
              f.on
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="text-[13px] text-zinc-500">
        {orders.length} order{orders.length === 1 ? "" : "s"} in the last 30 days
      </p>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
          <p className="font-display text-[17px] font-bold text-zinc-900">Nothing here</p>
          <p className="text-[13px] text-zinc-500 mt-1">No orders match this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-[13.5px] min-w-[980px]">
            <thead className="bg-zinc-50 text-left">
              <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Restaurant</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Where</th>
                <th className="px-4 py-3 font-semibold">Rider</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Cash</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold sr-only">Delete</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const rider = o.rider_id ? m.riders.get(o.rider_id) : null;
                const isDelivery = o.order_type === "delivery";
                const cashMissing =
                  isDelivery && o.status === "delivered" && o.cash_collected_kes === null;
                return (
                  <tr key={o.id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-bold text-zinc-900">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="block text-[11.5px] text-zinc-400">
                        {new Date(o.created_at).toLocaleString("en-GB", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {m.restaurants.get(o.menu_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-900">{o.customer_name ?? "Guest"}</span>
                      {o.customer_phone && (
                        <a href={`tel:${o.customer_phone}`} className="block text-[12px] text-zinc-500 underline">
                          {o.customer_phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <span
                        className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isDelivery ? "bg-purple-100 text-purple-800" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {isDelivery ? "Delivery" : "Takeaway"}
                      </span>
                      {isDelivery && (
                        <span className="block text-[12px] text-zinc-600 mt-1 leading-snug">
                          {o.delivery_address || (
                            <em className="text-red-600 not-italic font-medium">no address</em>
                          )}
                          {typeof o.delivery_lat === "number" &&
                            typeof o.delivery_lng === "number" && (
                              <a
                                href={mapsUrl({ lat: o.delivery_lat, lng: o.delivery_lng })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block font-semibold text-zinc-900 underline mt-0.5"
                              >
                                Open pin
                              </a>
                            )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rider ? (
                        <Link href={`/admin/eat/riders/${rider.id}`} className="text-zinc-900 underline">
                          {rider.name}
                        </Link>
                      ) : isDelivery ? (
                        <span className="text-zinc-400">unassigned</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                      {o.picked_up_at && (
                        <span className="block text-[11.5px] text-zinc-500">picked up</span>
                      )}
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
                      ) : cashMissing ? (
                        <span className="font-bold text-red-600">not recorded</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          STATUS_STYLE[o.status] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Scoped to this order's own restaurant — the endpoint
                          verifies menu access, so an admin deleting from here
                          is still deleting a specific restaurant's order, not
                          reaching across the platform. */}
                      <DeleteOrders menuId={o.menu_id} orderId={o.id} mode="one" />
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
