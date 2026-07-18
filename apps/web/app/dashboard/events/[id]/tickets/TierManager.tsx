// apps/web/app/dashboard/events/[id]/tickets/TierManager.tsx
"use client";
import { useState } from "react";

type Tier = { _key?: string; name: string; price: number; description?: string; available?: number; isSoldOut?: boolean; sold?: number };

export default function TierManager({ eventId, initialTiers }: { eventId: string; initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers.length ? initialTiers : []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, patch: Partial<Tier>) {
    setTiers((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function addTier() { setTiers((t) => [...t, { name: "", price: 0 }]); }
  function removeTier(i: number) { setTiers((t) => t.filter((_, j) => j !== i)); }

  async function save() {
    setBusy(true); setError(null); setMsg(null);
    try {
      const payload = {
        tiers: tiers.map((t) => ({
          _key: t._key, name: t.name.trim(), price: Number(t.price),
          description: t.description?.trim() || undefined,
          available: t.available === undefined || (t.available as unknown as string) === "" ? undefined : Number(t.available),
          isSoldOut: !!t.isSoldOut,
        })),
      };
      const res = await fetch(`/api/dashboard/events/${eventId}/tiers`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Could not save"); return; }
      setMsg("Saved. Public page updates within a minute.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-5">
      <h2 className="font-bold">Ticket tiers</h2>
      <p className="text-sm text-neutral-500">Edit prices and availability. Lowering availability below sold just stops further sales.</p>
      <div className="mt-4 space-y-3">
        {tiers.map((t, i) => (
          <div key={t._key ?? `new-${i}`} className="rounded-lg border border-neutral-100 p-3">
            <div className="flex flex-wrap gap-2">
              <input value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Tier name"
                className="min-w-[8rem] flex-1 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
              <input type="number" min={0} value={t.price} onChange={(e) => update(i, { price: Number(e.target.value) })} placeholder="Price KES"
                className="w-28 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
              <input type="number" min={0} value={t.available ?? ""} onChange={(e) => update(i, { available: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="Cap (blank = ∞)"
                className="w-32 rounded border border-neutral-300 px-2 py-2 text-[16px]" />
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-neutral-600">
                <input type="checkbox" checked={!!t.isSoldOut} onChange={(e) => update(i, { isSoldOut: e.target.checked })} />
                Sold out
              </label>
              <span className="text-neutral-400">{t.sold != null ? `${t.sold} sold` : ""}</span>
              <button onClick={() => removeTier(i)} className="text-red-600 hover:underline">Remove</button>
            </div>
          </div>
        ))}
        {tiers.length === 0 && <p className="text-sm text-neutral-500">No tiers yet — add one (or this is a free event).</p>}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={addTier} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold">+ Add tier</button>
        <button onClick={save} disabled={busy} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save tiers"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-green-600">{msg}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
