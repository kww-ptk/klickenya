"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, Trash2 } from "lucide-react";

type Rider = { id: string; name: string; phone: string; is_active: boolean };

/**
 * Riders for one restaurant.
 *
 * The PIN is set here and shown once, because the owner is handing it to the
 * person standing in front of them. It is stored hashed and can never be read
 * back — setting it again is the only way to recover it, which is the correct
 * trade for something that releases cash.
 */
export function RidersClient({
  menuId,
  initialRiders,
}: {
  menuId: string;
  initialRiders: Rider[];
}) {
  const router = useRouter();
  const [riders, setRiders] = useState<Rider[]>(initialRiders);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<{ name: string; pin: string } | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/menu/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, name, phone, pin }),
      });
      const p = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(p?.error ?? "Could not add that rider.");
        return;
      }
      setJustAdded({ name: name.trim(), pin });
      setName("");
      setPhone("");
      setPin("");
      router.refresh();
      const list = await fetch(`/api/menu/riders?menu_id=${menuId}`).then((r) => r.json());
      setRiders(list.riders ?? []);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(riderId: string) {
    setBusy(true);
    try {
      await fetch("/api/menu/riders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, rider_id: riderId }),
      });
      setRiders((r) => r.filter((x) => x.id !== riderId));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {justAdded && (
        <div className="rounded-2xl border border-[#16A34A]/40 bg-[#16A34A]/[0.07] p-5">
          <p className="font-display text-[16px] font-bold text-[#16130C]">
            {justAdded.name} can start
          </p>
          <p className="text-[13px] text-[#6B6355] mt-1">
            Give them this PIN now — it is stored scrambled and cannot be shown again.
            If it is lost, add them again with a new one.
          </p>
          <p className="font-mono text-[30px] font-bold tracking-[0.3em] text-[#16130C] mt-3">
            {justAdded.pin}
          </p>
          <p className="text-[12.5px] text-[#6B6355] mt-2">
            They sign in at <span className="font-bold">klickenya.com/rider</span> with their
            phone number and this PIN.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm p-5">
        <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-3">Add a rider</h2>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto]">
          <input
            aria-label="Rider name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="rounded-xl border border-[#E2DDD5] px-4 py-3 text-[16px]"
          />
          <input
            aria-label="Rider phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            inputMode="tel"
            className="rounded-xl border border-[#E2DDD5] px-4 py-3 text-[16px]"
          />
          <input
            aria-label="4-digit PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="PIN"
            inputMode="numeric"
            className="rounded-xl border border-[#E2DDD5] px-4 py-3 text-[16px] tracking-[0.3em]"
          />
          <button
            type="submit"
            disabled={busy || !name.trim() || phone.length < 9 || pin.length !== 4}
            className="rounded-full bg-[#16130C] px-6 py-3 text-[14px] font-bold text-white disabled:opacity-40"
          >
            Add
          </button>
        </form>
        {error && <p className="text-[13px] text-[#DC2626] mt-2">{error}</p>}
      </div>

      {riders.length === 0 ? (
        <div className="rounded-2xl border border-[#E2DDD5] bg-white p-10 text-center">
          <Bike className="size-6 mx-auto text-[#9C9485]" aria-hidden />
          <p className="font-display text-[17px] font-bold text-[#16130C] mt-2">No riders yet</p>
          <p className="text-[13px] text-[#9C9485] mt-1">
            Add one above and they can start taking deliveries.
          </p>
        </div>
      ) : (
        <ul className="bg-white rounded-2xl border border-[#E2DDD5] shadow-sm divide-y divide-[#F4F1EC]">
          {riders.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-bold text-[14.5px] text-[#16130C]">{r.name}</p>
                <p className="text-[13px] text-[#9C9485]">{r.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={busy}
                aria-label={`Remove ${r.name}`}
                className="rounded-full p-2 text-[#9C9485] hover:text-[#DC2626] hover:bg-[#DC2626]/10"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
