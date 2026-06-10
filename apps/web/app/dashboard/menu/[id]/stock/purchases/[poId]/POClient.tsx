"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Types ───────────────────────────────────────────── */

export interface POLineFull {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  ingredient_unit: string;
  /** Current ingredient.cost_per_unit at page load. Used to detect price drift. */
  current_cost_per_unit: number;
  qty: number;
  unit_cost: number;
  total_cost: number;
  qty_received: number;
}

export interface POHeader {
  id: string;
  po_number: string | null;
  status: "draft" | "sent" | "partial" | "received" | "cancelled";
  expected_at: string | null;
  ordered_at: string | null;
  received_at: string | null;
  total_kes: number;
  received_total_kes: number;
  notes: string | null;
  created_at: string;
  supplier: { id: string; name: string; phone: string | null; email: string | null } | null;
}

/* ── Formatters ──────────────────────────────────────── */

function fmtKES(n: number): string {
  return `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_PILL: Record<POHeader["status"], string> = {
  draft: "bg-surface text-text2",
  sent: "bg-sky-100 text-sky-800",
  partial: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const inputCls =
  "w-full border border-border rounded-xl px-3 py-3 text-[15px] text-dark placeholder:text-text3 focus:outline-none focus:border-amber focus:ring-1 focus:ring-amber/30 bg-white";

/* ── WhatsApp helpers ────────────────────────────────── */

function waLink(phone: string | null, text: string): string | null {
  if (!phone) return null;
  // Strip non-digits; assume Kenyan numbers default to +254 if 9 digits starting 7.
  let n = phone.replace(/[^0-9]/g, "");
  if (n.startsWith("0") && n.length === 10) n = "254" + n.slice(1);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

function buildOrderText(header: POHeader, lines: POLineFull[]): string {
  const supplierName = header.supplier?.name ?? "Supplier";
  const head = `Hi ${supplierName} — order ${header.po_number ?? ""}:`;
  const body = lines
    .map((l) => `• ${l.ingredient_name}: ${l.qty} ${l.ingredient_unit} @ ${fmtKES(l.unit_cost)}`)
    .join("\n");
  const footer = `Total: ${fmtKES(header.total_kes)}${
    header.expected_at ? `\nDue: ${fmtDate(header.expected_at)}` : ""
  }`;
  return [head, body, footer].join("\n");
}

/* ── Component ───────────────────────────────────────── */

export function POClient({
  menuId,
  header,
  lines,
}: {
  menuId: string;
  header: POHeader;
  lines: POLineFull[];
}) {
  const router = useRouter();
  const [showReceive, setShowReceive] = useState(false);

  const canReceive = header.status === "sent" || header.status === "partial" || header.status === "draft";
  const orderText = useMemo(() => buildOrderText(header, lines), [header, lines]);
  const wa = waLink(header.supplier?.phone ?? null, orderText);

  async function cancel() {
    if (!confirm("Cancel this purchase order? Stock movements already recorded are not reversed.")) return;
    const res = await fetch(`/api/stock/purchase-orders/${header.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) {
      alert((await res.json().catch(() => ({}))).error ?? "Failed to cancel");
      return;
    }
    router.refresh();
  }

  async function send() {
    const res = await fetch(`/api/stock/purchase-orders/${header.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    if (!res.ok) {
      alert((await res.json().catch(() => ({}))).error ?? "Failed to send");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
            {header.po_number ?? "—"}
          </h1>
          <span
            className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide ${STATUS_PILL[header.status]}`}
          >
            {header.status}
          </span>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-[13px]">
          <Stat label="Supplier" value={header.supplier?.name ?? "—"} />
          <Stat label="Expected" value={fmtDate(header.expected_at)} />
          <Stat label="Ordered" value={fmtDate(header.ordered_at)} />
          <Stat label="Received" value={fmtDate(header.received_at)} />
        </dl>
        {header.notes && (
          <p className="text-[13px] text-text2 mt-3 p-3 rounded-xl bg-canvas">{header.notes}</p>
        )}
      </div>

      {/* Lines */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-surface flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-dark">Items</h2>
        </div>
        <ul className="divide-y divide-surface">
          {lines.map((l) => {
            const fullyReceived = l.qty_received >= l.qty;
            return (
              <li key={l.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[14px] font-semibold text-dark">{l.ingredient_name}</p>
                  <p className="text-[12px] text-text3">
                    {l.qty} {l.ingredient_unit} · {fmtKES(l.unit_cost)} / {l.ingredient_unit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-bold text-dark">{fmtKES(l.total_cost)}</p>
                  {l.qty_received > 0 && (
                    <p
                      className={`text-[11px] font-bold ${fullyReceived ? "text-emerald-700" : "text-amber-700"}`}
                    >
                      Received {l.qty_received} / {l.qty}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="p-4 border-t border-surface bg-canvas space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-text2">Expected total</span>
            <span className="text-[14px] font-semibold text-dark">{fmtKES(header.total_kes)}</span>
          </div>
          {header.received_total_kes > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-text2">Received total</span>
              <span className="text-[14px] font-bold text-dark">{fmtKES(header.received_total_kes)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {canReceive && (
          <button
            type="button"
            onClick={() => setShowReceive(true)}
            className="bg-amber text-dark font-bold text-[15px] h-[56px] rounded-full hover:bg-[#d4911c] shadow-sm sm:col-span-2"
          >
            Mark received
          </button>
        )}
        {header.status === "draft" && (
          <button
            type="button"
            onClick={send}
            className="bg-dark text-white font-bold text-[14px] h-[48px] rounded-full hover:bg-[#2A2520]"
          >
            Send to supplier
          </button>
        )}
        {wa && (header.status === "draft" || header.status === "sent") && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366]/10 border border-[#25D366]/40 text-[#0a6b3a] font-bold text-[14px] h-[48px] rounded-full hover:bg-[#25D366]/20 flex items-center justify-center"
          >
            Send via WhatsApp
          </a>
        )}
        {header.status !== "received" && header.status !== "cancelled" && (
          <button
            type="button"
            onClick={cancel}
            className="bg-white border border-border text-text2 font-bold text-[14px] h-[48px] rounded-full hover:border-[#DC2626] hover:text-[#DC2626]"
          >
            Cancel PO
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(`/dashboard/menu/${menuId}/stock/purchases`)}
          className="bg-white border border-border text-text2 font-bold text-[14px] h-[48px] rounded-full hover:border-text3"
        >
          Done
        </button>
      </div>

      {showReceive && (
        <ReceiveModal
          header={header}
          lines={lines}
          onClose={() => setShowReceive(false)}
          onDone={() => {
            setShowReceive(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold text-text3 uppercase tracking-wide">{label}</dt>
      <dd className="text-[14px] font-semibold text-dark mt-0.5">{value}</dd>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/* ── Receive flow ─────────────────────────────────────── */
/* ─────────────────────────────────────────────────────── */
//
// Two-step UX:
//   Step 1 — owner enters qty_received per line (pre-filled from qty)
//   Step 2 — IF any line's unit_cost differs from the ingredient's current
//            cost_per_unit, show the price-change confirmation. Owner picks
//            which prices to roll forward.
//
// Submission posts to /api/stock/purchase-orders/[id]/receive with
//   { lines: [{po_item_id, qty_received}], update_costs: boolean }
//
// `update_costs` is the simple "yes / no" the RPC understands. The detailed
// per-ingredient picker we show in step 2 is for the owner's benefit — once
// they confirm, we send a single boolean. (V0.1 keeps it simple; per-line
// price control is V0.2.)

interface ReceiveLineDraft {
  po_item_id: string;
  ingredient_name: string;
  ingredient_unit: string;
  qty_ordered: number;
  qty_received: string; // string so the input can be cleared
  unit_cost: number;
  current_cost_per_unit: number;
}

function ReceiveModal({
  header,
  lines,
  onClose,
  onDone,
}: {
  header: POHeader;
  lines: POLineFull[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [drafts, setDrafts] = useState<ReceiveLineDraft[]>(() =>
    lines.map((l) => ({
      po_item_id: l.id,
      ingredient_name: l.ingredient_name,
      ingredient_unit: l.ingredient_unit,
      qty_ordered: l.qty,
      // Pre-fill with what's outstanding (qty - already received). On a
      // first receive that's the full qty; on a partial top-up it's the
      // remainder.
      qty_received: String(Math.max(0, l.qty - l.qty_received)),
      unit_cost: l.unit_cost,
      current_cost_per_unit: l.current_cost_per_unit,
    })),
  );
  const [step, setStep] = useState<"qty" | "price" | "submit">("qty");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function update(idx: number, patch: Partial<ReceiveLineDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }

  // Lines we'll actually submit (qty_received > 0). Used to compute price
  // diffs and for the API call. Returning 0 for a line keeps it untouched.
  const nonZeroDrafts = useMemo(
    () => drafts.filter((d) => Number(d.qty_received) > 0),
    [drafts],
  );

  // Only consider price changes for lines we're actually receiving — no
  // point asking about prices on lines the owner is skipping.
  const priceChanges = useMemo(() => {
    return nonZeroDrafts
      .filter((d) => {
        const same = Math.abs(d.unit_cost - d.current_cost_per_unit) < 0.005;
        return !same && d.unit_cost > 0; // ignore unset costs
      })
      .map((d) => ({
        po_item_id: d.po_item_id,
        ingredient_name: d.ingredient_name,
        ingredient_unit: d.ingredient_unit,
        old_cost: d.current_cost_per_unit,
        new_cost: d.unit_cost,
        delta_pct:
          d.current_cost_per_unit > 0
            ? ((d.unit_cost - d.current_cost_per_unit) / d.current_cost_per_unit) * 100
            : null,
      }));
  }, [nonZeroDrafts]);

  // Owner's choice: "yes, update prices" or "no, keep old prices".
  // Per-ingredient toggling is V0.2.
  const [updateCosts, setUpdateCosts] = useState<boolean>(true);

  async function submit() {
    setErr(null);
    if (nonZeroDrafts.length === 0) {
      setErr("Enter at least one received quantity to record this delivery.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/stock/purchase-orders/${header.id}/receive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: drafts.map((d) => ({
            po_item_id: d.po_item_id,
            // Send the cumulative received qty so the RPC overwrites cleanly.
            // We add what's already received (remainder + already-received).
            qty_received:
              (lines.find((l) => l.id === d.po_item_id)?.qty_received ?? 0) +
              Number(d.qty_received || 0),
          })),
          update_costs: updateCosts && priceChanges.length > 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to receive");
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to receive");
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setErr(null);
    if (nonZeroDrafts.length === 0) {
      setErr("Enter at least one received quantity to record this delivery.");
      return;
    }
    if (priceChanges.length > 0) setStep("price");
    else void submit();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-[640px] sm:rounded-2xl rounded-t-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-surface flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-display text-[18px] font-bold text-dark">
              {step === "qty" ? "Mark received" : "Update prices?"}
            </h2>
            <p className="text-[12px] text-text3">{header.po_number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-11 rounded-full text-text3 hover:bg-surface flex items-center justify-center text-[20px]"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === "qty" ? (
            <ul className="divide-y divide-surface">
              {drafts.map((d, idx) => {
                const remaining = Math.max(0, d.qty_ordered - (lines.find((l) => l.id === d.po_item_id)?.qty_received ?? 0));
                return (
                  <li key={d.po_item_id} className="p-4 grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-12 sm:col-span-6">
                      <p className="text-[14px] font-semibold text-dark">{d.ingredient_name}</p>
                      <p className="text-[12px] text-text3">
                        Ordered {d.qty_ordered} {d.ingredient_unit} · {fmtKES(d.unit_cost)} / {d.ingredient_unit}
                      </p>
                      {remaining < d.qty_ordered && (
                        <p className="text-[11px] text-amber-700 font-bold mt-0.5">
                          {d.qty_ordered - remaining} already received
                        </p>
                      )}
                    </div>
                    <div className="col-span-8 sm:col-span-4">
                      <label className="block text-[11px] font-bold text-text3 uppercase tracking-wide mb-1">
                        Received now
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={d.qty_received}
                        onChange={(e) => update(idx, { qty_received: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2 text-right">
                      <button
                        type="button"
                        onClick={() => update(idx, { qty_received: "0" })}
                        className="h-11 px-3 rounded-full text-[12px] font-bold text-text3 hover:text-dark"
                      >
                        Skip
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <PriceConfirm
              changes={priceChanges}
              update={updateCosts}
              setUpdate={setUpdateCosts}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface bg-canvas sticky bottom-0">
          {err && (
            <div className="mb-2 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-2.5 text-[13px] text-[#DC2626]">
              {err}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            {step === "price" ? (
              <>
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  className="bg-amber text-dark font-bold text-[15px] h-[52px] rounded-full hover:bg-[#d4911c] disabled:opacity-50 flex-1 px-5"
                >
                  {busy ? "Recording…" : updateCosts ? "Update prices & receive" : "Receive without updating"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("qty")}
                  disabled={busy}
                  className="bg-white border border-border text-text2 font-bold text-[14px] h-[52px] rounded-full hover:border-text3 px-5"
                >
                  Back
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={next}
                  disabled={busy}
                  className="bg-amber text-dark font-bold text-[15px] h-[52px] rounded-full hover:bg-[#d4911c] disabled:opacity-50 flex-1 px-5"
                >
                  {priceChanges.length > 0 ? "Continue" : "Receive"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="bg-white border border-border text-text2 font-bold text-[14px] h-[52px] rounded-full hover:border-text3 px-5"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Price-change confirm step ───────────────────────── */

function PriceConfirm({
  changes,
  update,
  setUpdate,
}: {
  changes: Array<{
    po_item_id: string;
    ingredient_name: string;
    ingredient_unit: string;
    old_cost: number;
    new_cost: number;
    delta_pct: number | null;
  }>;
  update: boolean;
  setUpdate: (v: boolean) => void;
}) {
  return (
    <div className="p-4 sm:p-5 space-y-4">
      <p className="text-[13px] text-text2">
        The unit prices on this delivery don&apos;t match the prices stored on{" "}
        {changes.length === 1 ? "this ingredient" : "these ingredients"}. Updating
        will change all <strong>future</strong> recipe cost calculations. Past
        recipes and stock movements are not affected.
      </p>

      <ul className="rounded-2xl border border-border divide-y divide-surface overflow-hidden">
        {changes.map((c) => {
          const isUp = c.new_cost > c.old_cost;
          return (
            <li key={c.po_item_id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-dark truncate">{c.ingredient_name}</p>
                <p className="text-[12px] text-text3">
                  {fmtKES(c.old_cost)} → <span className="font-bold text-dark">{fmtKES(c.new_cost)}</span> / {c.ingredient_unit}
                </p>
              </div>
              {c.delta_pct != null && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isUp ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {c.delta_pct.toFixed(0)}%
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-border bg-white p-1">
        <button
          type="button"
          onClick={() => setUpdate(true)}
          className={`w-full text-left p-3 rounded-xl transition-colors ${update ? "bg-amber/10" : "hover:bg-canvas"}`}
        >
          <p className="text-[14px] font-bold text-dark">
            {update ? "✓ " : ""}Update prices
          </p>
          <p className="text-[12px] text-text3">
            Roll the new prices into the pantry. Recommended if this is your new buying price.
          </p>
        </button>
        <button
          type="button"
          onClick={() => setUpdate(false)}
          className={`w-full text-left p-3 rounded-xl transition-colors ${!update ? "bg-amber/10" : "hover:bg-canvas"}`}
        >
          <p className="text-[14px] font-bold text-dark">
            {!update ? "✓ " : ""}Keep old prices
          </p>
          <p className="text-[12px] text-text3">
            Stock movement is recorded at the PO price, but recipes keep using the old cost.
          </p>
        </button>
      </div>
    </div>
  );
}
