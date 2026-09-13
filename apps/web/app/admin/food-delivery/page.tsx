import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { ORDER_QUEUE_SELECT, ACTIVE_ORDER_STATUSES } from "@/lib/orders/projection";
import { mapsUrl } from "@/lib/orders/location";

export const dynamic = "force-dynamic";

/**
 * /admin/food-delivery — every delivery and takeaway order across every
 * restaurant, newest first.
 *
 * Scoped to the two channels that come from eat.klickenya.com. Dine-in is
 * deliberately excluded: it is the restaurant's own floor operation and would
 * bury the handful of orders this page exists to watch.
 */

type Row = {
  id: string;
  status: string;
  order_type: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_kes: number | null;
  created_at: string;
  menu_id: string;
  order_items: { id: string; item_name: string; quantity: number; is_voided?: boolean | null }[];
};

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  preparing: "bg-purple-100 text-purple-800",
  ready: "bg-emerald-100 text-emerald-700",
  delivered: "bg-zinc-100 text-zinc-600",
  cancelled: "bg-red-100 text-red-700",
};

export default async function AdminFoodDeliveryPage() {
  // Two queries rather than a nested join: the menus join through orders was
  // what produced a Gateway Timeout on the consumer side, and a per-menu name
  // lookup is a handful of rows.
  const { data: rows } = await adminClient
    .from("orders")
    .select(ORDER_QUEUE_SELECT)
    .in("order_type", ["delivery", "takeaway"])
    .order("created_at", { ascending: false })
    .limit(200);

  const orders = (rows ?? []) as unknown as Row[];

  const menuIds = Array.from(new Set(orders.map((o) => o.menu_id).filter(Boolean)));
  const menuNames = new Map<string, string>();
  if (menuIds.length > 0) {
    const { data: menus } = await adminClient
      .from("menus")
      .select("id, name")
      .in("id", menuIds);
    for (const m of menus ?? []) menuNames.set(m.id, m.name);
  }

  const live = orders.filter((o) =>
    (ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status),
  ).length;
  const deliveries = orders.filter((o) => o.order_type === "delivery").length;
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((n, o) => n + Number(o.total_kes ?? 0), 0);

  return (
    <div className="p-4 lg:p-8 max-w-[1200px]">
      <h1 className="font-display text-[26px] lg:text-[32px] font-bold tracking-[-0.03em] text-zinc-900">
        Food delivery
      </h1>
      <p className="text-[14px] text-zinc-500 mt-1">
        Delivery and takeaway orders from eat.klickenya.com, newest first. Dine-in is not shown.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {[
          { label: "In progress", value: live },
          { label: "Deliveries", value: deliveries },
          { label: "Orders shown", value: orders.length },
          { label: "Completed value", value: `KSh ${revenue.toLocaleString()}` },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
              {k.label}
            </p>
            <p className="font-display text-[24px] font-bold text-zinc-900 leading-none mt-1">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center mt-6">
          <p className="font-display text-[17px] font-bold text-zinc-900">No orders yet</p>
          <p className="text-[13px] text-zinc-500 mt-1 max-w-[460px] mx-auto">
            Orders appear here once a restaurant has delivery or takeaway switched on and a
            guest places one. A restaurant with neither enabled is listed but cannot be
            ordered from.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-[13.5px] min-w-[860px]">
            <thead className="bg-zinc-50 text-left">
              <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Restaurant</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Where</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const items = (o.order_items ?? []).filter((i) => !i.is_voided);
                return (
                  <tr key={o.id} className="border-t border-zinc-100 align-top">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-bold text-zinc-900">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="block text-[11.5px] text-zinc-400">
                        {new Date(o.created_at).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {menuNames.get(o.menu_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-900">{o.customer_name ?? "Guest"}</span>
                      {o.customer_phone && (
                        <a
                          href={`tel:${o.customer_phone}`}
                          className="block text-[12px] text-zinc-500 underline underline-offset-2"
                        >
                          {o.customer_phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <span
                        className={`inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          o.order_type === "delivery"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {o.order_type === "delivery" ? "Delivery" : "Takeaway"}
                      </span>
                      {o.order_type === "delivery" && (
                        <span className="block text-[12px] text-zinc-600 mt-1 leading-snug">
                          {o.delivery_address || (
                            <em className="text-red-600 not-italic font-medium">
                              no address recorded
                            </em>
                          )}
                          {typeof o.delivery_lat === "number" &&
                            typeof o.delivery_lng === "number" && (
                              <a
                                href={mapsUrl({ lat: o.delivery_lat, lng: o.delivery_lng })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-[12px] font-semibold text-zinc-900 underline mt-0.5"
                              >
                                Open pin in Maps
                              </a>
                            )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {items.map((i) => (
                        <span key={i.id} className="block">
                          {i.quantity}× {i.item_name}
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-zinc-900 whitespace-nowrap">
                      KSh {(o.total_kes ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                          STATUS_STYLE[o.status] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[12.5px] text-zinc-400 mt-4">
        Owners work their own orders in{" "}
        <Link href="/manage/listings" className="underline">
          the restaurant command center
        </Link>
        . This page is for oversight, not for driving a kitchen.
      </p>
    </div>
  );
}
