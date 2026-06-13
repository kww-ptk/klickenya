"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { PosHeader } from "./PosHeader";
import { PosTabBar } from "./PosTabBar";
import { usePosShell } from "./_shell/PosShellProvider";
import { posFetch } from "./_shell/posFetch";

/**
 * Waiter Ready tab. Polls /api/menu/orders?status=ready every 5s and shows
 * a card per ready order with a "Mark delivered" button. Orders placed by
 * the signed-in waiter get a small "Yours" badge so they can scan their
 * own pickups quickly without filtering them out for everyone else.
 */

interface OrderItem {
  id:             string;
  item_name:      string;
  quantity:       number;
  selected_options?: { group?: string; choice?: string; price_add?: number; name?: string; price_modifier?: number }[];
  allergy_notes?: string | null;
}

interface ReadyOrder {
  id:            string;
  status:        "ready";
  table_number:  string | null;
  customer_name: string | null;
  notes:         string | null;
  total_kes:     number | null;
  created_at:    string;
  waiter_id:     string | null;
  waiter_name:   string | null;
  order_items:   OrderItem[];
}

const POLL_MS = 5_000;

interface Props {
  staffId: string;
}

interface Toast {
  id:   number;
  msg:  string;
  type: "success" | "error";
}

export function PosReadyOrders({ staffId }: Props) {
  const { menu } = usePosShell();
  const menuId = menu.id;

  const [orders, setOrders] = useState<ReadyOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  }, []);

  /* ── Poll for ready orders ─────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    try {
      const res = await posFetch(`/api/menu/orders?menu_id=${menuId}&status=ready`);
      if (!res.ok) return;
      const data = await res.json();
      setOrders((data.orders ?? []) as ReadyOrder[]);
    } catch {
      /* network — try again next tick */
    }
  }, [menuId]);

  useEffect(() => {
    refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    const interval = setInterval(refresh, POLL_MS);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  /* ── Mark delivered ─────────────────────────────────────────────────── */
  const markDelivered = useCallback(
    async (orderId: string) => {
      setBusyId(orderId);
      try {
        const res = await posFetch("/api/menu/orders", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ order_id: orderId, status: "delivered" }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || "Could not mark delivered", "error");
          return;
        }
        // Optimistically drop the row; the next poll would do the same.
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast("Marked delivered");
      } finally {
        setBusyId(null);
      }
    },
    [showToast],
  );

  /* ── Sort: oldest first so the longest-waiting order is on top ───────── */
  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    [orders],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <PosHeader />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 pt-3 pb-24">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text3">Ready for pickup</p>
            <h1 className="text-[20px] font-bold text-white">{sortedOrders.length} {sortedOrders.length === 1 ? "order" : "orders"}</h1>
          </div>
          <p className="text-[11px] text-text3">Live · 5s</p>
        </div>

        {sortedOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-10 text-center">
            <p className="text-[14px] text-text3">Nothing ready yet.</p>
            <p className="text-[12px] text-[#6F6859] mt-1">When the kitchen marks an order ready, it will appear here.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedOrders.map((o) => {
              const mine = o.waiter_id === staffId;
              const ageMin = Math.max(
                0,
                Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000),
              );
              const itemTotal = o.order_items.reduce((s, it) => s + it.quantity, 0);
              return (
                <li
                  key={o.id}
                  className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-bold text-white">
                        Table {o.table_number ?? "—"}
                      </span>
                      {mine && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold bg-[#231D12] text-amber">
                          Yours
                        </span>
                      )}
                      <span className="text-[11px] text-text3">
                        {ageMin === 0 ? "just now" : `${ageMin} min ago`}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {o.order_items.map((it) => (
                        <li key={it.id} className="text-[12px] text-surface">
                          <span className="text-text3">{it.quantity}×</span> {it.item_name}
                          {it.allergy_notes ? (
                            <span className="block text-[11px] text-[#FF8A6B] ml-5">
                              Note: {it.allergy_notes}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-text3">
                      {itemTotal} {itemTotal === 1 ? "item" : "items"}
                      {o.waiter_name ? ` · ${o.waiter_name}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => markDelivered(o.id)}
                    disabled={busyId === o.id}
                    className="shrink-0 h-12 px-5 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold disabled:opacity-40 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {busyId === o.id ? "Marking…" : "Mark delivered"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <PosTabBar />

      {/* Toasts */}
      <div className="fixed top-16 right-3 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-full text-[13px] font-semibold shadow-2xl ${
              t.type === "success"
                ? "bg-amber text-dark"
                : "bg-[#FF8A6B] text-dark"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
