"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Types ─────────────────────────────────────────── */

interface OrderItem {
  id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  notes: string | null;
}

export interface KitchenOrder {
  id: string;
  status: "new" | "preparing" | "ready";
  table_number: string | null;
  customer_name: string | null;
  total_kes: number | null;
  created_at: string;
  order_items: OrderItem[];
}

interface KitchenDashboardProps {
  menuId: string;
  menuName: string;
  initialOrders: KitchenOrder[];
}

/* ── Audio beep (Web Audio API — no external file needed) ───────── */

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    // Beep twice
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.value = 1100;
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available (e.g. SSR or restricted context)
  }
}

/* ── Elapsed time ──────────────────────────────────── */

function elapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  return `${diffMin} min ago`;
}

/* ── Order card ────────────────────────────────────── */

interface OrderCardProps {
  order: KitchenOrder;
  isNew: boolean;
  updating: boolean;
  onAction: (orderId: string, newStatus: string) => void;
  onCancel: (orderId: string, tableNumber: string | null, shortId: string) => void;
  tick: number; // increments every 30s to refresh elapsed time
}

const STATUS_NEXT: Record<string, { label: string; next: string; color: string }> = {
  new:       { label: "Start preparing", next: "preparing", color: "bg-[#E8A020] text-[#16130C] hover:bg-[#d4911c]" },
  preparing: { label: "Mark ready",      next: "ready",     color: "bg-[#6B2D8B] text-white hover:bg-[#5a2476]" },
  ready:     { label: "Done",            next: "delivered",  color: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

function OrderCard({ order, isNew, updating, onAction, onCancel, tick }: OrderCardProps) {
  const action = STATUS_NEXT[order.status];
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm transition-all duration-300 ${
        isNew
          ? "border-[#E8A020] animate-pulse-border"
          : order.status === "new"
          ? "border-[#E8A020]/40"
          : order.status === "preparing"
          ? "border-[#6B2D8B]/30"
          : "border-emerald-300"
      }`}
    >
      {/* Table number — large and prominent */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest mb-0.5">
            Table
          </p>
          <p className="font-display text-[36px] font-extrabold text-[#16130C] leading-none tracking-tight">
            {order.table_number ?? "—"}
          </p>
          {order.customer_name && (
            <p className="text-[13px] text-[#5E5848] mt-0.5">{order.customer_name}</p>
          )}
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
            order.status === "new"
              ? "bg-[#E8A020]/15 text-[#E8A020]"
              : order.status === "preparing"
              ? "bg-[#6B2D8B]/12 text-[#6B2D8B]"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-start gap-2">
            <span className="text-[13px] font-bold text-[#16130C] shrink-0 w-[20px] text-right tabular-nums">
              {item.quantity}×
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[#16130C]">{item.item_name}</span>
              {item.notes && (
                <p className="text-[12px] text-[#9C9485] italic">{item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer: elapsed + actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#F4F1EC]">
        {/* tick is read here so the component re-renders every 30s */}
        <span className="text-[12px] text-[#9C9485]" suppressHydrationWarning>
          {tick >= 0 ? elapsed(order.created_at) : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCancel(order.id, order.table_number, shortId)}
            disabled={updating}
            className="text-[11px] font-semibold text-[#9C9485] hover:text-[#DC2626] border border-[#E2DDD5] hover:border-[#DC2626]/40 px-3 h-[30px] rounded-full transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {action && (
            <button
              onClick={() => onAction(order.id, action.next)}
              disabled={updating}
              className={`text-[12px] font-bold px-4 h-[34px] rounded-full transition-colors disabled:opacity-50 ${action.color}`}
            >
              {updating ? "…" : action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Column ────────────────────────────────────────── */

interface ColumnProps {
  title: string;
  count: number;
  colorClass: string;
  children: React.ReactNode;
}

function Column({ title, count, colorClass, children }: ColumnProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <h2 className="text-[14px] font-bold text-[#16130C] uppercase tracking-wide">{title}</h2>
        {count > 0 && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
            {count}
          </span>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */

export function KitchenDashboard({ menuId, menuName, initialOrders }: KitchenDashboardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const ordersRef = useRef<KitchenOrder[]>(initialOrders);

  /* ── Poll for new / updated orders every 8 seconds ── */
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/menu/orders?menu_id=${menuId}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: KitchenOrder[] = data.orders ?? [];

        // Detect brand-new orders (IDs not in current state)
        const currentIds = new Set(ordersRef.current.map((o) => o.id));
        const brandNew = incoming.filter((o) => !currentIds.has(o.id));

        if (brandNew.length > 0) {
          playBeep();
          const brandNewIds = new Set(brandNew.map((o) => o.id));
          setNewOrderIds((prev) => new Set([...prev, ...brandNewIds]));
          // Remove the amber flash after 3 seconds
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev);
              brandNewIds.forEach((id) => next.delete(id));
              return next;
            });
          }, 3000);
        }

        ordersRef.current = incoming;
        setOrders(incoming);
      } catch {
        // Network error — silently skip this poll cycle
      }
    };

    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [menuId]);

  /* ── Refresh elapsed time every 30 seconds ─────────── */
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── Cancel order ────────────────────────────────── */
  const handleCancel = useCallback(async (orderId: string, tableNumber: string | null, shortId: string) => {
    const label = tableNumber ? `table ${tableNumber}` : `order #${shortId}`;
    if (!window.confirm(`Cancel order #${shortId} for ${label}?`)) return;

    setUpdatingIds((prev) => new Set([...prev, orderId]));
    try {
      const res = await fetch("/api/menu/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: "cancelled" }),
      });
      if (!res.ok) return;

      const next = ordersRef.current.filter((o) => o.id !== orderId);
      ordersRef.current = next;
      setOrders(next);
    } catch {
      // Server error — next poll will correct state
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, []);

  /* ── Update order status ─────────────────────────── */
  const handleAction = useCallback(async (orderId: string, newStatus: string) => {
    setUpdatingIds((prev) => new Set([...prev, orderId]));

    try {
      const res = await fetch("/api/menu/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });

      if (!res.ok) return;

      // Optimistic: remove delivered/cancelled from list, update status for others
      if (newStatus === "delivered" || newStatus === "cancelled") {
        const next = ordersRef.current.filter((o) => o.id !== orderId);
        ordersRef.current = next;
        setOrders(next);
      } else {
        const next = ordersRef.current.map((o) =>
          o.id === orderId ? { ...o, status: newStatus as KitchenOrder["status"] } : o
        );
        ordersRef.current = next;
        setOrders(next);
      }
    } catch {
      // Server error — the next poll will correct state
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  }, []);

  /* ── Sort into columns ───────────────────────────── */
  const newOrders      = orders.filter((o) => o.status === "new")      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const preparingOrders = orders.filter((o) => o.status === "preparing").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const readyOrders    = orders.filter((o) => o.status === "ready")    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isEmpty = orders.length === 0;

  return (
    <div className="min-h-screen bg-[#F4F1EC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E2DDD5] px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-widest">Kitchen</p>
          <h1 className="font-display text-[18px] lg:text-[22px] font-bold text-[#16130C] tracking-tight leading-tight">
            {menuName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {orders.length > 0 && (
            <span className="text-[12px] font-bold text-[#9C9485]">
              {orders.length} active
            </span>
          )}
          <div
            className={`size-2.5 rounded-full ${isEmpty ? "bg-[#E2DDD5]" : "bg-emerald-500 animate-pulse"}`}
            title={isEmpty ? "No active orders" : "Live — polling every 8s"}
          />
        </div>
      </header>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="size-16 rounded-full bg-white border border-[#E2DDD5] flex items-center justify-center mb-4 shadow-sm">
            <span className="text-[28px]">🍽️</span>
          </div>
          <p className="text-[16px] font-bold text-[#16130C] mb-1">No active orders</p>
          <p className="text-[13px] text-[#9C9485]">New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="p-4 lg:p-6">
          <div className="flex gap-4 lg:gap-6 items-start">
            {/* New */}
            <Column
              title="New"
              count={newOrders.length}
              colorClass="bg-[#E8A020]/15 text-[#E8A020]"
            >
              {newOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                  updating={updatingIds.has(order.id)}
                  onAction={handleAction}
                  onCancel={handleCancel}
                  tick={tick}
                />
              ))}
              {newOrders.length === 0 && (
                <p className="text-[12px] text-[#9C9485] text-center py-6 px-2">
                  No new orders
                </p>
              )}
            </Column>

            {/* Preparing */}
            <Column
              title="Preparing"
              count={preparingOrders.length}
              colorClass="bg-[#6B2D8B]/12 text-[#6B2D8B]"
            >
              {preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={false}
                  updating={updatingIds.has(order.id)}
                  onAction={handleAction}
                  onCancel={handleCancel}
                  tick={tick}
                />
              ))}
              {preparingOrders.length === 0 && (
                <p className="text-[12px] text-[#9C9485] text-center py-6 px-2">
                  Nothing preparing
                </p>
              )}
            </Column>

            {/* Ready */}
            <Column
              title="Ready"
              count={readyOrders.length}
              colorClass="bg-emerald-100 text-emerald-700"
            >
              {readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={false}
                  updating={updatingIds.has(order.id)}
                  onAction={handleAction}
                  onCancel={handleCancel}
                  tick={tick}
                />
              ))}
              {readyOrders.length === 0 && (
                <p className="text-[12px] text-[#9C9485] text-center py-6 px-2">
                  Nothing ready yet
                </p>
              )}
            </Column>
          </div>
        </div>
      )}

      {/* Pulse-border animation for new orders */}
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgb(232 160 32 / 0.4); }
          50%       { border-color: rgb(232 160 32 / 1); }
        }
        .animate-pulse-border {
          animation: pulse-border 0.6s ease-in-out 5;
        }
      `}</style>
    </div>
  );
}
