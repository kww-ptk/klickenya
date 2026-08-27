// apps/web/components/dashboard/menu/StationDashboard.tsx
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { pickupWaMeLink } from "@/lib/orders/takeaway";

/* ── Types ─────────────────────────────────────────── */

interface SelectedOption {
  group: string;
  choice: string;
  price_add: number;
}

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
  order_type?: "dine_in" | "takeaway" | "delivery";
  table_number: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  estimated_ready_at?: string | null;
  notes?: string | null;
  total_kes: number | null;
  created_at: string;
  waiter_id?: string | null;
  waiter_name?: string | null;
  order_items: OrderItem[];
}

interface Props {
  menuId: string;
  station: "kitchen" | "bar";
  initialOrders: DashboardOrder[];
}

type StationStatus = "new" | "preparing" | "ready";

/* ── Allergen heuristic ─────────────────────────────── */

const ALLERGEN_KEYWORDS = [
  "nut", "peanut", "dairy", "milk", "lactose", "gluten", "wheat",
  "egg", "shellfish", "shrimp", "prawn", "soy", "sesame",
];

function parseAllergyText(text: string | null | undefined): {
  allergenPart: string | null;
  notesPart: string | null;
} {
  if (!text?.trim()) return { allergenPart: null, notesPart: null };
  const parts = text.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
  const allergens: string[] = [];
  const notes: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (ALLERGEN_KEYWORDS.some((kw) => lower.includes(kw))) allergens.push(part);
    else notes.push(part);
  }
  return {
    allergenPart: allergens.length > 0 ? allergens.join(", ") : null,
    notesPart: notes.length > 0 ? notes.join(", ") : null,
  };
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
    // AudioContext not available
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

/* ── Status → next action ──────────────────────────── */

const STATUS_NEXT: Record<StationStatus, { label: string; next: string; color: string }> = {
  new:       { label: "Start preparing", next: "preparing", color: "bg-amber text-dark hover:bg-[#d4911c]" },
  preparing: { label: "Mark ready",      next: "ready",     color: "bg-purple text-white hover:bg-[#5a2476]" },
  ready:     { label: "Done",            next: "delivered", color: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

/* ── Card ──────────────────────────────────────────── */

interface CardProps {
  order: DashboardOrder;
  items: OrderItem[];
  status: StationStatus;
  isNew: boolean;
  updating: boolean;
  onAdvance: (items: OrderItem[], nextStatus: string) => void;
  onCancel: (orderId: string, tableNumber: string | null, shortId: string) => void;
  onAcceptTakeaway: (order: DashboardOrder, items: OrderItem[], minutes: number) => void;
  tick: number;
}

function OrderCard({ order, items, status, isNew, updating, onAdvance, onCancel, onAcceptTakeaway, tick }: CardProps) {
  const action = STATUS_NEXT[status];
  const shortId = order.id.slice(0, 8).toUpperCase();
  const lineTotalSum = items.reduce((s, i) => s + (i.line_total ?? 0), 0);
  const showLineTotals = items.some((i) => i.line_total != null);

  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-sm transition-all duration-300 ${
        isNew
          ? "border-amber animate-pulse-border"
          : status === "new"
          ? "border-amber/40"
          : status === "preparing"
          ? "border-purple/30"
          : "border-emerald-300"
      }`}
    >
      {/* Table number + status badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          {order.order_type === "takeaway" ? (
            <>
              <p className="text-[11px] font-bold text-amber uppercase tracking-widest mb-0.5">
                🛍 Takeaway
              </p>
              <p className="font-display text-[22px] font-extrabold text-dark leading-tight tracking-tight">
                {order.customer_name ?? "Guest"}
              </p>
              {order.customer_phone && (
                <a
                  href={`tel:${order.customer_phone}`}
                  className="text-[13px] text-text2 mt-0.5 underline decoration-border underline-offset-2"
                >
                  {order.customer_phone}
                </a>
              )}
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold text-text3 uppercase tracking-widest mb-0.5">Table</p>
              <p className="font-display text-[36px] font-extrabold text-dark leading-none tracking-tight">
                {order.table_number ?? "—"}
              </p>
              {order.customer_name && (
                <p className="text-[13px] text-text2 mt-0.5">{order.customer_name}</p>
              )}
            </>
          )}
          {order.waiter_name && (
            <p className="text-[11px] text-text3 mt-0.5">via {order.waiter_name}</p>
          )}
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${
            status === "new"
              ? "bg-amber/15 text-amber"
              : status === "preparing"
              ? "bg-purple/12 text-purple"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {status}
        </span>
      </div>

      {/* Order-level note from the guest */}
      {order.notes && (
        <div className="mb-3 rounded-lg border border-amber/40 bg-amber/8 px-3 py-2">
          <p className="text-[10px] font-bold text-amber uppercase tracking-wide mb-0.5">
            Note from guest
          </p>
          <p className="text-[12px] text-dark leading-snug whitespace-pre-wrap">
            {order.notes}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2.5 mb-3">
        {items.map((item) => {
          const { allergenPart, notesPart } = parseAllergyText(item.allergy_notes);
          return (
            <div key={item.id}>
              {/* Qty · Name · Line total */}
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-bold text-dark shrink-0 w-[20px] text-right tabular-nums">
                  {item.quantity}×
                </span>
                <span className="flex-1 text-[13px] font-semibold text-dark leading-snug">
                  {item.item_name}
                </span>
                {item.line_total != null && (
                  <span className="text-[12px] font-bold text-dark shrink-0 tabular-nums">
                    KSh {item.line_total.toLocaleString("en-KE")}
                  </span>
                )}
              </div>

              {/* Selected options */}
              {item.selected_options && item.selected_options.length > 0 && (
                <div className="ml-[28px] mt-0.5 space-y-0">
                  {item.selected_options.map((o, i) => (
                    <p key={i} className="text-[12px] text-[#3D3A32]">
                      › {o.group}: {o.choice}
                    </p>
                  ))}
                </div>
              )}

              {/* Allergy pill (red, unmissable) */}
              {allergenPart && (
                <div
                  className="ml-[28px]"
                  style={{
                    background: "#FEE2E2",
                    border: "1px solid #DC2626",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span style={{ fontSize: "13px" }}>⚠</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#DC2626",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    ALLERGY: {allergenPart}
                  </span>
                </div>
              )}

              {/* Special instructions (amber) */}
              {notesPart && (
                <p className="ml-[28px] mt-1 text-[12px] text-amber font-medium">
                  ⚑ {notesPart}
                </p>
              )}

              {/* Legacy notes field */}
              {item.notes && (
                <p className="ml-[28px] text-[12px] text-text3 italic">{item.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Sub-total for the items shown on this card */}
      {showLineTotals && (
        <div className="flex items-center justify-between pt-2 border-t border-surface mb-3">
          <span className="text-[12px] font-semibold text-text2">Subtotal</span>
          <span className="text-[13px] font-bold text-dark tabular-nums">
            KSh {lineTotalSum.toLocaleString("en-KE")}
          </span>
        </div>
      )}

      {/* Footer: elapsed + actions */}
      <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface">
        <span className="text-[12px] text-text3" suppressHydrationWarning>
          {tick >= 0 ? elapsed(order.created_at) : ""}
        </span>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {order.order_type === "takeaway" && status === "new" ? (
            <>
              <button
                onClick={() => onCancel(order.id, order.table_number, shortId)}
                disabled={updating}
                className="text-[11px] font-semibold text-text3 hover:text-[#DC2626] border border-border hover:border-[#DC2626]/40 px-3 h-[30px] rounded-full transition-colors disabled:opacity-50"
              >
                Decline
              </button>
              <span className="text-[11px] font-bold text-text3 uppercase">Accept:</span>
              {[15, 30, 45].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onAcceptTakeaway(order, items, mins)}
                  disabled={updating}
                  className="text-[12px] font-bold px-3 h-[34px] rounded-full bg-amber text-dark hover:bg-[#d4911c] transition-colors disabled:opacity-50"
                >
                  {mins}m
                </button>
              ))}
            </>
          ) : (
            <>
              {order.order_type === "takeaway" && status === "ready" && order.customer_phone && (
                <a
                  href={pickupWaMeLink(order.customer_phone, order.customer_name, shortId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 px-3 h-[30px] rounded-full transition-colors inline-flex items-center"
                >
                  WhatsApp
                </a>
              )}
              <button
                onClick={() => onCancel(order.id, order.table_number, shortId)}
                disabled={updating}
                className="text-[11px] font-semibold text-text3 hover:text-[#DC2626] border border-border hover:border-[#DC2626]/40 px-3 h-[30px] rounded-full transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              {action && (
                <button
                  onClick={() => onAdvance(items, action.next)}
                  disabled={updating}
                  className={`text-[12px] font-bold px-4 h-[34px] rounded-full transition-colors disabled:opacity-50 ${action.color}`}
                >
                  {updating ? "…" : action.label}
                </button>
              )}
            </>
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
  emptyText: string;
  children: React.ReactNode;
}

function Column({ title, count, colorClass, emptyText, children }: ColumnProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h2 className="text-[14px] font-bold text-dark uppercase tracking-wide">{title}</h2>
        {count > 0 && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
            {count}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {count === 0 ? (
          <p className="text-[12px] text-text3 text-center py-6 px-2">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────── */

interface CardBucket {
  key: string;
  order: DashboardOrder;
  items: OrderItem[];
  status: StationStatus;
}

export function StationDashboard({ menuId, station, initialOrders }: Props) {
  const [orders, setOrders] = useState<DashboardOrder[]>(initialOrders);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0);
  const ordersRef = useRef<DashboardOrder[]>(initialOrders);

  /* ── Poll every 8 seconds ── */
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/menu/orders?menu_id=${menuId}`);
        if (!res.ok) return;
        const data = await res.json();
        const incoming: DashboardOrder[] = data.orders ?? [];

        // Detect brand-new orders that contain at least one item for this station
        const currentIds = new Set(ordersRef.current.map((o) => o.id));
        const brandNew = incoming.filter(
          (o) =>
            !currentIds.has(o.id) &&
            (o.order_items ?? []).some((it) => !it.is_voided && it.station === station),
        );

        if (brandNew.length > 0) {
          playBeep();
          const brandNewIds = new Set(brandNew.map((o) => o.id));
          setNewOrderIds((prev) => new Set([...prev, ...brandNewIds]));
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
        // Network blip — next poll heals
      }
    };
    const i = setInterval(poll, 8000);
    return () => clearInterval(i);
  }, [menuId, station]);

  /* ── Re-render every 30s for elapsed-time ── */
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  /* ── Advance every item on a card to the next station_status ──
   *
   * Optimistic: the items' station_status is updated locally as soon as the
   * click happens, so the card moves to the next column immediately. PATCH
   * calls run in the background; the next poll confirms (or, on failure, we
   * roll back to the pre-click snapshot and surface a console warning).
   * Without this, the card stayed put for up to 8s (the poll cadence) and
   * felt broken — looked like "the order disappeared and came back".
   */
  const handleAdvance = useCallback(
    async (items: OrderItem[], nextStatus: string) => {
      const cardKey = items.map((i) => i.id).join(",");
      const itemIds = new Set(items.map((i) => i.id));
      const snapshot = ordersRef.current;

      // Optimistic: mutate the relevant items in local state right now.
      const optimistic = snapshot.map((o) => ({
        ...o,
        order_items: (o.order_items ?? []).map((it) =>
          itemIds.has(it.id)
            ? { ...it, station_status: nextStatus as OrderItem["station_status"] }
            : it,
        ),
      }));
      ordersRef.current = optimistic;
      setOrders(optimistic);

      setUpdatingKeys((p) => new Set(p).add(cardKey));
      try {
        const results = await Promise.all(
          items.map((it) =>
            fetch(`/api/menu/order-items/${it.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "set_station_status", station_status: nextStatus }),
            })
              .then((res) => (res.ok ? null : `HTTP ${res.status} for item ${it.id}`))
              .catch((e) => `network error for item ${it.id}: ${String(e)}`),
          ),
        );
        const errs = results.filter((r): r is string => r !== null);
        if (errs.length > 0) {
          // Rollback the optimistic update; surface the error.
          console.warn("[StationDashboard] advance failed, rolling back:", errs);
          ordersRef.current = snapshot;
          setOrders(snapshot);
        }
      } catch (e) {
        console.warn("[StationDashboard] advance threw, rolling back:", e);
        ordersRef.current = snapshot;
        setOrders(snapshot);
      } finally {
        setUpdatingKeys((p) => {
          const n = new Set(p);
          n.delete(cardKey);
          return n;
        });
      }
    },
    [],
  );

  /* ── Accept a takeaway order: order-level PATCH stamps accepted_at +
   * estimated_ready_at and cascades items to preparing server-side.
   * Optimistic locally; the next poll confirms. ── */
  const handleAcceptTakeaway = useCallback(
    async (order: DashboardOrder, items: OrderItem[], minutes: number) => {
      const cardKey = items.map((i) => i.id).join(",");
      const snapshot = ordersRef.current;

      const optimistic = snapshot.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: "preparing",
              order_items: (o.order_items ?? []).map((it) =>
                it.station_status === "new"
                  ? { ...it, station_status: "preparing" as OrderItem["station_status"] }
                  : it,
              ),
            }
          : o,
      );
      ordersRef.current = optimistic;
      setOrders(optimistic);

      setUpdatingKeys((p) => new Set(p).add(cardKey));
      try {
        const res = await fetch("/api/menu/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: order.id,
            status: "preparing",
            estimated_ready_minutes: minutes,
          }),
        });
        if (!res.ok) {
          console.warn("[StationDashboard] takeaway accept failed:", res.status);
          ordersRef.current = snapshot;
          setOrders(snapshot);
        }
      } catch (e) {
        console.warn("[StationDashboard] takeaway accept error:", e);
        ordersRef.current = snapshot;
        setOrders(snapshot);
      } finally {
        setUpdatingKeys((p) => {
          const n = new Set(p);
          n.delete(cardKey);
          return n;
        });
      }
    },
    [],
  );

  /* ── Cancel whole order (doubles as takeaway Decline) ── */
  const handleCancel = useCallback(
    async (orderId: string, tableNumber: string | null, shortId: string) => {
      const label = tableNumber ? `table ${tableNumber}` : `takeaway #${shortId}`;
      if (!window.confirm(`Cancel order #${shortId} (${label})?`)) return;
      const reason = window.prompt("Reason (shown to the guest for takeaway orders)") ?? "";
      if (!reason.trim()) return;

      setUpdatingKeys((p) => new Set(p).add(`cancel:${orderId}`));
      try {
        const res = await fetch("/api/menu/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId, status: "cancelled", reason }),
        });
        if (!res.ok) {
          console.warn("[StationDashboard] cancel failed:", res.status);
          return;
        }
        // Optimistic remove
        const next = ordersRef.current.filter((o) => o.id !== orderId);
        ordersRef.current = next;
        setOrders(next);
      } catch (e) {
        console.warn("[StationDashboard] cancel error:", e);
      } finally {
        setUpdatingKeys((p) => {
          const n = new Set(p);
          n.delete(`cancel:${orderId}`);
          return n;
        });
      }
    },
    [],
  );

  /* ── Bucket orders into (order × station_status) cards ── */
  const buckets = useMemo<{ new: CardBucket[]; preparing: CardBucket[]; ready: CardBucket[] }>(() => {
    const out: { new: CardBucket[]; preparing: CardBucket[]; ready: CardBucket[] } = {
      new: [], preparing: [], ready: [],
    };
    for (const o of orders) {
      const stationItems = (o.order_items ?? [])
        .filter((it) => !it.is_voided && it.station === station);
      if (stationItems.length === 0) continue;

      const byStatus: Record<StationStatus, OrderItem[]> = { new: [], preparing: [], ready: [] };
      for (const it of stationItems) {
        if (it.station_status === "new" || it.station_status === "preparing" || it.station_status === "ready") {
          byStatus[it.station_status].push(it);
        }
      }
      (Object.keys(byStatus) as StationStatus[]).forEach((s) => {
        if (byStatus[s].length > 0) {
          out[s].push({ key: `${o.id}:${s}`, order: o, items: byStatus[s], status: s });
        }
      });
    }
    return out;
  }, [orders, station]);

  const totalCount = buckets.new.length + buckets.preparing.length + buckets.ready.length;

  return (
    <div className="w-full">
      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
          <div className="size-16 rounded-full bg-white border border-border flex items-center justify-center mb-4 shadow-sm">
            <span className="text-[28px]">{station === "bar" ? "🍹" : "🍽️"}</span>
          </div>
          <p className="text-[16px] font-bold text-dark mb-1">No active orders</p>
          <p className="text-[13px] text-text3">New orders will appear here automatically.</p>
        </div>
      ) : (
        <div className="flex gap-4 lg:gap-6 items-start">
          <Column
            title="New"
            count={buckets.new.length}
            colorClass="bg-amber/15 text-amber"
            emptyText="No new orders"
          >
            {buckets.new.map((b) => (
              <OrderCard
                key={b.key}
                order={b.order}
                items={b.items}
                status={b.status}
                isNew={newOrderIds.has(b.order.id)}
                updating={updatingKeys.has(b.items.map((i) => i.id).join(",")) || updatingKeys.has(`cancel:${b.order.id}`)}
                onAdvance={handleAdvance}
                onCancel={handleCancel}
                onAcceptTakeaway={handleAcceptTakeaway}
                tick={tick}
              />
            ))}
          </Column>

          <Column
            title="Preparing"
            count={buckets.preparing.length}
            colorClass="bg-purple/12 text-purple"
            emptyText="Nothing preparing"
          >
            {buckets.preparing.map((b) => (
              <OrderCard
                key={b.key}
                order={b.order}
                items={b.items}
                status={b.status}
                isNew={false}
                updating={updatingKeys.has(b.items.map((i) => i.id).join(",")) || updatingKeys.has(`cancel:${b.order.id}`)}
                onAdvance={handleAdvance}
                onCancel={handleCancel}
                onAcceptTakeaway={handleAcceptTakeaway}
                tick={tick}
              />
            ))}
          </Column>

          <Column
            title="Ready"
            count={buckets.ready.length}
            colorClass="bg-emerald-100 text-emerald-700"
            emptyText="Nothing ready yet"
          >
            {buckets.ready.map((b) => (
              <OrderCard
                key={b.key}
                order={b.order}
                items={b.items}
                status={b.status}
                isNew={false}
                updating={updatingKeys.has(b.items.map((i) => i.id).join(",")) || updatingKeys.has(`cancel:${b.order.id}`)}
                onAdvance={handleAdvance}
                onCancel={handleCancel}
                onAcceptTakeaway={handleAcceptTakeaway}
                tick={tick}
              />
            ))}
          </Column>
        </div>
      )}

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
