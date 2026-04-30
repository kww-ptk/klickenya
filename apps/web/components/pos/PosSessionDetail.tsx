"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { PosHeader } from "./PosHeader";
import { PosTabBar } from "./PosTabBar";
import { PosOrderEntry } from "./PosOrderEntry";
import { PosBillPanel } from "./PosBillPanel";
import { OrderItemEditPrompt } from "./OrderItemEditPrompt";
import { usePosShell } from "./_shell/PosShellProvider";
import { posFetch } from "./_shell/posFetch";
import { subscribeSessionRealtime } from "./_shell/realtime";

interface PosSessionDetailProps {
  tableId:     string;
  tableNumber: string;
  sessionId:   string | null;
}

interface OrderItem {
  id:               string;
  name:             string;
  quantity:         number;
  line_total:       number | null;
  selected_options: Array<{ group: string; choice: string; price_add: number }>;
  allergy_notes:    string | null;
  is_voided:        boolean;
  voided_reason:    string | null;
}

interface OrderSummary {
  id:            string;
  status:        string;
  created_at:    string;
  customer_name: string | null;
  notes:         string | null;
  total_kes:     number;
  source:        "guest" | "waiter";
  waiter_name:   string | null;
  items:         OrderItem[];
}

interface SessionDetail {
  id:                    string;
  status:                "open" | "billed" | "paid" | "void";
  covers:                number;
  service_charge_pct:    number;
  service_charge_amount: number;
  discount_pct:          number;
  discount_amount:       number;
  discount_amount_kes:   number;
  total_discount:        number;
  after_discount:        number;
  split_count:           number;
  bill_notes:            string | null;
  per_person:            number;
  subtotal_kes:          number;
  total_kes:             number;
  payment_method:        string | null;
  mpesa_ref:             string | null;
  opened_at:             string;
  opened_by_name:        string | null;
  receipt_sent_to:       string | null;
  linked_guest_email:    string | null;
  manager_discount_threshold_pct: number;
  table_number:          string | null;
  orders:                OrderSummary[];
}

// Fallback poll if realtime is unavailable. Realtime drives the hot path.
const FALLBACK_POLL_MS = 30_000;

function formatKes(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

/* ── Lightweight in-component toast ─────────────────────────────────────────── */

interface Toast {
  id:   number;
  msg:  string;
  type: "success" | "error";
}

export function PosSessionDetail({
  tableNumber,
  sessionId,
}: PosSessionDetailProps) {
  const { menu, sections: menuSections } = usePosShell();
  const slug = menu.slug;
  const router = useRouter();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  // True until the first refresh resolves. Prevents the "no open session"
  // empty state flashing while we're still loading detail for a session that
  // *does* exist (passed in as sessionId from the server).
  const [loadingDetail, setLoadingDetail] = useState<boolean>(!!sessionId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [mpesaPromptOpen, setMpesaPromptOpen] = useState(false);
  const [mpesaRef, setMpesaRef] = useState("");
  // Item being edited (quantity reduced or removed entirely). Null when
  // no edit is in flight. The current quantity is captured so the modal
  // can render the stepper bounded to "less than current".
  const [pendingEditItem, setPendingEditItem] = useState<{
    itemId:    string;
    itemName:  string;
    quantity:  number;
  } | null>(null);
  const toastIdRef = useRef(0);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  /* ── Refresh from API ─────────────────────────────────────────────────────── */
  const refresh = useCallback(async () => {
    if (!sessionId) {
      setDetail(null);
      setLoadingDetail(false);
      return;
    }
    try {
      const res = await posFetch(`/api/menu/sessions/${sessionId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load session");
        return;
      }
      const data = await res.json();
      setDetail(data.session);
      setError(null);
    } catch {
      /* network error — try again next tick */
    } finally {
      setLoadingDetail(false);
    }
  }, [sessionId]);

  // Realtime: subscribe to orders + table_sessions changes for THIS session.
  // New guest orders show up in ~150 ms; payment / void transitions instant.
  // We keep a 30s fallback poll so a flaky realtime channel can't leave the
  // detail page stale forever.
  useEffect(() => {
    refresh();
    if (!sessionId) return;
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    const fallback = setInterval(refresh, FALLBACK_POLL_MS);
    const unsubscribe = subscribeSessionRealtime({
      sessionId,
      onChange: refresh,
    });
    return () => {
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVis);
      unsubscribe();
    };
  }, [refresh, sessionId]);

  const transition = useCallback(
    async (
      action: "bill" | "pay-cash" | "pay-card" | "pay-mpesa" | "void",
      extras?: { mpesa_ref?: string },
    ) => {
      if (!sessionId) return;
      const ok =
        action === "void"
          ? confirm("Void this session? This cannot be undone.")
          : true;
      if (!ok) return;

      setBusy(action);
      try {
        const body =
          action === "bill"      ? { status: "billed" } :
          action === "void"      ? { status: "void" } :
          action === "pay-cash"  ? { status: "paid", payment_method: "cash" } :
          action === "pay-card"  ? { status: "paid", payment_method: "card" } :
                                   { status: "paid", payment_method: "mpesa", mpesa_ref: extras?.mpesa_ref ?? null };
        const res = await posFetch(`/api/menu/sessions/${sessionId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || "Failed to update session.", "error");
          return;
        }
        if (action === "void") {
          router.replace(`/pos/${slug}/tables`);
          router.refresh();
          return;
        }
        // For pay-* and bill, stay on the session page so the waiter can
        // print / share / email the receipt before walking away.
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [sessionId, refresh, router, slug, showToast],
  );

  const onPayMpesa = useCallback(() => {
    setMpesaRef("");
    setMpesaPromptOpen(true);
  }, []);

  const confirmMpesa = useCallback(async () => {
    setMpesaPromptOpen(false);
    await transition("pay-mpesa", { mpesa_ref: mpesaRef.trim() || undefined });
  }, [mpesaRef, transition]);

  /* ── Edit item flow ───────────────────────────────────────────────────────
   * Each item in the previous-orders list has a small ✎ button that opens
   * the edit modal. The waiter (with manager PIN) can reduce the quantity
   * or remove the line entirely. The API soft-deletes when the quantity
   * goes to 0, otherwise reduces quantity + recomputes line_total. Either
   * way the session totals re-cache and we write one audit log row.
   */
  const confirmEditItem = useCallback(
    async ({ newQuantity, pin, reason }: { newQuantity: number; pin: string; reason: string }) => {
      if (!pendingEditItem) return;
      const { itemId, quantity } = pendingEditItem;
      setPendingEditItem(null);
      const res = await posFetch(`/api/menu/order-items/${itemId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:               "edit",
          new_quantity:         newQuantity,
          reason,
          manager_override_pin: pin,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to update item", "error");
        return;
      }
      const removed = quantity - newQuantity;
      showToast(
        newQuantity === 0
          ? "Item removed"
          : `Reduced by ${removed} (now ${newQuantity})`,
      );
      await refresh();
    },
    [pendingEditItem, refresh, showToast],
  );

  const sortedOrders = useMemo(
    () =>
      detail
        ? [...detail.orders].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
        : [],
    [detail],
  );

  const sessionOpen = detail?.status === "open";

  return (
    <div className="min-h-screen flex flex-col">
      <PosHeader />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-3 sm:px-6 pt-3 pb-24">
        {/* Top bar: back + table label + status */}
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/pos/${slug}/tables`}
            className="w-12 h-12 rounded-full bg-[#252019] grid place-items-center text-[#F4F1EC]"
            aria-label="Back to tables"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[#9C9485]">Table</p>
            <h1 className="text-[20px] font-bold text-white truncate">Table {tableNumber}</h1>
          </div>
          {detail && (
            <span
              className={`text-[11px] uppercase tracking-wide font-bold px-3 py-1 rounded-full ${
                detail.status === "open"
                  ? "bg-[#231D12] text-[#E8A020]"
                  : detail.status === "billed"
                    ? "bg-[#192034] text-[#5BA1FF]"
                    : "bg-[#252019] text-[#9C9485]"
              }`}
            >
              {detail.status}
            </span>
          )}
        </div>

        {loadingDetail ? (
          <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-8 text-center">
            <div className="inline-block w-6 h-6 rounded-full border-2 border-[#3A342B] border-t-[#E8A020] animate-spin" />
            <p className="text-[12px] text-[#9C9485] mt-3">Loading session…</p>
          </div>
        ) : !sessionId || !detail ? (
          <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-8 text-center">
            <p className="text-[14px] text-[#9C9485]">
              {error ?? "No open session for this table."}
            </p>
            <Link
              href={`/pos/${slug}/tables`}
              className="mt-3 inline-block text-[12px] font-semibold text-[#E8A020]"
            >
              Back to tables
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Order entry split panel — only when session is open */}
            {sessionOpen && (
              <PosOrderEntry
                sessionId={sessionId}
                sessionOpen={sessionOpen}
                menuSections={menuSections}
                onOrderSent={() => {
                  refresh();
                }}
                showToast={showToast}
              />
            )}

            {/* Right-aligned column on md+ so this stack visually sits under
                the "Current order" panel inside PosOrderEntry (which uses
                col-span-2 of a 5-col split). On mobile it's a single column,
                full width, naturally below the order entry sheet. */}
            <div className="md:grid md:grid-cols-5 md:gap-3">
              <div className="md:col-start-4 md:col-span-2 space-y-3">
                {/* Previous orders */}
                <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2A2520] flex items-baseline justify-between">
                    <p className="text-[13px] font-bold text-white">
                      Previous orders ({sortedOrders.length})
                    </p>
                    <p className="text-[11px] text-[#9C9485]">Live · 8s</p>
                  </div>
                  {sortedOrders.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px] text-[#9C9485]">
                      No orders yet for this session.
                    </div>
                  ) : (
                    sortedOrders.map((order) => {
                      const expanded = expandedOrderId === order.id;
                      const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);
                      return (
                        <div key={order.id} className="border-b border-[#2A2520] last:border-0">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#252019] transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {expanded ? (
                                <ChevronDown className="w-4 h-4 text-[#9C9485] shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[#9C9485] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-[12px] text-[#9C9485]">
                                  {new Date(order.created_at).toLocaleTimeString("en-KE", {
                                    hour:    "2-digit",
                                    minute:  "2-digit",
                                    timeZone: "Africa/Nairobi",
                                  })}
                                  <span className="ml-2 uppercase tracking-wide font-bold">
                                    {order.source}
                                  </span>
                                  {order.waiter_name ? (
                                    <span className="ml-1 text-[#9C9485]">· {order.waiter_name}</span>
                                  ) : null}
                                </p>
                                <p className="text-[12px] text-[#F4F1EC] mt-0.5">
                                  {itemCount} {itemCount === 1 ? "item" : "items"}
                                  <span className="ml-2 uppercase tracking-wide font-semibold text-[#9C9485]">
                                    {order.status}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <p className="text-[13px] font-bold text-white shrink-0">
                              {formatKes(order.total_kes)}
                            </p>
                          </button>
                          {expanded && (
                            <ul className="px-10 pb-3 space-y-1.5">
                              {order.items.map((it) => {
                                const voidEditable =
                                  !it.is_voided &&
                                  (detail.status === "open" || detail.status === "billed");
                                return (
                                  <li
                                    key={it.id}
                                    className={`flex items-start gap-2 text-[12px] ${
                                      it.is_voided ? "text-[#5E5848] line-through" : "text-[#F4F1EC]"
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="text-[#9C9485]">{it.quantity}×</span> {it.name}
                                      {it.selected_options?.length ? (
                                        <span className="text-[#9C9485]">
                                          {" — "}
                                          {it.selected_options.map((o) => o.choice).join(", ")}
                                        </span>
                                      ) : null}
                                      {it.is_voided && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-bold bg-[#3A1F1F] text-[#FF8A6B] no-underline align-middle">
                                          Voided{it.voided_reason ? ` · ${it.voided_reason}` : ""}
                                        </span>
                                      )}
                                      {it.allergy_notes && !it.is_voided ? (
                                        <span className="block text-[11px] text-[#FF8A6B] ml-5">
                                          Note: {it.allergy_notes}
                                        </span>
                                      ) : null}
                                    </div>
                                    {voidEditable && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPendingEditItem({
                                            itemId:   it.id,
                                            itemName: it.name,
                                            quantity: it.quantity,
                                          })
                                        }
                                        className="shrink-0 w-7 h-7 rounded-full bg-[#252019] text-[#9C9485] hover:bg-[#231D12] hover:text-[#E8A020] grid place-items-center transition-colors"
                                        aria-label={`Edit ${it.name}`}
                                        title="Edit quantity or remove (manager required)"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Session meta */}
                <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 space-y-2">
                  <div className="flex items-center justify-between text-[12px] text-[#9C9485]">
                    <span>Covers</span>
                    <span className="text-white">×{detail.covers}</span>
                  </div>
                  {detail.opened_by_name && (
                    <div className="flex items-center justify-between text-[12px] text-[#9C9485]">
                      <span>Opened by</span>
                      <span className="text-white truncate ml-2">{detail.opened_by_name}</span>
                    </div>
                  )}
                </div>

                {/* Bill panel — only when there's at least one order. Bill
                    rendering, discount controls, split, share buttons. */}
                {sortedOrders.length > 0 && (
                  <PosBillPanel
                    initialEmail={detail.linked_guest_email}
                    showToast={showToast}
                    onSaved={refresh}
                    session={{
                      id:                  detail.id,
                      status:              detail.status,
                      subtotal_kes:        detail.subtotal_kes,
                      service_charge_pct:  detail.service_charge_pct,
                      discount_pct:        detail.discount_pct,
                      discount_amount_kes: detail.discount_amount_kes,
                      split_count:         detail.split_count,
                      bill_notes:          detail.bill_notes,
                      table_number:        tableNumber,
                      payment_method:      detail.payment_method,
                      mpesa_ref:           detail.mpesa_ref,
                      receipt_sent_to:     detail.receipt_sent_to,
                      manager_discount_threshold_pct: detail.manager_discount_threshold_pct ?? 10,
                    }}
                  />
                )}

                {/* Payment + lifecycle actions */}
                {detail.status !== "paid" && detail.status !== "void" && (
                  <div className="grid grid-cols-2 gap-2">
                    {detail.status === "open" && (
                      <button
                        type="button"
                        onClick={() => transition("bill")}
                        disabled={busy !== null}
                        className="h-12 rounded-full bg-[#E8A020] text-[#16130C] text-[13px] font-bold disabled:opacity-40"
                      >
                        {busy === "bill" ? "Marking…" : "Mark as billed"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => transition("pay-cash")}
                      disabled={busy !== null}
                      className="h-12 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold disabled:opacity-40"
                    >
                      {busy === "pay-cash" ? "Saving…" : "Mark paid (Cash)"}
                    </button>
                    <button
                      type="button"
                      onClick={() => transition("pay-card")}
                      disabled={busy !== null}
                      className="h-12 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold disabled:opacity-40"
                    >
                      {busy === "pay-card" ? "Saving…" : "Mark paid (Card)"}
                    </button>
                    <button
                      type="button"
                      onClick={onPayMpesa}
                      disabled={busy !== null}
                      className="h-12 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold disabled:opacity-40"
                    >
                      {busy === "pay-mpesa" ? "Saving…" : "Mark paid (M-Pesa)"}
                    </button>
                    {detail.status === "open" && (
                      <button
                        type="button"
                        onClick={() => transition("void")}
                        disabled={busy !== null}
                        className="h-12 rounded-full bg-[#252019] text-[#FF8A6B] text-[13px] font-bold disabled:opacity-40"
                      >
                        {busy === "void" ? "Voiding…" : "Void session"}
                      </button>
                    )}
                  </div>
                )}

                {/* Paid summary — once payment lands, the bill panel goes
                    read-only but the share buttons remain active above. */}
                {detail.status === "paid" && (
                  <div className="rounded-2xl border border-[#1F3A1F] bg-[#0F1A0E] p-4 text-center">
                    <p className="text-[12px] text-[#7CC97C] uppercase tracking-wide font-bold">
                      Paid by {detail.payment_method === "mpesa" ? "M-Pesa" : detail.payment_method === "card" ? "Card" : "Cash"}
                      {detail.mpesa_ref ? ` · ref ${detail.mpesa_ref}` : ""}
                    </p>
                    <p className="text-[18px] font-bold text-white mt-1">
                      {formatKes(detail.total_kes)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <PosTabBar />

      {/* M-Pesa reference prompt */}
      {mpesaPromptOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 grid place-items-center px-4"
          onClick={() => setMpesaPromptOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#1A170F] border border-[#2A2520] p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-bold text-white">M-Pesa reference</p>
            <p className="text-[12px] text-[#9C9485]">Optional: enter the M-Pesa transaction code from the SMS.</p>
            <input
              type="text"
              autoFocus
              maxLength={64}
              value={mpesaRef}
              onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
              placeholder="e.g. SLM4XYZ8K2"
              className="w-full h-11 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[14px] px-3 tracking-wider"
              onKeyDown={(e) => { if (e.key === "Enter") confirmMpesa(); }}
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMpesaPromptOpen(false)}
                className="flex-1 h-11 rounded-full bg-[#252019] text-[#F4F1EC] text-[13px] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMpesa}
                className="flex-1 h-11 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold"
              >
                Confirm payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / remove an item from a sent order */}
      {pendingEditItem && (
        <OrderItemEditPrompt
          itemName={pendingEditItem.itemName}
          currentQuantity={pendingEditItem.quantity}
          onCancel={() => setPendingEditItem(null)}
          onConfirm={confirmEditItem}
        />
      )}

      {/* Toasts */}
      <div className="fixed top-16 right-3 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-full text-[13px] font-semibold shadow-2xl ${
              t.type === "success"
                ? "bg-[#E8A020] text-[#16130C]"
                : "bg-[#FF8A6B] text-[#16130C]"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

