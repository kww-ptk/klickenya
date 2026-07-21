"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StatusOrder {
  id: string;
  short_id: string;
  status: "new" | "preparing" | "ready" | "delivered" | "cancelled";
  created_at: string;
  accepted_at: string | null;
  estimated_ready_at: string | null;
  decline_reason: string | null;
  total_kes: number | null;
  items: Array<{ name: string; quantity: number; line_total: number | null }>;
  restaurant: { name: string; slug: string };
}

function readyTimeLabel(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const STATUS_UI: Record<
  StatusOrder["status"],
  { emoji: string; title: string; tone: string }
> = {
  new:       { emoji: "⏳", title: "Waiting for the restaurant to confirm", tone: "text-amber" },
  preparing: { emoji: "👨‍🍳", title: "Order accepted — being prepared",     tone: "text-purple" },
  ready:     { emoji: "🎉", title: "Ready for pickup!",                     tone: "text-emerald-600" },
  delivered: { emoji: "✅", title: "Picked up — thank you!",                tone: "text-emerald-700" },
  cancelled: { emoji: "😔", title: "Order declined",                        tone: "text-[#DC2626]" },
};

export function OrderStatusClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<StatusOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOrder(data.order);
      } catch {
        // Network blip — next poll heals
      }
    };
    poll();
    const i = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [orderId]);

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

  const ui = STATUS_UI[order.status];
  const readyAt = readyTimeLabel(order.estimated_ready_at);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-border shadow-sm p-6 text-center">
        <p className="text-[40px] leading-none mb-3">{ui.emoji}</p>
        <h1 className={`font-display text-[22px] font-extrabold tracking-tight ${ui.tone}`}>
          {ui.title}
        </h1>

        {order.status === "new" && (
          <p className="text-[13px] text-text2 mt-2">
            {order.restaurant.name} will confirm your order shortly. Keep this page open —
            it updates automatically.
          </p>
        )}
        {order.status === "preparing" && readyAt && (
          <p className="text-[14px] text-text2 mt-2">
            Ready around <span className="font-bold text-dark">{readyAt}</span>
          </p>
        )}
        {order.status === "ready" && (
          <p className="text-[13px] text-text2 mt-2">
            Head to {order.restaurant.name} to collect your order.
          </p>
        )}
        {order.status === "cancelled" && order.decline_reason && (
          <p className="text-[13px] text-text2 mt-2">“{order.decline_reason}”</p>
        )}

        <p className="text-[11px] font-bold text-text3 uppercase tracking-widest mt-5 mb-1">
          Takeaway order
        </p>
        <p className="font-mono text-[18px] font-bold text-dark">#{order.short_id}</p>

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
          {order.total_kes != null && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface">
              <span className="text-[13px] font-semibold text-text2">Total (pay at pickup)</span>
              <span className="text-[15px] font-extrabold text-dark tabular-nums">
                KSh {order.total_kes.toLocaleString("en-KE")}
              </span>
            </div>
          )}
        </div>
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
