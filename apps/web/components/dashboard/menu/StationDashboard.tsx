// apps/web/components/dashboard/menu/StationDashboard.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface SelectedOption { group: string; choice: string; price_add: number }

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  notes: string | null;
  selected_options?: SelectedOption[];
  allergy_notes?: string | null;
  line_total?: number | null;
  station: "kitchen" | "bar";
  station_status: "new" | "preparing" | "ready" | "delivered" | "cancelled";
  is_voided?: boolean;
}

export interface DashboardOrder {
  id: string;
  status: string;
  table_number: string | null;
  customer_name: string | null;
  notes?: string | null;
  total_kes: number | null;
  created_at: string;
  waiter_id?: string | null;
  waiter_name?: string | null;
  order_items: OrderItem[];
}

const STATION_THEME = {
  kitchen: {
    label: "Kitchen", emoji: "🍳",
    accent: "bg-[#E8A020]", soft: "bg-[#FDF4E0]",
    border: "border-[#E8A020]/40",
  },
  bar: {
    label: "Bar", emoji: "🍹",
    accent: "bg-teal-500", soft: "bg-teal-50",
    border: "border-teal-400/40",
  },
} as const;

const ITEM_NEXT: Record<string, { label: string; next: string }> = {
  new:       { label: "Start preparing", next: "preparing" },
  preparing: { label: "Mark ready",      next: "ready" },
  ready:     { label: "Done",            next: "delivered" },
};

function elapsed(createdAt: string): string {
  const diffMin = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} min ago`;
}

interface Props {
  menuId: string;
  station: "kitchen" | "bar";
  initialOrders: DashboardOrder[];
  /** When true, only items for this station are rendered. Always true in current callers. */
  filterToStation: boolean;
  /** Optional header slot (e.g. "Switch to bar" link in split mode). */
  headerSlot?: React.ReactNode;
}

export function StationDashboard({
  menuId, station, initialOrders, filterToStation, headerSlot,
}: Props) {
  const theme = STATION_THEME[station];
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const ordersRef = useRef(orders);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/menu/orders?menu_id=${menuId}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: DashboardOrder[] = data.orders ?? [];
        ordersRef.current = incoming;
        setOrders(incoming);
      } catch { /* network blip — next poll heals */ }
    };
    const i = setInterval(poll, 8000);
    return () => clearInterval(i);
  }, [menuId]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const updateItem = useCallback(async (orderItemId: string, next: string) => {
    setUpdating((p) => new Set(p).add(orderItemId));
    try {
      await fetch(`/api/menu/order-items/${orderItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_station_status", station_status: next }),
      });
    } finally {
      setUpdating((p) => { const n = new Set(p); n.delete(orderItemId); return n; });
    }
  }, []);

  const cards = useMemo(() => {
    return orders
      .map((o) => {
        const items = (o.order_items ?? [])
          .filter((it) => !it.is_voided)
          .filter((it) => filterToStation ? it.station === station : true);
        return { order: o, items };
      })
      .filter((c) => c.items.some((it) =>
        ["new", "preparing", "ready"].includes(it.station_status)
      ));
  }, [orders, station, filterToStation]);

  return (
    <section className={`flex-1 rounded-2xl ${theme.soft} ${theme.border} border-2 p-4`}>
      <header className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[14px] font-bold text-[#16130C] uppercase tracking-wide">
          {theme.emoji} {theme.label}
        </h2>
        {headerSlot}
      </header>

      {cards.length === 0 ? (
        <p className="text-[12px] text-[#9C9485] text-center py-6">
          No active {theme.label.toLowerCase()} tickets
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map(({ order, items }) => (
            <div key={order.id} className={`rounded-xl border-2 ${theme.border} bg-white p-4`}>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">Table</p>
                  <p className="font-display text-[28px] font-extrabold text-[#16130C] leading-none">
                    {order.table_number ?? "—"}
                  </p>
                  {order.waiter_name && (
                    <p className="text-[11px] text-[#5E5848] mt-1">via {order.waiter_name}</p>
                  )}
                </div>
                <span className="text-[11px] text-[#9C9485]" suppressHydrationWarning>
                  {tick >= 0 ? elapsed(order.created_at) : ""}
                </span>
              </div>

              <ul className="space-y-2">
                {items.map((it) => {
                  const action = ITEM_NEXT[it.station_status];
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-3 py-1">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#16130C] truncate">
                          {it.quantity}× {it.item_name}
                        </p>
                        {it.allergy_notes && (
                          <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
                            ⚠ {it.allergy_notes}
                          </p>
                        )}
                        <p className="text-[11px] text-[#9C9485] uppercase">{it.station_status}</p>
                      </div>
                      {action && (
                        <button
                          onClick={() => updateItem(it.id, action.next)}
                          disabled={updating.has(it.id)}
                          className={`text-[11px] font-bold text-white ${theme.accent} px-3 h-[30px] rounded-full disabled:opacity-50`}
                        >
                          {updating.has(it.id) ? "…" : action.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
