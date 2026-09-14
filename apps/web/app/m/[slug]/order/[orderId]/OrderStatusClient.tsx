"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeliveryStage } from "@/lib/orders/deliveryStage";

interface StatusOrder {
  id: string;
  short_id: string;
  order_type?: "takeaway" | "delivery" | null;
  delivery_address?: string | null;
  status: "new" | "preparing" | "ready" | "delivered" | "cancelled";
  /** Where a delivery actually is — derived server-side from the timestamps. */
  stage?: DeliveryStage;
  created_at: string;
  accepted_at: string | null;
  estimated_ready_at: string | null;
  decline_reason: string | null;
  subtotal_kes?: number | null;
  delivery_fee_kes?: number | null;
  total_kes: number | null;
  items: Array<{ name: string; quantity: number; line_total: number | null }>;
  restaurant: { name: string; slug: string };
}

/**
 * Menus are named for the dashboard ("Napul'è Restaurant Menu"), which reads
 * badly in a sentence addressed to a guest — "call Napul'è Restaurant Menu".
 * Drop the trailing word for display only; the stored name is untouched.
 */
function restaurantLabel(name: string): string {
  return name.replace(/\s+menu\s*$/i, "").trim() || name;
}

function readyTimeLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

type Ui = { emoji: string; title: string; tone: string; body: string | null };

/**
 * A delivery is described by its stage, not its status. "On its way to you"
 * used to appear the moment the kitchen pressed Mark ready — before any
 * rider had accepted, let alone collected — and guests went to wait at the
 * gate. A pickup order has no rider leg, so status is the whole story.
 */
function statusUi(order: StatusOrder, restaurant: string): Ui {
  const isDelivery = order.order_type === "delivery";
  const where = order.delivery_address ? ` to ${order.delivery_address}` : "";

  if (order.status === "cancelled") {
    return {
      emoji: "😔",
      title: order.decline_reason === "Cancelled by the customer" ? "Order cancelled" : "Order declined",
      tone: "text-[#DC2626]",
      body: order.decline_reason ? `“${order.decline_reason}”` : null,
    };
  }

  if (isDelivery) {
    switch (order.stage ?? "waiting") {
      case "waiting":
        return {
          emoji: "⏳",
          title: "Waiting for the restaurant to confirm",
          tone: "text-amber",
          body: `${restaurant} will confirm your order shortly. Keep this page open — it updates automatically.`,
        };
      case "cooking":
        return { emoji: "👨‍🍳", title: "Being prepared", tone: "text-purple", body: null };
      case "rider_assigned":
        return {
          emoji: "🛵",
          title: "Being prepared — your rider is on the way to collect it",
          tone: "text-purple",
          body: null,
        };
      case "awaiting_rider":
        return {
          emoji: "🍽️",
          title: "Ready — waiting for a rider",
          tone: "text-emerald-600",
          body: "Your food is packed and waiting at the counter for the next rider.",
        };
      case "out_for_delivery":
        return {
          emoji: "🛵",
          title: "On its way to you",
          tone: "text-emerald-600",
          body: `Your rider has the food and is riding${where}. Have the cash ready if you're paying on delivery.`,
        };
      case "delivered":
        return { emoji: "✅", title: "Delivered — enjoy!", tone: "text-emerald-700", body: null };
      default:
        return { emoji: "⏳", title: "Order received", tone: "text-amber", body: null };
    }
  }

  switch (order.status) {
    case "new":
      return {
        emoji: "⏳",
        title: "Waiting for the restaurant to confirm",
        tone: "text-amber",
        body: `${restaurant} will confirm your order shortly. Keep this page open — it updates automatically.`,
      };
    case "preparing":
      return { emoji: "👨‍🍳", title: "Order accepted — being prepared", tone: "text-purple", body: null };
    case "ready":
      return {
        emoji: "🎉",
        title: "Ready for pickup!",
        tone: "text-emerald-600",
        body: `Head to ${restaurant} to collect your order.`,
      };
    case "delivered":
      return { emoji: "✅", title: "Picked up — thank you!", tone: "text-emerald-700", body: null };
    default:
      return { emoji: "⏳", title: "Order received", tone: "text-amber", body: null };
  }
}

export function OrderStatusClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<StatusOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setOrder(data.order);
    } catch {
      // Network blip — next poll heals
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled || document.hidden) return;
      void poll();
    };
    tick();
    const i = setInterval(tick, 8000);

    // Poll the moment the tab comes back, instead of leaving the guest
    // looking at a stale status for up to 8 more seconds. This is the common
    // case, not an edge one: they switch to WhatsApp to message the
    // restaurant and switch straight back to see if anything changed.
    document.addEventListener("visibilitychange", tick);

    return () => {
      cancelled = true;
      clearInterval(i);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [poll]);

  async function cancelOrder() {
    if (!order || order.status !== "new") return;
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setCancelError(p?.error ?? "Could not cancel the order.");
      }
      await poll();
    } catch {
      setCancelError("Could not reach the server.");
    } finally {
      setCancelling(false);
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <p className="text-[15px] text-text2 text-center">
          Order not found. Check the link and try again.
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
      </div>
    );
  }

  const isDelivery = order.order_type === "delivery";
  const restaurant = restaurantLabel(order.restaurant.name);
  const ui = statusUi(order, restaurant);
  const readyAt = readyTimeLabel(order.estimated_ready_at);
  const fee = Number(order.delivery_fee_kes ?? 0);
  const food =
    order.subtotal_kes != null
      ? Number(order.subtotal_kes)
      : order.total_kes != null
      ? Number(order.total_kes) - fee
      : null;

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
        <p className="text-[40px] leading-none mb-3">{ui.emoji}</p>
        <h1 className={`font-display text-[22px] font-extrabold tracking-tight ${ui.tone}`}>
          {ui.title}
        </h1>

        {ui.body && <p className="text-[13px] text-text2 mt-2">{ui.body}</p>}
        {order.status === "preparing" && readyAt && (
          <p className="text-[14px] text-text2 mt-2">
            Ready around <span className="font-bold text-dark">{readyAt}</span>
          </p>
        )}

        <p className="text-[11px] font-bold text-text3 uppercase tracking-widest mt-5 mb-1">
          {isDelivery ? "Delivery order" : "Takeaway order"}
        </p>
        <p className="font-mono text-[18px] font-bold text-dark">#{order.short_id}</p>
        <p className="text-[11.5px] text-text3 mt-1">
          Quote this code if you call {restaurant}.
        </p>

        {isDelivery && order.delivery_address && (
          <p className="text-[12.5px] text-text2 mt-3 leading-snug">
            Delivering to{" "}
            <span className="font-medium text-dark">{order.delivery_address}</span>
          </p>
        )}

        {/* Items */}
        <div className="mt-5 text-left border-t border-surface pt-4 space-y-1.5">
          {order.items.map((it, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-dark w-[22px] text-right tabular-nums shrink-0">
                {it.quantity}×
              </span>
              <span className="flex-1 text-[13px] text-dark">{it.name}</span>
              {it.line_total != null && (
                <span className="text-[12px] font-bold text-dark tabular-nums">
                  KSh {it.line_total.toLocaleString("en-KE")}
                </span>
              )}
            </div>
          ))}
          {isDelivery && fee > 0 && food != null && (
            <>
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface">
                <span className="text-[12.5px] text-text2">Food</span>
                <span className="text-[12.5px] font-semibold text-dark tabular-nums">
                  KSh {food.toLocaleString("en-KE")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-text2">Delivery fee</span>
                <span className="text-[12.5px] font-semibold text-dark tabular-nums">
                  KSh {fee.toLocaleString("en-KE")}
                </span>
              </div>
            </>
          )}
          {order.total_kes != null && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface">
              <span className="text-[13px] font-semibold text-text2">
                Total (pay {isDelivery ? "on delivery" : "at pickup"})
              </span>
              <span className="text-[15px] font-extrabold text-dark tabular-nums">
                KSh {Number(order.total_kes).toLocaleString("en-KE")}
              </span>
            </div>
          )}
        </div>

        {/* A way out while nothing has been cooked yet. After that, it is a
            phone call — the number is on the menu page. */}
        {order.status === "new" && (
          <div className="mt-5">
            <button
              type="button"
              onClick={cancelOrder}
              disabled={cancelling}
              className="text-[12.5px] font-bold text-text3 hover:text-[#DC2626] disabled:opacity-50"
            >
              {cancelling ? "Cancelling…" : "Changed your mind? Cancel this order"}
            </button>
            {cancelError && <p className="text-[12px] text-[#DC2626] mt-1">{cancelError}</p>}
          </div>
        )}
      </div>

      <Link
        href={`/m/${order.restaurant.slug}`}
        className="mt-5 text-[13px] font-semibold text-text2 hover:text-dark transition-colors"
      >
        ← Back to menu
      </Link>
    </div>
  );
}
