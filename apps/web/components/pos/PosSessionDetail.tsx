"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import { PosHeader } from "./PosHeader";
import { PosTabBar } from "./PosTabBar";
import { PosOrderEntry } from "./PosOrderEntry";

interface PosSessionDetailProps {
  slug:         string;
  menuId:       string;
  menuName:     string;
  tableId:      string;
  tableNumber:  string;
  sessionId:    string | null;
  staffName:    string;
  staffRole:    "waiter" | "manager" | "cashier";
  menuSections: MenuSection[];
}

interface OrderItem {
  id:               string;
  name:             string;
  quantity:         number;
  line_total:       number | null;
  selected_options: Array<{ group: string; choice: string; price_add: number }>;
  allergy_notes:    string | null;
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
  subtotal_kes:          number;
  total_kes:             number;
  payment_method:        string | null;
  opened_at:             string;
  opened_by_name:        string | null;
  orders:                OrderSummary[];
}

const POLL_MS = 8_000;

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
  slug,
  menuId,
  menuName,
  tableNumber,
  sessionId,
  staffName,
  staffRole,
  menuSections,
}: PosSessionDetailProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
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
      return;
    }
    try {
      const res = await fetch(`/api/menu/sessions/${sessionId}`);
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
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
    if (!sessionId) return;
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    const i = setInterval(refresh, POLL_MS);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh, sessionId]);

  const transition = useCallback(
    async (
      action: "bill" | "pay-cash" | "pay-card" | "pay-mpesa" | "void",
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
                                   { status: "paid", payment_method: "mpesa" };
        const res = await fetch(`/api/menu/sessions/${sessionId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          showToast(data.error || "Failed to update session.", "error");
          return;
        }
        if (action !== "bill") {
          router.replace(`/pos/${slug}/tables`);
          router.refresh();
          return;
        }
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [sessionId, refresh, router, slug, showToast],
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
      <PosHeader slug={slug} menuName={menuName} staffName={staffName} staffRole={staffRole} />

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

        {!sessionId || !detail ? (
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

            {/* Previous orders + meta + totals + actions */}
            <div className="md:grid md:grid-cols-5 md:gap-3">
              <div className="md:col-span-3 space-y-3">
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
                            <ul className="px-10 pb-3 space-y-0.5">
                              {order.items.map((it) => (
                                <li key={it.id} className="text-[12px] text-[#F4F1EC]">
                                  <span className="text-[#9C9485]">{it.quantity}×</span> {it.name}
                                  {it.selected_options?.length ? (
                                    <span className="text-[#9C9485]">
                                      {" — "}
                                      {it.selected_options.map((o) => o.choice).join(", ")}
                                    </span>
                                  ) : null}
                                  {it.allergy_notes ? (
                                    <span className="block text-[11px] text-[#FF8A6B] ml-5">
                                      Note: {it.allergy_notes}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-3 mt-3 md:mt-0">
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

                {/* Totals */}
                <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 space-y-2">
                  <Row label="Subtotal" value={formatKes(detail.subtotal_kes)} />
                  {detail.service_charge_pct > 0 && (
                    <Row
                      label={`Service (${detail.service_charge_pct}%)`}
                      value={formatKes(detail.service_charge_amount)}
                    />
                  )}
                  {detail.discount_pct > 0 && (
                    <Row
                      label={`Discount (${detail.discount_pct}%)`}
                      value={`− ${formatKes(detail.discount_amount)}`}
                    />
                  )}
                  <div className="h-px bg-[#2A2520]" />
                  <Row label="Total" value={formatKes(detail.total_kes)} highlight />
                </div>

                {/* Actions */}
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
                    {busy === "pay-cash" ? "Saving…" : "Pay (Cash)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => transition("pay-card")}
                    disabled={busy !== null}
                    className="h-12 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold disabled:opacity-40"
                  >
                    {busy === "pay-card" ? "Saving…" : "Pay (Card)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => transition("pay-mpesa")}
                    disabled={busy !== null}
                    className="h-12 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[13px] font-bold disabled:opacity-40"
                  >
                    {busy === "pay-mpesa" ? "Saving…" : "Pay (M-Pesa)"}
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
              </div>
            </div>
          </div>
        )}
      </main>

      <PosTabBar slug={slug} menuId={menuId} />

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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`${highlight ? "text-white text-[14px] font-bold" : "text-[12px] text-[#9C9485]"}`}>
        {label}
      </span>
      <span className={`${highlight ? "text-white text-[18px] font-bold" : "text-[13px] text-[#F4F1EC]"}`}>
        {value}
      </span>
    </div>
  );
}
