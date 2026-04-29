"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PosHeader } from "./PosHeader";
import { PosTabBar } from "./PosTabBar";

interface PosSessionDetailProps {
  slug:        string;
  menuId:      string;
  menuName:    string;
  tableId:     string;
  tableNumber: string;
  sessionId:   string | null;
  staffName:   string;
  staffRole:   "waiter" | "manager" | "cashier";
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

export function PosSessionDetail({
  slug,
  menuId,
  menuName,
  tableId,
  tableNumber,
  sessionId,
  staffName,
  staffRole,
}: PosSessionDetailProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
    if (!sessionId) return;
    const i = setInterval(refresh, POLL_MS);
    return () => clearInterval(i);
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
          alert(data.error || "Failed to update session.");
          return;
        }
        if (action !== "bill") {
          // closed — go back to grid
          router.replace(`/pos/${slug}/tables`);
          router.refresh();
          return;
        }
        await refresh();
      } finally {
        setBusy(null);
      }
    },
    [sessionId, refresh, router, slug],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <PosHeader slug={slug} menuName={menuName} staffName={staffName} staffRole={staffRole} />

      <main className="flex-1 max-w-screen-md mx-auto w-full px-3 sm:px-6 pt-4 pb-24">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href={`/pos/${slug}/tables`}
            className="w-10 h-10 rounded-full bg-[#252019] grid place-items-center text-[#F4F1EC]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[#9C9485]">Table</p>
            <h1 className="text-[22px] font-bold text-white truncate">Table {tableNumber}</h1>
          </div>
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
          <div className="space-y-3">
            {/* Summary card */}
            <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4">
              <div className="flex items-center justify-between text-[12px] text-[#9C9485]">
                <span>Status</span>
                <span className="uppercase tracking-wide font-bold text-white">{detail.status}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] text-[#9C9485] mt-2">
                <span>Covers</span>
                <span className="text-white">×{detail.covers}</span>
              </div>
              {detail.opened_by_name && (
                <div className="flex items-center justify-between text-[12px] text-[#9C9485] mt-2">
                  <span>Opened by</span>
                  <span className="text-white">{detail.opened_by_name}</span>
                </div>
              )}
            </div>

            {/* Orders */}
            <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2A2520] flex items-baseline justify-between">
                <p className="text-[13px] font-bold text-white">Orders ({detail.orders.length})</p>
                <p className="text-[11px] text-[#9C9485]">Live · 8s</p>
              </div>
              {detail.orders.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px] text-[#9C9485]">
                  No orders yet for this session.
                </div>
              ) : (
                detail.orders.map((order) => (
                  <div key={order.id} className="px-4 py-3 border-b border-[#2A2520] last:border-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[12px] text-[#9C9485]">
                        {new Date(order.created_at).toLocaleTimeString("en-KE", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Africa/Nairobi",
                        })}
                        <span className="ml-2 uppercase tracking-wide font-bold">{order.source}</span>
                        {order.waiter_name ? <span className="ml-2 text-[#9C9485]">· {order.waiter_name}</span> : null}
                      </p>
                      <p className="text-[13px] font-bold text-white">{formatKes(order.total_kes)}</p>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {order.items.map((it) => (
                        <li key={it.id} className="text-[12px] text-[#F4F1EC]">
                          <span className="text-[#9C9485]">{it.quantity}×</span> {it.name}
                          {it.selected_options?.length ? (
                            <span className="text-[#9C9485]">
                              {" — "}
                              {it.selected_options.map((o) => o.choice).join(", ")}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
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
                onClick={() => transition("pay-mpesa")}
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
          </div>
        )}
      </main>

      <PosTabBar slug={slug} menuId={menuId} />
      {/* tableId reserved for future per-table waiter ordering UI in Prompt 15 */}
      {tableId === "" && null}
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
