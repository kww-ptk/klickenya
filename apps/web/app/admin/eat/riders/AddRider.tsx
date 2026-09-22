"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MenuOption = { id: string; name: string };

/**
 * Hiring form. Two kinds of rider, and the choice changes what else is asked:
 * a Klickenya rider needs no restaurants (they work all of them), a
 * restaurant rider needs at least one or they sign in to an empty screen.
 */
export function AddRider({ menus }: { menus: MenuOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isPlatform, setIsPlatform] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; pin: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/eat/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, pin,
          is_platform: isPlatform,
          menu_ids: isPlatform ? [] : picked,
        }),
      });
      const p = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(p?.error ?? "Could not add that rider.");
        return;
      }
      setDone({ name: name.trim(), pin });
      setName(""); setPhone(""); setPin(""); setPicked([]);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 mb-4">
        <p className="font-display text-[16px] font-bold text-zinc-900">
          {done.name} can start
        </p>
        <p className="text-[13px] text-zinc-600 mt-1">
          Give them this PIN now — it is stored scrambled and cannot be shown again.
        </p>
        <p className="font-mono text-[30px] font-bold tracking-[0.3em] text-zinc-900 mt-3">
          {done.pin}
        </p>
        <p className="text-[12.5px] text-zinc-600 mt-2">
          They sign in at <span className="font-bold">klickenya.com/rider</span> with their
          phone number and this PIN.
        </p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-[13px] font-bold text-white"
        >
          Add another
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-[13.5px] font-bold text-white"
      >
        + Hire a rider
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-5 mb-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_130px]">
        <div>
          <label htmlFor="r-name" className="block text-[12px] font-bold text-zinc-600 mb-1">Name</label>
          <input id="r-name" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-[16px]" />
        </div>
        <div>
          <label htmlFor="r-phone" className="block text-[12px] font-bold text-zinc-600 mb-1">Phone</label>
          <input id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678" inputMode="tel"
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-[16px]" />
        </div>
        <div>
          <label htmlFor="r-pin" className="block text-[12px] font-bold text-zinc-600 mb-1">PIN</label>
          <input id="r-pin" value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-[16px] tracking-[0.3em]" />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[12px] font-bold text-zinc-600 mb-1">Who do they work for?</legend>
        <label className="flex items-start gap-2.5 rounded-xl border border-zinc-200 p-3 cursor-pointer has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
          <input type="radio" name="kind" checked={isPlatform}
            onChange={() => setIsPlatform(true)} className="mt-0.5" />
          <span>
            <span className="block text-[14px] font-bold text-zinc-900">Klickenya rider</span>
            <span className="block text-[12.5px] text-zinc-500">
              Works every restaurant that delivers — including ones added later. Nothing
              to update when you onboard a new kitchen.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 rounded-xl border border-zinc-200 p-3 cursor-pointer has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50">
          <input type="radio" name="kind" checked={!isPlatform}
            onChange={() => setIsPlatform(false)} className="mt-0.5" />
          <span>
            <span className="block text-[14px] font-bold text-zinc-900">Restaurant rider</span>
            <span className="block text-[12.5px] text-zinc-500">
              Works only the restaurants you pick.
            </span>
          </span>
        </label>
      </fieldset>

      {!isPlatform && (
        <div>
          <p className="text-[12px] font-bold text-zinc-600 mb-1.5">Restaurants</p>
          {menus.length === 0 ? (
            <p className="text-[13px] text-amber-700">
              No restaurant has delivery switched on yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {menus.map((mo) => {
                const on = picked.includes(mo.id);
                return (
                  <button
                    key={mo.id}
                    type="button"
                    onClick={() =>
                      setPicked((p) => (on ? p.filter((x) => x !== mo.id) : [...p, mo.id]))
                    }
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold border ${
                      on
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-white text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {mo.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-[13px] text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit"
          disabled={busy || !name.trim() || phone.length < 9 || pin.length !== 4}
          className="rounded-full bg-zinc-900 px-6 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40">
          {busy ? "Adding…" : "Add rider"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-full border border-zinc-200 px-6 py-2.5 text-[13.5px] font-bold text-zinc-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
