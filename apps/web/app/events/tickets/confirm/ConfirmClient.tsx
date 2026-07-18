"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type TicketOut = { code: string; tierName: string };

export default function ConfirmClient() {
  const orderId = useSearchParams().get("order");
  const [state, setState] = useState<"polling" | "paid" | "failed">("polling");
  const [tickets, setTickets] = useState<TicketOut[]>([]);

  useEffect(() => {
    if (!orderId) { setState("failed"); return; }
    let tries = 0;
    const poll = async () => {
      tries++;
      try {
        const res = await fetch(`/api/events/tickets/orders/${orderId}`);
        const json = await res.json();
        if (json.status === "paid") {
          setTickets(json.tickets ?? []);
          setState("paid");
          return;
        }
        if (json.status === "expired" || json.status === "cancelled" || tries > 30) {
          setState("failed");
          return;
        }
      } catch { /* keep polling */ }
      setTimeout(poll, 2000);
    };
    poll();
  }, [orderId]);

  if (state === "polling") {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-6 h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <h1 className="text-xl font-bold">Confirming your payment…</h1>
        <p className="mt-2 text-sm text-neutral-500">This usually takes a few seconds. Don&apos;t close this page.</p>
      </main>
    );
  }
  if (state === "failed") {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold">We couldn&apos;t confirm this payment</h1>
        <p className="mt-2 text-sm text-neutral-500">
          If you were charged, your tickets will arrive by email shortly. Otherwise, please try again.
        </p>
        <Link href="/events" className="mt-6 inline-block rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white">
          Back to events
        </Link>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">You&apos;re in! 🎟️</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} issued — also sent to your email with QR codes.
      </p>
      <div className="mt-8 space-y-3">
        {tickets.map((t) => (
          <Link
            key={t.code}
            href={`/t/${t.code}`}
            className="block rounded-xl border border-neutral-200 p-4 text-left hover:border-amber-500"
          >
            <span className="font-semibold">{t.tierName}</span>
            <span className="ml-2 font-mono text-xs text-neutral-500">{t.code}</span>
            <span className="float-right text-amber-600 text-sm font-semibold">View QR →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
