"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, ShoppingBag, Utensils, Phone, MapPin, Pencil, X, Plus, Navigation, MessageCircle } from "lucide-react";
import { mapsUrl } from "@/lib/orders/location";
import { waNumber } from "@/lib/eat/whatsappOrder";
import { DeleteOrders } from "@/components/orders/DeleteOrders";

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

/** A dish the owner can add to an order already placed. */
export type AddableDish = {
  id: string;
  name: string;
  priceKes: number;
};

export type QueueOrder = {
  id: string;
  status: string;
  order_type?: "dine_in" | "takeaway" | "delivery" | null;
  table_number: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  /** A rider claimed it and is riding over. The kitchen still cooks. */
  rider_accepted_at?: string | null;
  /** Set when the rider has the food. status stays "ready" — see 088. */
  picked_up_at?: string | null;
  rider_id?: string | null;
  /** Resolved by /api/menu/orders — who is collecting, and how to reach them. */
  rider_name?: string | null;
  rider_phone?: string | null;
  /** Read out to the rider at handover. Delivery orders only. */
  pickup_code?: string | null;
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

/**
 * Call / WhatsApp for the rider on a job.
 *
 * Shown both while they are riding TO the kitchen and after they have the
 * food. The second one matters more: that is when a customer rings asking
 * where their order is, and before this the card said "with the rider" and
 * gave nobody a way to reach them.
 */
function RiderContact({ phone, tone }: { phone: string; tone: "amber" | "purple" }) {
  return (
    <div className="flex gap-2 mt-2.5">
      <a
        href={`tel:${phone}`}
        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-white py-2 text-[12.5px] font-bold text-[#16130C] border ${
          tone === "amber" ? "border-[#E2DDD5]" : "border-[#6B2D8B]/25"
        }`}
      >
        <Phone className="size-3.5" aria-hidden />
        Call
      </a>
      <a
        href={`https://wa.me/${waNumber(phone)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] py-2 text-[12.5px] font-bold text-[#0B3D22]"
      >
        <MessageCircle className="size-3.5" aria-hidden />
        WhatsApp
      </a>
    </div>
  );
}

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
  dishes = [],
}: {
  menuId: string;
  initialOrders: QueueOrder[];
  dishes?: AddableDish[];
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

  // ── Editing an order already placed ───────────────────────────────
  // Which order is open for editing, which line is mid-removal, and the
  // reason for that removal. The reason is required by the API and lands in
  // the audit log — removing food someone ordered is the classic fraud path,
  // so it is recorded, not silent.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ itemId: string; reason: string } | null>(null);

  async function removeLine(itemId: string, reason: string) {
    setBusyId(itemId);
    setError(null);
    try {
      const res = await fetch(`/api/menu/order-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void", reason }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(p?.error ?? "Could not remove that item.");
        return;
      }
      setRemoving(null);
      await refresh(); // totals are recomputed server-side; re-read them
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function addLine(orderId: string, dishId: string) {
    setBusyId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/menu/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_item_id: dishId, quantity: 1 }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(p?.error ?? "Could not add that item.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

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
        const isEditing = editingId === order.id;

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

                {/* A pin beats directions. Shown as its own action so whoever
                    is riding can open it without reading anything. */}
                {isDelivery &&
                  typeof order.delivery_lat === "number" &&
                  typeof order.delivery_lng === "number" && (
                    <a
                      href={mapsUrl({ lat: order.delivery_lat, lng: order.delivery_lng })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#16130C] px-3.5 py-1.5 text-[12.5px] font-bold text-white"
                    >
                      <Navigation className="size-3.5" aria-hidden />
                      Open in Maps
                    </a>
                  )}
              </div>

              <div className="text-right shrink-0">
                <p className="font-display text-[19px] font-extrabold text-[#16130C] leading-none">
                  KSh {(order.total_kes ?? 0).toLocaleString()}
                </p>
                <p className="text-[11.5px] text-[#9C9485] mt-1">{minutesAgo(order.created_at)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(isEditing ? null : order.id);
                    setRemoving(null);
                  }}
                  className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-[#6B6355] hover:text-[#16130C]"
                >
                  <Pencil className="size-3" aria-hidden />
                  {isEditing ? "Done" : "Edit items"}
                </button>
              </div>
            </div>

            <ul className="mt-3 pt-3 border-t border-[#F0EDE7] space-y-1.5">
              {items.map((it) => (
                <li key={it.id} className="text-[13.5px] text-[#3A352C]">
                  <span className="flex items-start gap-2">
                    <span className="flex-1">
                      <span className="font-bold">{it.quantity}×</span> {it.item_name}
                    </span>
                    {isEditing && (
                      <button
                        type="button"
                        aria-label={`Remove ${it.item_name}`}
                        onClick={() => setRemoving({ itemId: it.id, reason: "" })}
                        className="shrink-0 rounded-full p-1 text-[#9C9485] hover:text-[#DC2626] hover:bg-[#DC2626]/10"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    )}
                  </span>
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

                  {/* Removal needs a reason — it goes to the audit log. */}
                  {removing?.itemId === it.id && (
                    <span className="mt-2 flex flex-col gap-2 rounded-xl bg-[#FAF8F5] p-3">
                      <label
                        htmlFor={`reason-${it.id}`}
                        className="text-[12px] font-semibold text-[#6B6355]"
                      >
                        Why is this coming off the order?
                      </label>
                      <input
                        id={`reason-${it.id}`}
                        value={removing.reason}
                        onChange={(e) => setRemoving({ itemId: it.id, reason: e.target.value })}
                        placeholder="Out of stock, customer changed their mind…"
                        className="rounded-lg border border-[#E2DDD5] px-3 py-2 text-[16px]"
                      />
                      <span className="flex gap-2">
                        <button
                          type="button"
                          disabled={!removing.reason.trim() || busyId === it.id}
                          onClick={() => removeLine(it.id, removing.reason.trim())}
                          className="flex-1 rounded-full bg-[#DC2626] text-white text-[13px] font-bold py-2 disabled:opacity-40"
                        >
                          {busyId === it.id ? "Removing…" : "Remove"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(null)}
                          className="flex-1 rounded-full border border-[#E2DDD5] text-[13px] font-bold py-2"
                        >
                          Keep
                        </button>
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {/* Deleting lives behind Edit rather than on the card: it is not
                a thing to have one tap away from "Mark ready". */}
            {isEditing && (
              <div className="mt-3">
                <DeleteOrders
                  menuId={menuId}
                  orderId={order.id}
                  mode="one"
                  onDone={refresh}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#DC2626]/40 px-3.5 py-1.5 text-[12.5px] font-bold text-[#DC2626] hover:bg-[#DC2626]/5"
                />
              </div>
            )}

            {isEditing && dishes.length > 0 && (
              <div className="mt-3 flex gap-2">
                <label htmlFor={`add-${order.id}`} className="sr-only">
                  Add a dish to this order
                </label>
                <select
                  id={`add-${order.id}`}
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) addLine(order.id, v);
                  }}
                  disabled={busyId === order.id}
                  className="flex-1 min-w-0 rounded-full border border-[#E2DDD5] bg-white px-4 py-2 text-[16px]"
                >
                  <option value="">Add a dish…</option>
                  {dishes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — KSh {d.priceKes.toLocaleString()}
                    </option>
                  ))}
                </select>
                <span className="flex items-center text-[#9C9485]" aria-hidden>
                  <Plus className="size-4" />
                </span>
              </div>
            )}

            {order.notes && (
              <p className="mt-2.5 text-[12.5px] text-[#6B6355] bg-[#FAF8F5] rounded-lg px-3 py-2">
                {order.notes}
              </p>
            )}

            {/* A rider on the way is NOT a reason to stop driving the order:
                the kitchen still has to mark it ready, which is what unlocks
                collection. Only once they physically have the food does the
                order become theirs to finish — showing the owner a "Complete"
                button after that invites two people to close the same
                delivery from different screens. */}
            {order.rider_accepted_at && !order.picked_up_at && (
              <div className="mt-3.5 rounded-2xl bg-[#E8A020]/10 p-3.5">
                <p className="flex items-center gap-2 text-[13px] font-bold text-[#B4541A]">
                  <Bike className="size-4 shrink-0" aria-hidden />
                  {order.rider_name
                    ? `${order.rider_name} is on the way to collect`
                    : "A rider is on the way to collect"}
                </p>

                {order.rider_phone && <RiderContact phone={order.rider_phone} tone="amber" />}

                {/* Only once it is actually ready. Showing the code while the
                    food is still cooking invites handing it over early, which
                    is the one thing the code exists to prevent. */}
                {order.status === "ready" && order.pickup_code && (
                  <div className="mt-3 rounded-xl bg-white border border-[#E2DDD5] p-3 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#9C9485]">
                      Read this to the rider
                    </p>
                    <p className="font-mono text-[26px] font-bold tracking-[0.35em] text-[#16130C] mt-0.5">
                      {order.pickup_code}
                    </p>
                    <p className="text-[11.5px] text-[#9C9485] mt-0.5">
                      They cannot collect without it
                    </p>
                  </div>
                )}
              </div>
            )}

            {order.picked_up_at ? (
              <div className="mt-3.5 rounded-2xl bg-[#6B2D8B]/10 p-3.5">
                <p className="flex items-center gap-2 text-[13.5px] font-bold text-[#6B2D8B]">
                  <Bike className="size-4 shrink-0" aria-hidden />
                  {order.rider_name
                    ? `${order.rider_name} has it — they'll complete it`
                    : "With the rider — they'll complete it"}
                </p>
                {order.rider_phone && <RiderContact phone={order.rider_phone} tone="purple" />}
              </div>
            ) : (
              next && (
                <button
                  type="button"
                  onClick={() => advance(order)}
                  disabled={busyId === order.id}
                  className={`w-full rounded-full bg-[#16130C] text-white text-[14px] font-extrabold py-3 disabled:opacity-50 hover:bg-[#2A251A] transition-colors ${
                    order.rider_accepted_at ? "mt-2" : "mt-3.5"
                  }`}
                >
                  {busyId === order.id ? "Saving…" : next.label}
                </button>
              )
            )}
          </article>
        );
      })}
    </div>
  );
}
