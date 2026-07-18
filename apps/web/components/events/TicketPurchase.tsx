"use client";

import { useEffect, useMemo, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { nextOccurrences } from "@/lib/tickets/occurrences";

type Tier = { _key: string; name: string; price: number; description?: string; isSoldOut?: boolean };
type ScheduleRow = { day?: string; startTime?: string; endTime?: string };

// Format a stored "last booked" timestamp as a short relative string ("3 hours
// ago", "2 days ago"). Returns null when the value is missing or older than
// MAX_AGE_DAYS — the caller then hides the line rather than show stale proof.
const MAX_AGE_DAYS = 14;
function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return null;
  const mins = Math.floor(diffMs / 60_000);
  if (mins > MAX_AGE_DAYS * 24 * 60) return null;
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Format an occurrence date (YYYY-MM-DD) for a picker pill, in Kenya time.
function formatOccurrence(dateISO: string): string {
  return new Date(dateISO + "T00:00:00+03:00").toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function TicketPurchase({
  eventSanityId,
  isFree,
  tiers,
  userId,
  defaultName,
  defaultEmail,
  anchorId,
  isRecurring,
  schedule,
}: {
  eventSanityId: string;
  isFree: boolean;
  tiers: Tier[];
  userId?: string;
  defaultName?: string;
  defaultEmail?: string;
  anchorId?: string;
  isRecurring?: boolean;
  schedule?: ScheduleRow[];
}) {
  const hasSiteKey = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const effectiveTiers: Tier[] = isFree
    ? [{ _key: "free", name: "Free entry", price: 0 }]
    : tiers.filter((t) => !t.isSoldOut);

  // Recurring events: the buyer must pick which upcoming occurrence to attend.
  // Computed client-side from the weekly schedule (isomorphic, no network).
  const occurrenceDates = useMemo(
    () => (isRecurring ? nextOccurrences(schedule ?? [], new Date().toISOString().slice(0, 10), 8) : []),
    [isRecurring, schedule],
  );
  const [occurrenceDate, setOccurrenceDate] = useState<string>(occurrenceDates[0] ?? "");
  // Keep the default valid if the computed dates arrive/refresh.
  useEffect(() => {
    if (isRecurring && !occurrenceDate && occurrenceDates.length > 0) {
      setOccurrenceDate(occurrenceDates[0]);
    }
  }, [isRecurring, occurrenceDate, occurrenceDates]);

  const [qty, setQty] = useState<Record<string, number>>({});
  // Per-ticket attendee names, keyed by tier _key. names[tierKey] has length
  // equal to that tier's qty. Kept in sync inside the +/- qty handlers below.
  const [names, setNames] = useState<Record<string, string[]>>({});
  const [name, setName] = useState(defaultName ?? "");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeDone, setFreeDone] = useState<{ code: string; tierName: string; attendeeName: string }[] | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<{ discount_kes: number; total_kes: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [lastBookedAt, setLastBookedAt] = useState<string | null>(null);

  // Fetch the real "last booked" timestamp for honest social proof. We only
  // render the line when it exists and is recent (see relativeTime). Never fake.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/tickets/recent-booking?eventSanityId=${encodeURIComponent(eventSanityId)}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setLastBookedAt(j?.lastBookedAt ?? null); })
      .catch(() => { if (!cancelled) setLastBookedAt(null); });
    return () => { cancelled = true; };
  }, [eventSanityId]);
  const lastBookedLabel = relativeTime(lastBookedAt);

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
        body: JSON.stringify({
          eventSanityId,
          code: couponCode.trim().toUpperCase(),
          tiers: selected,
          ...(isRecurring ? { occurrenceDate } : {}),
        }),
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
    if (isRecurring && !occurrenceDate) { setError("Pick a date"); return; }
    if (!name.trim() || !email.trim()) { setError("Name and email are required"); return; }
    // One attendee entry per ticket, in the same tier order as `selected`.
    // Falls back to the buyer name when an attendee field is left blank.
    const attendees = selected.flatMap((line) =>
      Array.from({ length: line.qty }, (_, i) => ({
        tierKey: line.tierKey,
        name: (names[line.tierKey]?.[i] ?? "").trim() || name,
      })),
    );
    setBusy(true);
    try {
      const res = await fetch("/api/events/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSanityId, name, email, userId,
          tiers: selected,
          attendees,
          turnstileToken: token || "dev",
          ...(isRecurring ? { occurrenceDate } : {}),
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
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <p className="text-center font-bold text-green-800">You&apos;re in! 🎟️</p>
        <p className="mt-1 text-center text-sm text-green-700">
          Ticket{freeDone.length > 1 ? "s" : ""} sent to your email with QR code{freeDone.length > 1 ? "s" : ""}.
        </p>
        <div className="mt-4 space-y-2">
          {freeDone.map((t) => (
            <a
              key={t.code}
              href={`/t/${t.code}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-white p-3 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-green-900">{t.attendeeName}</span>
                <span className="block truncate text-xs text-green-700">{t.tierName}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-green-800 underline">View QR →</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 p-5" {...(anchorId ? { id: anchorId } : {})}>
      <h3 className="font-bold">{isFree ? "Get your free ticket" : "Buy tickets"}</h3>
      {isRecurring && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-neutral-700">Choose a date</p>
          {occurrenceDates.length > 0 ? (
            <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {occurrenceDates.map((d) => {
                const active = d === occurrenceDate;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setOccurrenceDate(d); resetCoupon(); }}
                    aria-pressed={active}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-neutral-300 text-neutral-700 hover:border-amber-400"
                    }`}
                  >
                    {formatOccurrence(d)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-sm text-neutral-500">
              No upcoming dates scheduled — check the description for details.
            </p>
          )}
        </div>
      )}
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
                onClick={() => {
                  const nextQ = Math.max(0, (qty[t._key] ?? 0) - 1);
                  setQty((q) => ({ ...q, [t._key]: nextQ }));
                  setNames((prev) => ({ ...prev, [t._key]: (prev[t._key] ?? []).slice(0, nextQ) }));
                  resetCoupon();
                }}
                className="h-9 w-9 rounded-full border text-lg leading-none">−</button>
              <span className="w-5 text-center text-sm font-semibold">{qty[t._key] ?? 0}</span>
              <button type="button" aria-label={`More ${t.name}`}
                onClick={() => {
                  const nextQ = Math.min(10, (qty[t._key] ?? 0) + 1);
                  setQty((q) => ({ ...q, [t._key]: nextQ }));
                  setNames((prev) => {
                    const arr = (prev[t._key] ?? []).slice(0, nextQ);
                    while (arr.length < nextQ) arr.push(name); // prefill new slots with buyer name
                    return { ...prev, [t._key]: arr };
                  });
                  resetCoupon();
                }}
                className="h-9 w-9 rounded-full border text-lg leading-none">+</button>
            </div>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-neutral-700">Who&apos;s each ticket for?</p>
          <div className="mt-2 space-y-2">
            {effectiveTiers
              .filter((t) => (qty[t._key] ?? 0) > 0)
              .flatMap((t) =>
                Array.from({ length: qty[t._key] ?? 0 }, (_, i) => (
                  <input
                    key={`${t._key}-${i}`}
                    value={names[t._key]?.[i] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNames((prev) => {
                        const arr = (prev[t._key] ?? []).slice();
                        while (arr.length <= i) arr.push(name);
                        arr[i] = v;
                        return { ...prev, [t._key]: arr };
                      });
                    }}
                    placeholder={`${t.name} · Ticket ${i + 1}`}
                    aria-label={`${t.name} · Ticket ${i + 1}`}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-[16px]"
                  />
                )),
              )}
          </div>
        </div>
      )}
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
        disabled={busy || (hasSiteKey && !token) || (isRecurring && !occurrenceDate)}
        className="mt-4 w-full rounded-xl bg-amber-500 py-3.5 font-bold text-white disabled:opacity-50"
      >
        {busy ? "One moment…" : isFree ? "Get free ticket" : `Pay KSh ${payTotal.toLocaleString("en-KE")} — M-Pesa / Card`}
      </button>

      {/* Trust signals — muted, compact. Last-booked only renders when it is real
          and recent (see relativeTime); we never fabricate social proof. */}
      <div className="mt-3 space-y-1.5 text-xs text-neutral-500">
        {!isFree && (
          <p className="flex items-center gap-1.5">
            <span aria-hidden>🔒</span>
            <span>Secure payment — M-Pesa &amp; card via Paystack</span>
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <span aria-hidden>✓</span>
          <span>Official tickets — sold on Klickenya</span>
        </p>
        {lastBookedLabel && (
          <p className="flex items-center gap-1.5 text-neutral-600">
            <span aria-hidden>🎟</span>
            <span>Last booked {lastBookedLabel}</span>
          </p>
        )}
      </div>
    </div>
  );
}
