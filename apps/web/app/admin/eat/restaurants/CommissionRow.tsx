"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bpsToPercent } from "@/lib/orders/money";

/**
 * Commission rates for one restaurant, edited in percent and stored in basis
 * points — nobody negotiates in basis points, and nobody should have to
 * convert in their head at the point of typing a number.
 *
 * Only an admin sees this. A restaurant setting its own commission is not a
 * feature.
 */
export function CommissionRow({
  menuId,
  deliveryBps,
  pickupBps,
  deliveryFeeKes,
}: {
  menuId: string;
  deliveryBps: number;
  pickupBps: number;
  deliveryFeeKes: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [delivery, setDelivery] = useState(String(deliveryBps / 100));
  const [pickup, setPickup] = useState(String(pickupBps / 100));
  const [fee, setFee] = useState(String(deliveryFeeKes ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eat/commission", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: menuId,
          // Percent in, basis points out. Rounded so 7.5% is 750, not 749.99.
          commission_delivery_bps: Math.round(Number(delivery) * 100),
          commission_pickup_bps: Math.round(Number(pickup) * 100),
          delivery_fee_kes: Number(fee),
        }),
      });
      const p = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(p?.error ?? "Could not save.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-left group"
      >
        <span className="block text-[13px] text-zinc-900">
          {bpsToPercent(deliveryBps)} delivery · {bpsToPercent(pickupBps)} pickup
        </span>
        <span className="block text-[12px] text-zinc-500">
          {deliveryFeeKes > 0 ? `KSh ${deliveryFeeKes} delivery fee` : "no delivery fee"}
          <span className="ml-1.5 underline group-hover:text-zinc-900">edit</span>
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-2 min-w-[230px]">
      <div className="grid grid-cols-3 gap-1.5">
        <label className="text-[11px] font-semibold text-zinc-500">
          Delivery %
          <input
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            inputMode="decimal"
            className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-[16px] text-zinc-900"
          />
        </label>
        <label className="text-[11px] font-semibold text-zinc-500">
          Pickup %
          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            inputMode="decimal"
            className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-[16px] text-zinc-900"
          />
        </label>
        <label className="text-[11px] font-semibold text-zinc-500">
          Fee KSh
          <input
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            inputMode="numeric"
            className="mt-0.5 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-[16px] text-zinc-900"
          />
        </label>
      </div>
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <p className="text-[11.5px] text-zinc-500">
        Applies to new orders only — existing ones keep the rate they were placed under.
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-full border border-zinc-200 px-4 py-1.5 text-[12.5px] font-bold text-zinc-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
