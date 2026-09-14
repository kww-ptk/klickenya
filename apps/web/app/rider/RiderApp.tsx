"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPin, Phone, Navigation, LogOut, RefreshCw, MessageCircle } from "lucide-react";
import { waNumber } from "@/lib/eat/whatsappOrder";
import { mapsUrl } from "@/lib/orders/location";
import { usePolling } from "@/hooks/usePolling";

type Job = {
  id: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_kes: number | null;
  created_at: string;
  rider_accepted_at: string | null;
  picked_up_at: string | null;
  menu_id: string;
  order_items: { id: string; item_name: string; quantity: number; is_voided?: boolean | null }[];
};

type Payload = { mine: Job[]; available: Job[]; restaurants: Record<string, string> };

export function RiderApp() {
  const [rider, setRider] = useState<{ rider_id: string; name: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<Payload>({ mine: [], available: [], restaurants: {} });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── session ─────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/rider/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRider(d))
      .catch(() => setRider(null))
      .finally(() => setChecking(false));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/rider/jobs", { cache: "no-store" });
      if (res.status === 401) {
        setRider(null);
        return;
      }
      if (!res.ok) return;
      setData((await res.json()) as Payload);
    } catch {
      /* offline — keep the last list on screen rather than blanking it */
    }
  }, []);

  useEffect(() => {
    if (rider) void load();
  }, [rider, load]);
  usePolling(load, 15000, Boolean(rider));

  async function act(
    jobId: string,
    action: "accept" | "pickup" | "deliver" | "release",
    cash?: number,
    pickupCode?: string,
  ) {
    setBusy(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/rider/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, cash_collected_kes: cash, pickup_code: pickupCode }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(p?.error ?? "That didn't work. Try again.");
      }
      await load(); // whatever happened, re-read the truth
    } catch {
      setError("No connection. Try again when you have signal.");
    } finally {
      setBusy(null);
    }
  }

  if (checking) {
    return (
      <main className="min-h-[100dvh] bg-[#16130C] flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-[#E8A020] border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!rider) return <RiderLogin onSignedIn={setRider} />;

  const job = data.mine[0] ?? null; // one job at a time, on purpose

  return (
    <main className="min-h-[100dvh] bg-[#16130C] text-white px-4 py-5">
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-white/50">Rider</p>
          <p className="font-display text-[20px] font-extrabold">{rider.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={load}
            aria-label="Refresh"
            className="rounded-full p-2.5 text-white/60 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Sign out"
            onClick={async () => {
              await fetch("/api/rider/auth", { method: "DELETE" });
              setRider(null);
            }}
            className="rounded-full p-2.5 text-white/60 hover:text-white hover:bg-white/10"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-[#DC2626]/20 px-4 py-3 text-[14px] text-[#FCA5A5]">
          {error}
        </p>
      )}

      {job ? (
        <JobCard
          job={job}
          restaurant={data.restaurants[job.menu_id] ?? "Restaurant"}
          stage={job.picked_up_at ? "delivering" : "collecting"}
          busy={busy === job.id}
          onPickup={(code) => act(job.id, "pickup", undefined, code)}
          onDeliver={(cash) => act(job.id, "deliver", cash)}
          onRelease={() => {
            if (window.confirm("Hand this job back? Another rider will be able to take it.")) {
              void act(job.id, "release");
            }
          }}
        />
      ) : (
        <>
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-white/50 mb-3">
            Jobs you can take
          </h2>
          {data.available.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
              <p className="font-display text-[17px] font-bold">Nothing waiting</p>
              <p className="text-[13.5px] text-white/50 mt-1">
                New jobs appear here on their own, as soon as a kitchen starts
                cooking one.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.available.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  restaurant={data.restaurants[j.menu_id] ?? "Restaurant"}
                  stage="open"
                  busy={busy === j.id}
                  onAccept={() => act(j.id, "accept")}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

/* ── One job ─────────────────────────────────────────────────── */

function JobCard({
  job,
  restaurant,
  stage,
  busy,
  onAccept,
  onPickup,
  onDeliver,
  onRelease,
}: {
  job: Job;
  restaurant: string;
  /** open = anyone can take it · collecting = mine, riding to the kitchen ·
   *  delivering = mine, food on the bike */
  stage: "open" | "collecting" | "delivering";
  busy: boolean;
  onAccept?: () => void;
  onPickup?: (pickupCode: string) => void;
  onDeliver?: (cash?: number) => void;
  /** Hand the job back before pickup — a puncture, a shift ending. */
  onRelease?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState("");
  const [cash, setCash] = useState(String(job.total_kes ?? ""));
  const items = (job.order_items ?? []).filter((i) => !i.is_voided);
  const cooked = job.status === "ready";
  const hasPin =
    typeof job.delivery_lat === "number" && typeof job.delivery_lng === "number";

  // Before pickup the rider is going to the RESTAURANT; after it, to the
  // customer. Showing the customer's directions while they are still riding
  // to the kitchen is how you send someone the wrong way.
  const showCustomerRoute = stage === "delivering";

  const heading =
    stage === "delivering"
      ? "Deliver to"
      : stage === "collecting"
      ? cooked
        ? "Ready — collect now"
        : "Still cooking"
      : cooked
      ? "Ready now"
      : "Cooking now";

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-[#E8A020] font-bold">
            {heading} · {restaurant}
          </p>
          <p className="font-display text-[20px] font-extrabold mt-0.5">
            {showCustomerRoute ? job.customer_name ?? "Guest" : restaurant}
          </p>
        </div>
        <p className="font-display text-[19px] font-extrabold shrink-0">
          KSh {(job.total_kes ?? 0).toLocaleString()}
        </p>
      </div>

      {job.delivery_address && (
        <p className="flex items-start gap-2 text-[14px] text-white/80 mt-2 leading-snug">
          <MapPin className="size-4 shrink-0 mt-0.5 text-[#E8A020]" aria-hidden />
          <span className="select-text">
            {showCustomerRoute ? job.delivery_address : `Going to: ${job.delivery_address}`}
          </span>
        </p>
      )}

      {showCustomerRoute && (
        <div className="flex gap-2 mt-3">
          {hasPin && (
            <a
              href={mapsUrl({ lat: job.delivery_lat as number, lng: job.delivery_lng as number })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-[14px] font-bold"
            >
              <Navigation className="size-4" aria-hidden />
              Directions
            </a>
          )}
          {job.customer_phone && (
            <>
              <a
                href={`tel:${job.customer_phone}`}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-[14px] font-bold"
              >
                <Phone className="size-4" aria-hidden />
                Call
              </a>
              {/* Usually the better option: cheaper than a call, and it
                  leaves the customer a thread rather than a missed call from
                  a number they do not know. */}
              <a
                href={`https://wa.me/${waNumber(job.customer_phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-3 text-[14px] font-bold text-[#0B3D22]"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            </>
          )}
        </div>
      )}

      <ul className="mt-3 pt-3 border-t border-white/10 space-y-1">
        {items.map((i) => (
          <li key={i.id} className="text-[13.5px] text-white/70">
            <span className="font-bold text-white">{i.quantity}×</span> {i.item_name}
          </li>
        ))}
      </ul>

      {stage === "open" && onAccept && (
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="mt-4 w-full rounded-full bg-[#E8A020] py-4 text-[16px] font-extrabold text-[#16130C] disabled:opacity-50"
        >
          {busy ? "…" : cooked ? "Take this job — ready now" : "Take this job"}
        </button>
      )}

      {stage === "collecting" && onPickup && (
        <>
          {cooked ? (
            <div className="mt-4 space-y-2">
              <label htmlFor={`code-${job.id}`} className="block text-[13px] font-bold text-white/80">
                Ask the kitchen for the 4-digit code
              </label>
              <input
                id={`code-${job.id}`}
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-[24px] font-bold tracking-[0.5em] text-white placeholder:text-white/25"
              />
              <button
                type="button"
                onClick={() => onPickup(code)}
                disabled={busy || code.length !== 4}
                className="w-full rounded-full bg-[#E8A020] py-4 text-[16px] font-extrabold text-[#16130C] disabled:opacity-40"
              >
                {busy ? "…" : "I have the food"}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="mt-4 w-full rounded-full bg-[#E8A020] py-4 text-[16px] font-extrabold text-[#16130C] opacity-40"
              >
                Waiting for the kitchen
              </button>
              <p className="text-[12.5px] text-white/50 text-center mt-2">
                Head over now. This unlocks the moment the kitchen marks it ready.
              </p>
            </>
          )}
          {onRelease && (
            <button
              type="button"
              onClick={onRelease}
              disabled={busy}
              className="mt-3 w-full rounded-full border border-white/20 py-3 text-[14px] font-bold text-white/70 disabled:opacity-50"
            >
              I can&apos;t do this one
            </button>
          )}
        </>
      )}

      {stage === "delivering" && onDeliver && (
        <>
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={busy}
              className="mt-4 w-full rounded-full bg-[#16A34A] py-4 text-[16px] font-extrabold disabled:opacity-50"
            >
              Delivered
            </button>
          ) : (
            <div className="mt-4 space-y-2">
              {/* Asked every time. The rider is holding someone else's money
                  and the amount taken is the only record of it. */}
              <label htmlFor="cash" className="block text-[13px] font-bold text-white/80">
                How much cash did you take?
              </label>
              <input
                id="cash"
                type="number"
                inputMode="numeric"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="w-full rounded-xl bg-white/10 px-4 py-3 text-[18px] font-bold text-white"
              />
              <p className="text-[12px] text-white/50">
                Put 0 if they already paid or paid by M-Pesa.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onDeliver(cash === "" ? undefined : Number(cash))}
                  className="flex-1 rounded-full bg-[#16A34A] py-4 text-[16px] font-extrabold disabled:opacity-50"
                >
                  {busy ? "…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-full border border-white/20 py-4 text-[16px] font-bold"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </article>
  );
}

/* ── Sign in ─────────────────────────────────────────────────── */

function RiderLogin({ onSignedIn }: { onSignedIn: (r: { rider_id: string; name: string }) => void }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rider/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const p = (await res.json().catch(() => null)) as
        | { rider_id?: string; name?: string; error?: string }
        | null;
      if (!res.ok || !p?.rider_id) {
        setError(p?.error ?? "Couldn't sign you in.");
        return;
      }
      onSignedIn({ rider_id: p.rider_id, name: p.name ?? "Rider" });
    } catch {
      setError("No connection. Try again when you have signal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#16130C] text-white flex flex-col justify-center px-6">
      <p className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
        <span className="text-[#E8A020]">eat</span>
        <span className="text-[#E8A020]/60">.</span>
        <span className="text-white/90">klick</span>
      </p>
      <p className="text-[14px] text-white/50 mt-1 mb-8">Rider sign in</p>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="phone" className="block text-[13px] font-bold text-white/80 mb-1.5">
            Your phone number
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className="w-full rounded-xl bg-white/10 px-4 py-3.5 text-[17px] text-white placeholder:text-white/30"
          />
        </div>
        <div>
          <label htmlFor="pin" className="block text-[13px] font-bold text-white/80 mb-1.5">
            Your 4-digit PIN
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="w-full rounded-xl bg-white/10 px-4 py-3.5 text-[22px] tracking-[0.5em] text-white placeholder:text-white/30"
          />
        </div>

        {error && (
          <p role="alert" className="text-[13.5px] text-[#FCA5A5]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || phone.length < 9 || pin.length !== 4}
          className="w-full rounded-full bg-[#E8A020] py-4 text-[16px] font-extrabold text-[#16130C] disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Start my shift"}
        </button>
      </form>
    </main>
  );
}
