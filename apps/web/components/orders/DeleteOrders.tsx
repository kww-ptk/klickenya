"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { DELETE_CONFIRM_PHRASE } from "@/lib/orders/deletion";

/**
 * Delete one order, or clear a restaurant's orders.
 *
 * The phrase has to be typed in full — no pre-fill, no paste helper, no
 * "click to confirm". The point is a deliberate act, and anything that makes
 * it faster makes it worse. The server checks it again regardless.
 *
 * The warning is specific rather than generic. "Are you sure?" tells an
 * operator nothing; "stock already deducted is not put back" tells them what
 * they cannot undo.
 */
export function DeleteOrders({
  menuId,
  orderId,
  mode,
  count,
  onDone,
  className = "",
}: {
  menuId: string;
  /** Required for mode="one". */
  orderId?: string;
  mode: "one" | "all";
  /** For mode="all": how many are about to go. */
  count?: number;
  onDone?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/menu/orders/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          ...(mode === "all" ? { all: true } : { order_id: orderId }),
          confirm: phrase,
        }),
      });
      const p = (await res.json().catch(() => null)) as
        | { error?: string; deleted?: number; capped?: boolean }
        | null;
      if (!res.ok) {
        setError(p?.error ?? "Could not delete that.");
        return;
      }
      if (p?.capped) {
        setError(
          `Deleted ${p.deleted}. There were more than the per-request limit — run it again to clear the rest.`,
        );
        setPhrase("");
        router.refresh();
        onDone?.();
        return;
      }
      setOpen(false);
      setPhrase("");
      router.refresh();
      onDone?.();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          (mode === "all"
            ? "inline-flex items-center gap-1.5 rounded-full border border-[#DC2626]/40 px-4 py-2 text-[13px] font-bold text-[#DC2626] hover:bg-[#DC2626]/5"
            : "rounded-full p-2 text-[#9C9485] hover:text-[#DC2626] hover:bg-[#DC2626]/10")
        }
        aria-label={mode === "all" ? "Delete all orders" : "Delete this order"}
      >
        <Trash2 className="size-4" aria-hidden />
        {mode === "all" && "Delete all orders"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#DC2626]/40 bg-[#DC2626]/[0.04] p-4 space-y-3">
      <p className="flex items-start gap-2 text-[13.5px] font-bold text-[#DC2626]">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden />
        {mode === "all"
          ? `Permanently delete ${count ?? "all"} order${count === 1 ? "" : "s"}?`
          : "Permanently delete this order?"}
      </p>

      <ul className="text-[12.5px] text-[#6B6355] space-y-1 list-disc pl-5">
        <li>The revenue, the rider&apos;s cash record and the history go with it.</li>
        <li>Stock already deducted when cooking started is <strong>not</strong> put back.</li>
        <li>This cannot be undone.</li>
      </ul>

      <div>
        <label
          htmlFor={`confirm-${orderId ?? "all"}`}
          className="block text-[12.5px] font-semibold text-[#16130C] mb-1"
        >
          Type <span className="font-mono font-bold">{DELETE_CONFIRM_PHRASE}</span> to confirm
        </label>
        <input
          id={`confirm-${orderId ?? "all"}`}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-[#E2DDD5] bg-white px-4 py-2.5 text-[16px] font-mono"
        />
      </div>

      {error && <p className="text-[12.5px] font-medium text-[#DC2626]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy || phrase !== DELETE_CONFIRM_PHRASE}
          className="flex-1 rounded-full bg-[#DC2626] py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPhrase("");
            setError(null);
          }}
          className="flex-1 rounded-full border border-[#E2DDD5] bg-white py-2.5 text-[13.5px] font-bold text-[#16130C]"
        >
          Keep them
        </button>
      </div>
    </div>
  );
}
