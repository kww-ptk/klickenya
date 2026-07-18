import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { resolveOwnedEvent } from "@/lib/events/ownedEvent";
import DoorCodesPanel from "./DoorCodesPanel";
import TierManager from "./TierManager";

export const metadata = { title: "Ticket sales — Klickenya" };

export default async function TicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // [id] is polymorphic — EITHER an events_pending row id OR a Sanity listing _id.
  // Tickets are keyed by the real Sanity _id (event_sanity_id), so resolve [id]
  // down to that before querying ticket tables.
  const owned = await resolveOwnedEvent(supabase, user.id, id);
  if (!owned) notFound();
  const { sanityEventId, eventTitle } = owned;

  const [{ data: orders }, { data: tickets }, { data: doorCodes }] = await Promise.all([
    adminClient
      .from("ticket_orders")
      .select("id, status, total_kes, platform_fee_bps, buyer_name, buyer_email, created_at, lines")
      .eq("event_sanity_id", sanityEventId)
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("tickets")
      .select("id, tier_name, attendee_name, attendee_email, status, price_kes, checked_in_at, code")
      .eq("event_sanity_id", sanityEventId)
      .order("created_at", { ascending: false })
      .limit(1000),
    adminClient
      .from("event_door_codes")
      .select("id, label, created_at")
      .eq("event_sanity_id", sanityEventId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const tierDoc = await sanityClient.fetch<{ ticketTypes: { _key: string; name: string; price: number; description?: string; available?: number; isSoldOut?: boolean }[] | null } | null>(
    `*[_type == "listing" && _id == $id][0]{ ticketTypes[]{_key, name, price, description, available, isSoldOut} }`,
    { id: sanityEventId },
  );
  const { data: counters } = await adminClient
    .from("event_ticket_counters").select("tier_key, sold").eq("event_sanity_id", sanityEventId);
  const soldByKey = new Map((counters ?? []).map((c) => [c.tier_key, c.sold]));
  const initialTiers = (tierDoc?.ticketTypes ?? []).map((t) => ({ ...t, sold: soldByKey.get(t._key) ?? 0 }));

  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const gross = paid.reduce((s, o) => s + o.total_kes, 0);
  const fees = paid.reduce((s, o) => s + Math.floor((o.total_kes * o.platform_fee_bps) / 10_000), 0);
  const issued = (tickets ?? []).filter((t) => t.status !== "cancelled");
  const checkedIn = issued.filter((t) => t.status === "checked_in").length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{eventTitle}</h1>
          <p className="text-sm text-neutral-500">Ticket sales &amp; check-ins</p>
        </div>
        <Link href={`/dashboard/events/${id}/scan`}
          className="rounded-lg bg-[#16130C] px-4 py-2.5 text-sm font-semibold text-white">
          📷 Scan tickets
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Tickets sold", String(issued.length)],
          ["Checked in", `${checkedIn}/${issued.length}`],
          ["Gross (KSh)", gross.toLocaleString("en-KE")],
          ["Your payout (KSh)", (gross - fees).toLocaleString("en-KE")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>
      {fees > 0 && (
        <p className="mt-2 text-xs text-neutral-400">
          Payout = gross − KSh {fees.toLocaleString("en-KE")} platform fee. Paid out manually after the event.
        </p>
      )}

      <DoorCodesPanel eventId={id} initialCodes={doorCodes ?? []} />

      <TierManager eventId={id} initialTiers={initialTiers} />

      <h2 className="mt-8 font-bold">Tickets</h2>
      <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
        {issued.length === 0 && <p className="p-4 text-sm text-neutral-500">No tickets yet.</p>}
        {issued.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">{t.attendee_name}</p>
              <p className="truncate text-xs text-neutral-500">{t.tier_name} · {t.attendee_email}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              t.status === "checked_in" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
            }`}>
              {t.status === "checked_in" ? "Checked in" : "Issued"}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
