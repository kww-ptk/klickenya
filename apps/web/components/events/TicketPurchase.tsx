"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type Tier = { _key: string; name: string; price: number; description?: string; isSoldOut?: boolean };

export function TicketPurchase({
  eventSanityId,
  isFree,
  tiers,
  userId,
  defaultName,
  defaultEmail,
  anchorId,
}: {
  eventSanityId: string;
  isFree: boolean;
  tiers: Tier[];
  userId?: string;
  defaultName?: string;
  defaultEmail?: string;
  anchorId?: string;
}) {
  const hasSiteKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const effectiveTiers: Tier[] = isFree
    ? [{ _key: "free", name: "Free entry", price: 0 }]
    : tiers.filter((t) => !t.isSoldOut);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeDone, setFreeDone] = useState<{ code: string }[] | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discount_kes: number; total_kes: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const selected = effectiveTiers
    .map((t) => ({ tierKey: t._key, qty: qty[t._key] ?? 0 }))
    .filter((l) => l.qty > 0);
  const total = effectiveTiers.reduce((s, t) => s + t.price * (qty[t._key] ?? 0), 0);
  // When a coupon is applied, the pay button charges the discounted total.
  const payTotal = couponResult ? couponResult.total_kes : total;

  // Any change to selected tiers/qty invalidates a previously previewed coupon —
  // the discount was computed for the old cart, so force a re-apply.
  function resetCoupon() {
    setCouponResult(null);
    setCouponMsg(null);
  }

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    if (selected.length === 0) { setCouponResult(null); setCouponMsg("Pick at least one ticket first"); return; }
    setCouponBusy(true); setCouponMsg(null);
    try {
      const res = await fetch("/api/events/tickets/coupon/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSanityId, code: couponCode.trim().toUpperCase(), tiers: selected }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setCouponResult(null);
        setCouponMsg(json.error ?? "Coupon not valid");
        return;
      }
      setCouponResult({ discount_kes: json.discount_kes, total_kes: json.total_kes });
      setCouponMsg(`−KSh ${json.discount_kes.toLocaleString("en-KE")} applied`);
    } catch {
      setCouponResult(null);
      setCouponMsg("Network error — please retry");
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (selected.length === 0) { setError("Pick at least one ticket"); return; }
    if (!name.trim() || !email.trim()) { setError("Name and email are required"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/events/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSanityId, name, email, userId,
          tiers: selected,
          turnstileToken: token || "dev",
          ...(couponResult ? { couponCode: couponCode.trim().toUpperCase() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Something went wrong"); return; }
      if (json.status === "paid") {
        setFreeDone(json.tickets);
      } else if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      }
    } catch {
      setError("Network error — please retry");
    } finally {
      setBusy(false);
    }
  }

  if (freeDone) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="font-bold text-green-800">You&apos;re in! 🎟️</p>
        <p className="mt-1 text-sm text-green-700">
          Ticket{freeDone.length > 1 ? "s" : ""} sent to your email with QR code{freeDone.length > 1 ? "s" : ""}.
        </p>
        <a href={`/t/${freeDone[0].code}`} className="mt-3 inline-block text-sm font-semibold text-green-800 underline">
          View your ticket →
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-5" {...(anchorId ? { id: anchorId } : {})}>
      <h3 className="font-bold">{isFree ? "Get your free ticket" : "Buy tickets"}</h3>
      <div className="mt-3 space-y-2">
        {effectiveTiers.map((t) => (
          <div key={t._key} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.name}</p>
              {t.description && <p className="truncate text-xs text-neutral-500">{t.description}</p>}
              <p className="text-sm text-amber-600 font-semibold">
                {t.price > 0 ? `KSh ${t.price.toLocaleString("en-KE")}` : "Free"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={`Fewer ${t.name}`}
                onClick={() => { setQty((q) => ({ ...q, [t._key]: Math.max(0, (q[t._key] ?? 0) - 1) })); resetCoupon(); }}
                className="h-9 w-9 rounded-full border text-lg leading-none">−</button>
              <span className="w-5 text-center text-sm font-semibold">{qty[t._key] ?? 0}</span>
              <button type="button" aria-label={`More ${t.name}`}
                onClick={() => { setQty((q) => ({ ...q, [t._key]: Math.min(10, (q[t._key] ?? 0) + 1) })); resetCoupon(); }}
                className="h-9 w-9 rounded-full border text-lg leading-none">+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
          className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-[16px]" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
          className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-[16px]" />
      </div>
      {!isFree && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); resetCoupon(); }}
              placeholder="Have a coupon?"
              className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-[16px] font-mono uppercase" />
            <button type="button" onClick={applyCoupon} disabled={couponBusy || !couponCode.trim()}
              className="shrink-0 rounded-lg border border-amber-500 px-4 py-3 text-sm font-semibold text-amber-600 disabled:opacity-50">
              {couponBusy ? "…" : "Apply"}
            </button>
          </div>
          {couponMsg && (
            <p className={`mt-1 text-sm ${couponResult ? "text-green-600" : "text-red-600"}`}>{couponMsg}</p>
          )}
        </div>
      )}
      {hasSiteKey && (
        <div className="mt-3">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setToken}
          />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || (hasSiteKey && !token)}
        className="mt-4 w-full rounded-xl bg-amber-500 py-3.5 font-bold text-white disabled:opacity-50"
      >
        {busy ? "One moment…" : isFree ? "Get free ticket" : `Pay KSh ${payTotal.toLocaleString("en-KE")} — M-Pesa / Card`}
      </button>
      {!isFree && (
        <p className="mt-2 text-center text-xs text-neutral-400">
          Secure payment via Paystack. Tickets arrive by email instantly.
        </p>
      )}
    </div>
  );
}
