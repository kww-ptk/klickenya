"use client";

import { useEffect, useMemo, useState } from "react";
import { applyBillTotals, formatKes } from "@/lib/pos/bill";
import { posFetch } from "./_shell/posFetch";
import { ManagerOverridePrompt } from "./ManagerOverridePrompt";

/**
 * Bill management panel: discount controls, split stepper, totals preview,
 * share/print/email/download buttons. Lives between "Previous orders" and
 * the payment buttons in PosSessionDetail.
 *
 * Live preview: as the waiter types a discount, we run applyBillTotals()
 * client-side against the cached subtotal so the totals update without a
 * round-trip. The blur-save persists to the server, which re-runs computeBill
 * and writes the canonical cached totals.
 *
 * Read-only state: when the session is paid/void, all inputs are disabled
 * and only the share buttons (print, WhatsApp, email, PDF download) remain
 * active.
 */

export interface BillPanelSession {
  id:                  string;
  status:              "open" | "billed" | "paid" | "void";
  subtotal_kes:        number;
  service_charge_pct:  number;
  discount_pct:        number;
  discount_amount_kes: number;
  split_count:         number;
  bill_notes:          string | null;
  table_number:        string;
  payment_method:      string | null;
  mpesa_ref:           string | null;
  receipt_sent_to:     string | null;
  /** Discount % above this requires a manager override. Default 10. */
  manager_discount_threshold_pct: number;
}

interface Props {
  session:        BillPanelSession;
  initialEmail:   string | null;   // pre-fill from a linked reservation, if any
  showToast:      (msg: string, type?: "success" | "error") => void;
  onSaved:        () => void;
}

export function PosBillPanel({ session, initialEmail, showToast, onSaved }: Props) {
  const readOnly = session.status === "paid" || session.status === "void";

  const [discountPct,   setDiscountPct]   = useState(String(session.discount_pct ?? 0));
  const [discountFlat,  setDiscountFlat]  = useState(String(session.discount_amount_kes ?? 0));
  const [billNotes,     setBillNotes]     = useState(session.bill_notes ?? "");
  const [splitCount,    setSplitCount]    = useState(session.split_count ?? 1);
  const [email,         setEmail]         = useState(initialEmail ?? session.receipt_sent_to ?? "");
  const [savingField,   setSavingField]   = useState<string | null>(null);
  const [emailing,      setEmailing]      = useState(false);

  // Re-sync local state if the server pushes a new value (realtime / refresh).
  useEffect(() => { setDiscountPct(String(session.discount_pct ?? 0)); },     [session.discount_pct]);
  useEffect(() => { setDiscountFlat(String(session.discount_amount_kes ?? 0)); }, [session.discount_amount_kes]);
  useEffect(() => { setBillNotes(session.bill_notes ?? ""); },                  [session.bill_notes]);
  useEffect(() => { setSplitCount(session.split_count ?? 1); },                 [session.split_count]);

  // Live totals preview using the same arithmetic as the server.
  const preview = useMemo(() => applyBillTotals({
    subtotal:            session.subtotal_kes,
    service_charge_pct:  session.service_charge_pct,
    discount_pct:        Number(discountPct) || 0,
    discount_amount_kes: Number(discountFlat) || 0,
    split_count:         splitCount,
  }), [session.subtotal_kes, session.service_charge_pct, discountPct, discountFlat, splitCount]);

  /* ── Manager-override modal state ─────────────────────────────────────────
   * When the server rejects an action with `requires_manager: true`, we
   * stash the original PATCH body here and show the modal. On confirm we
   * re-issue the same PATCH with manager_override_pin + reason attached.
   */
  const [pendingOverride, setPendingOverride] = useState<{
    field:   string;
    body:    Record<string, unknown>;
    title:   string;
    message: string;
    reasonRequired: boolean;
  } | null>(null);

  async function patchSession(
    field: string,
    body: Record<string, unknown>,
    opts?: { override?: { title: string; message: string; reasonRequired: boolean } },
  ): Promise<boolean> {
    setSavingField(field);
    try {
      const res = await posFetch(`/api/menu/sessions/${session.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Server says this needs a manager — open the override modal so the
        // waiter can grab a manager (or the manager themselves taps in).
        if (res.status === 403 && data.requires_manager && opts?.override) {
          setPendingOverride({
            field,
            body,
            title:   opts.override.title,
            message: opts.override.message,
            reasonRequired: opts.override.reasonRequired,
          });
          return false;
        }
        showToast(data.error || "Failed to save", "error");
        // Revert local value to the server value on failure.
        onSaved();
        return false;
      }
      onSaved();
      return true;
    } finally {
      setSavingField(null);
    }
  }

  const confirmOverride = async ({ pin, reason }: { pin: string; reason: string | null }) => {
    if (!pendingOverride) return;
    const { field, body } = pendingOverride;
    setPendingOverride(null);
    const ok = await patchSession(field, {
      ...body,
      manager_override_pin: pin,
      reason,
    });
    if (ok) showToast("Manager override applied");
  };

  const saveDiscountPct = () => {
    const v = Number(discountPct) || 0;
    if (v === Number(session.discount_pct ?? 0)) return;
    const threshold = session.manager_discount_threshold_pct;
    patchSession(
      "discount_pct",
      { discount_pct: v },
      v > threshold
        ? {
            override: {
              title:   `Discount above ${threshold}%`,
              message: `Discounts above ${threshold}% require a manager.`,
              reasonRequired: false,
            },
          }
        : undefined,
    );
  };
  const saveDiscountFlat = () => {
    const v = Number(discountFlat) || 0;
    if (v === Number(session.discount_amount_kes ?? 0)) return;
    patchSession("discount_flat", { discount_amount_kes: v });
  };
  const saveBillNotes = () => {
    if (billNotes === (session.bill_notes ?? "")) return;
    patchSession("bill_notes", { bill_notes: billNotes });
  };
  const adjustSplit = (next: number) => {
    const clamped = Math.max(1, Math.min(20, next));
    setSplitCount(clamped);
    if (clamped !== Number(session.split_count ?? 1)) {
      patchSession("split_count", { split_count: clamped });
    }
  };

  /* ── Share actions ──────────────────────────────────────────────────── */

  const printBill = () => {
    window.open(`/receipt/${session.id}`, "_blank", "noopener");
  };

  const whatsappShare = async () => {
    // Pull the canonical text from the server's receipt JSON so the WhatsApp
    // text matches the PDF byte-for-byte.
    try {
      const res = await posFetch(`/api/menu/sessions/${session.id}/receipt`);
      if (!res.ok) {
        showToast("Could not load bill", "error");
        return;
      }
      const data = await res.json();
      const text = buildLocalWhatsappText(data);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    } catch {
      showToast("Could not open WhatsApp", "error");
    }
  };

  const downloadPdf = () => {
    window.open(`/api/menu/sessions/${session.id}/receipt.pdf`, "_blank", "noopener");
  };

  const sendEmail = async () => {
    if (!email.trim()) {
      showToast("Enter a guest email first", "error");
      return;
    }
    setEmailing(true);
    try {
      const res = await posFetch(`/api/menu/sessions/${session.id}/receipt/send`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Email failed to send", "error");
        return;
      }
      if (data.ok === false) {
        showToast(data.error || "Email failed to send", "error");
        return;
      }
      showToast(`Bill emailed to ${email.trim()}`);
      onSaved();
    } catch {
      showToast("Email failed to send", "error");
    } finally {
      setEmailing(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="rounded-2xl border border-[#2A2520] bg-[#1A170F] p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-bold text-white">Bill</p>
        {readOnly ? (
          <p className="text-[10px] uppercase tracking-wide text-text3">Read-only</p>
        ) : null}
      </div>

      {/* Discount controls */}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[11px] text-text3 mb-1">Discount %</span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={1}
              value={discountPct}
              disabled={readOnly}
              onChange={(e) => setDiscountPct(e.target.value)}
              onBlur={saveDiscountPct}
              className="w-full h-10 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[13px] px-3 pr-8 disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-text3">%</span>
          </div>
        </label>
        <label className="block">
          <span className="block text-[11px] text-text3 mb-1">Flat discount</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-text3">KES</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={50}
              value={discountFlat}
              disabled={readOnly}
              onChange={(e) => setDiscountFlat(e.target.value)}
              onBlur={saveDiscountFlat}
              className="w-full h-10 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[13px] pl-12 pr-3 disabled:opacity-50"
            />
          </div>
        </label>
      </div>

      {/* Bill notes */}
      <label className="block">
        <span className="block text-[11px] text-text3 mb-1">Bill notes</span>
        <input
          type="text"
          maxLength={500}
          value={billNotes}
          disabled={readOnly}
          placeholder="Birthday dinner, VIP, etc."
          onChange={(e) => setBillNotes(e.target.value)}
          onBlur={saveBillNotes}
          className="w-full h-10 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[13px] px-3 disabled:opacity-50"
        />
      </label>

      {/* Split */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-text3">Split between</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={readOnly || splitCount <= 1}
            onClick={() => adjustSplit(splitCount - 1)}
            className="w-9 h-9 rounded-full bg-[#252019] text-surface text-[18px] font-bold disabled:opacity-30"
            aria-label="Decrease split"
          >−</button>
          <span className="min-w-[2ch] text-center text-[14px] font-bold text-white">{splitCount}</span>
          <button
            type="button"
            disabled={readOnly || splitCount >= 20}
            onClick={() => adjustSplit(splitCount + 1)}
            className="w-9 h-9 rounded-full bg-[#252019] text-surface text-[18px] font-bold disabled:opacity-30"
            aria-label="Increase split"
          >+</button>
          <span className="text-[12px] text-text3">guests</span>
        </div>
      </div>

      {/* Live totals preview */}
      <div className="rounded-xl border border-[#2A2520] bg-[#0F0D08] p-3 space-y-1.5 font-mono text-[12px]">
        <Line label="Subtotal" value={formatKes(preview.subtotal)} />
        {preview.discount_pct_amount > 0 && (
          <Line label={`Discount (${preview.discount_pct}%)`} value={`-${formatKes(preview.discount_pct_amount)}`} muted />
        )}
        {preview.discount_flat_amount > 0 && (
          <Line label="Flat discount" value={`-${formatKes(preview.discount_flat_amount)}`} muted />
        )}
        {preview.total_discount > 0 && (
          <Line label="After discount" value={formatKes(preview.after_discount)} muted />
        )}
        {preview.service_charge_amount > 0 && (
          <Line label={`Service (${preview.service_charge_pct}%)`} value={formatKes(preview.service_charge_amount)} muted />
        )}
        <div className="h-px bg-[#2A2520] my-1" />
        <Line label="Grand total" value={formatKes(preview.grand_total)} highlight />
        {preview.split_count > 1 && (
          <Line label={`Per person (×${preview.split_count})`} value={formatKes(preview.per_person)} highlight={false} accent />
        )}
      </div>

      {savingField && (
        <p className="text-[10px] text-text3">Saving…</p>
      )}

      {/* Share + print actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={printBill}
          className="h-10 rounded-full bg-[#252019] text-surface text-[12px] font-bold border border-[#3A342B]"
        >
          Print bill
        </button>
        <button
          type="button"
          onClick={whatsappShare}
          className="h-10 rounded-full bg-[#252019] text-surface text-[12px] font-bold border border-[#3A342B]"
        >
          Send via WhatsApp
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          className="h-10 rounded-full bg-[#252019] text-surface text-[12px] font-bold border border-[#3A342B] col-span-2"
        >
          Download PDF
        </button>
      </div>

      {/* Email share */}
      <div className="space-y-2">
        <span className="block text-[11px] text-text3">Email bill to guest</span>
        <div className="flex gap-2">
          <input
            type="email"
            inputMode="email"
            placeholder="guest@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-10 rounded-lg bg-[#252019] border border-[#2A2520] text-white text-[13px] px-3"
          />
          <button
            type="button"
            disabled={emailing || !email.trim()}
            onClick={sendEmail}
            className="h-10 px-4 rounded-full bg-[#5BA1FF] text-[#0F0D08] text-[12px] font-bold disabled:opacity-40"
          >
            {emailing ? "Sending…" : "Send"}
          </button>
        </div>
        {session.receipt_sent_to && (
          <p className="text-[10px] text-text3">Last sent to {session.receipt_sent_to}</p>
        )}
      </div>

      {pendingOverride && (
        <ManagerOverridePrompt
          title={pendingOverride.title}
          message={pendingOverride.message}
          reasonRequired={pendingOverride.reasonRequired}
          onCancel={() => setPendingOverride(null)}
          onConfirm={confirmOverride}
        />
      )}
    </div>
  );
}

function Line({
  label, value, highlight, muted, accent,
}: {
  label: string; value: string; highlight?: boolean; muted?: boolean; accent?: boolean;
}) {
  const colour =
    highlight ? "text-white font-bold" :
    accent    ? "text-amber font-bold" :
    muted     ? "text-text3" :
                "text-surface";
  return (
    <div className={`flex items-baseline justify-between ${colour}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * Build the WhatsApp text body from the receipt JSON. We mirror the
 * server-side buildBillText() output so the message matches the PDF / email.
 */
interface ReceiptJson {
  restaurant:     { name: string; phone?: string | null; address?: string | null };
  table_number:   string;
  opened_at:      string;
  payment_method: string | null;
  mpesa_ref:      string | null;
  bill: {
    line_items:           { name: string; options_text?: string; quantity: number; line_total: number }[];
    subtotal:             number;
    discount_pct:         number;
    discount_pct_amount:  number;
    discount_flat_amount: number;
    service_charge_pct:   number;
    service_charge_amount: number;
    grand_total:          number;
    per_person:           number;
    split_count:          number;
  };
}

function buildLocalWhatsappText(data: ReceiptJson): string {
  const lines: string[] = [];
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi",
  }).format(new Date(data.opened_at));
  const fmt = (n: number) => `KES ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(Math.round(n))}`;

  lines.push(`🧾 Bill from ${data.restaurant.name}`);
  lines.push(`Table ${data.table_number} · ${date}`);
  lines.push("");
  for (const li of data.bill.line_items) {
    const opts = li.options_text ? ` (${li.options_text})` : "";
    lines.push(`${li.name}${opts} ×${li.quantity} — ${fmt(li.line_total)}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${fmt(data.bill.subtotal)}`);
  if (data.bill.discount_pct_amount > 0) lines.push(`Discount (${data.bill.discount_pct}%): -${fmt(data.bill.discount_pct_amount)}`);
  if (data.bill.discount_flat_amount > 0) lines.push(`Flat discount: -${fmt(data.bill.discount_flat_amount)}`);
  if (data.bill.service_charge_amount > 0) lines.push(`Service (${data.bill.service_charge_pct}%): ${fmt(data.bill.service_charge_amount)}`);
  lines.push("━━━━━━━━━━━━━━━━━━━");
  lines.push(`Total: ${fmt(data.bill.grand_total)}`);
  if (data.bill.split_count > 1) lines.push(`Per person (×${data.bill.split_count}): ${fmt(data.bill.per_person)}`);
  if (data.payment_method) {
    const label = data.payment_method === "mpesa" ? "M-Pesa" : data.payment_method === "card" ? "Card" : "Cash";
    const ref = data.mpesa_ref ? ` (ref: ${data.mpesa_ref})` : "";
    lines.push("");
    lines.push(`Paid by: ${label}${ref}`);
  }
  lines.push("");
  lines.push("Thank you! 🙏");
  return lines.join("\n");
}
