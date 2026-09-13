"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, ShoppingBag, Utensils, Phone, MapPin } from "lucide-react";

/**
 * The owner's live order queue — every active order for one menu, in one list.
 *
 * Deliberately NOT StationDashboard. That component filters items down to a
 * single station, which is right for a cook at the pass and wrong for the
 * owner: a burger with a beer would show the owner half the order. Here an
 * order is always whole.
 *
 * One button drives the lifecycle. The owner should never have to learn a
 * status model — they see what to do next and press it.
 */

export type QueueOrder = {
  id: string;
  status: string;
  order_type?: "dine_in" | "takeaway" | "delivery" | null;
  table_number: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
  total_kes: number | null;
  created_at: string;
  order_items: {
    id: string;
    item_name: string;
    quantity: number;
    line_total: number | null;
    allergy_notes?: string | null;
    is_voided?: boolean | null;
    selected_options?: { group: string; choice: string; price_add: number }[] | null;
  }[];
};

/** What pressing the primary button does next, per status. */
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  new: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "delivered", label: "Complete" },
};

function minutesAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m ago`;
}

export function LiveOrderQueue({
  menuId,
  initialOrders,
}: {
  menuId: string;
  initialOrders: QueueOrder[];
}) {
  const [orders, setOrders] = useState<QueueOrder[]>(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Held in a ref so a rollback always has the latest list without the poll
  // effect depending on `orders` and resetting its interval every render.
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/menu/orders?menu_id=${menuId}`, { cache: "no-store" });
      if (!res.ok) return; // a failed poll is not worth shouting about
      const data = (await res.json()) as { orders?: QueueOrder[] };
      if (Array.isArray(data.orders)) setOrders(data.orders);
    } catch {
      /* offline — keep showing what we have rather than blanking the screen */
    }
  }, [menuId]);

  useEffect(() => {
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function advance(order: QueueOrder) {
    const next = NEXT[order.status];
    if (!next) return;
    setBusyId(order.id);
    setError(null);
    const snapshot = ordersRef.current;
    // Optimistic: the owner is standing in a kitchen, not watching a spinner.
    setOrders((prev) =>
      next.to === "delivered"
        ? prev.filter((o) => o.id !== order.id)
        : prev.map((o) => (o.id === order.id ? { ...o, status: next.to } : o)),
    );
    try {
      const res = await fetch("/api/menu/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status: next.to }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setOrders(snapshot);
        setError(payload?.error ?? "Could not update that order.");
      }
    } catch {
      setOrders(snapshot);
      setError("Could not reach the server. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E2DDD5] bg-white p-10 text-center">
        <p className="font-display text-[17px] font-bold text-[#16130C]">No orders right now</p>
        <p className="text-[13px] text-[#9C9485] mt-1">
          New orders appear here on their own — no need to refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-[13px] font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {orders.map((order) => {
        const next = NEXT[order.status];
        const isDelivery = order.order_type === "delivery";
        const isTakeaway = order.order_type === "takeaway";
        const Icon = isDelivery ? Bike : isTakeaway ? ShoppingBag : Utensils;
        const kind = isDelivery
          ? "Delivery"
          : isTakeaway
          ? "Takeaway"
          : `Table ${order.table_number ?? "—"}`;
        const items = (order.order_items ?? []).filter((i) => !i.is_voided);

        return (
          <article
            key={order.id}
            className={`rounded-2xl border bg-white p-4 lg:p-5 shadow-sm ${
              order.status === "new" ? "border-[#E8A020]/50" : "border-[#E2DDD5]"
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#9C9485]">
                  <Icon className="size-3.5" aria-hidden />
                  {kind}
                  <span className="text-[#C8C0B2]">· #{order.id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="font-display text-[19px] font-extrabold text-[#16130C] leading-tight mt-0.5">
                  {order.customer_name ?? "Guest"}
                </p>

                {order.customer_phone && (
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="inline-flex items-center gap-1.5 text-[13px] text-[#6B6355] mt-1 underline underline-offset-2"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {order.customer_phone}
                  </a>
                )}

                {/* On a delivery the address is the job, so it gets weight. */}
                {isDelivery && order.delivery_address && (
                  <p className="flex items-start gap-1.5 text-[13.5px] font-medium text-[#16130C] mt-1.5 leading-snug">
                    <MapPin className="size-4 shrink-0 mt-px text-[#E8A020]" aria-hidden />
                    <span className="select-text">{order.delivery_address}</span>
                  </p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="font-display text-[19px] font-extrabold text-[#16130C] leading-none">
                  KSh {(order.total_kes ?? 0).toLocaleString()}
                </p>
                <p className="text-[11.5px] text-[#9C9485] mt-1">{minutesAgo(order.created_at)}</p>
              </div>
            </div>

            <ul className="mt-3 pt-3 border-t border-[#F0EDE7] space-y-1.5">
              {items.map((it) => (
                <li key={it.id} className="text-[13.5px] text-[#3A352C]">
                  <span className="font-bold">{it.quantity}×</span> {it.item_name}
                  {(it.selected_options ?? []).map((o, i) => (
                    <span key={i} className="block pl-5 text-[12.5px] text-[#6B6355]">
                      + {o.choice}
                      {o.price_add ? ` (+${o.price_add})` : ""}
                    </span>
                  ))}
                  {it.allergy_notes && (
                    <span className="block pl-5 text-[12.5px] font-medium text-[#B4541A]">
                      {it.allergy_notes}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {order.notes && (
              <p className="mt-2.5 text-[12.5px] text-[#6B6355] bg-[#FAF8F5] rounded-lg px-3 py-2">
                {order.notes}
              </p>
            )}

            {next && (
              <button
                type="button"
                onClick={() => advance(order)}
                disabled={busyId === order.id}
                className="mt-3.5 w-full rounded-full bg-[#16130C] text-white text-[14px] font-extrabold py-3 disabled:opacity-50 hover:bg-[#2A251A] transition-colors"
              >
                {busyId === order.id ? "Saving…" : next.label}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
