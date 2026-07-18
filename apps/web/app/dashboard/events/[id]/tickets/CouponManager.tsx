// apps/web/app/dashboard/events/[id]/tickets/CouponManager.tsx
"use client";
import { useState } from "react";

type Coupon = {
  id: string; code: string; discount_type: "percent" | "fixed"; discount_value: number;
  max_redemptions: number | null; redeemed: number; expires_at: string | null;
  one_per_customer: boolean; uses?: number; discount_given?: number;
};

export default function CouponManager({ eventId, initial }: { eventId: string; initial: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initial);
  const [form, setForm] = useState({ code: "", discount_type: "percent" as "percent" | "fixed", discount_value: 10, max_redemptions: "", expires_at: "", one_per_customer: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/coupons`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          max_redemptions: form.max_redemptions ? Number(form.max_redemptions) : null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          one_per_customer: form.one_per_customer,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Could not create"); return; }
      setCoupons((c) => [{ ...json, uses: 0, discount_given: 0 }, ...c]);
      setForm({ ...form, code: "", discount_value: 10, max_redemptions: "", expires_at: "" });
    } finally { setBusy(false); }
  }

  async function deactivate(couponId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/events/${eventId}/coupons`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponId }),
      });
      if (res.ok) setCoupons((c) => c.filter((x) => x.id !== couponId));
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <h2 className="font-bold">Coupons</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CODE"
          className="w-32 rounded border border-neutral-300 px-2 py-2 text-[16px] font-mono uppercase" />
        <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
          className="rounded border border-neutral-300 px-2 py-2 text-[16px]">
          <option value="percent">% off</option>
          <option value="fixed">KSh off</option>
        </select>
        <input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
          className="w-24 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
        <input type="number" min={1} value={form.max_redemptions} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value })} placeholder="Max uses"
          className="w-28 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
        <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
          className="rounded border border-neutral-300 px-2 py-2 text-[16px]" />
        <label className="flex items-center gap-1 text-sm text-neutral-600">
          <input type="checkbox" checked={form.one_per_customer} onChange={(e) => setForm({ ...form, one_per_customer: e.target.checked })} />
          1/customer
        </label>
        <button onClick={create} disabled={busy || !form.code.trim()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Create</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 divide-y divide-neutral-100">
        {coupons.length === 0 && <p className="py-2 text-sm text-neutral-500">No active coupons.</p>}
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              <span className="font-mono font-semibold">{c.code}</span>{" "}
              <span className="text-neutral-500">
                {c.discount_type === "percent" ? `${c.discount_value}% off` : `KSh ${c.discount_value} off`}
                {" · "}{c.uses ?? c.redeemed} used{c.max_redemptions ? `/${c.max_redemptions}` : ""}
                {c.discount_given != null ? ` · KSh ${c.discount_given.toLocaleString("en-KE")} given` : ""}
                {c.expires_at ? ` · exp ${new Date(c.expires_at).toLocaleDateString("en-KE")}` : ""}
              </span>
            </span>
            <button onClick={() => deactivate(c.id)} disabled={busy} className="text-red-600 hover:underline disabled:opacity-50">Deactivate</button>
          </div>
        ))}
      </div>
    </section>
  );
}
