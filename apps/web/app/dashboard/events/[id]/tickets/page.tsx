import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { resolveManageableEvent } from "@/lib/events/manageableEvent";
import DoorCodesPanel from "./DoorCodesPanel";
import TierManager from "./TierManager";
import CouponManager from "./CouponManager";
import SalesTimeline from "./SalesTimeline";
import GuestList from "./GuestList";

export const metadata = { title: "Ticket sales — Klickenya" };

export default async function TicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // [id] is polymorphic — EITHER an events_pending row id OR a Sanity listing _id.
  // Tickets are keyed by the real Sanity _id (event_sanity_id), so resolve [id]
  // down to that before querying ticket tables. resolveManageableEvent grants the
  // owning host OR any admin (isAdmin unused here — the dashboard is identical).
  const manageable = await resolveManageableEvent(supabase, user.id, id);
  if (!manageable) notFound();
  const { sanityEventId, eventTitle } = manageable;

  const [{ data: orders }, { data: tickets }, { data: doorCodes }] = await Promise.all([
    adminClient
      .from("ticket_orders")
      .select("id, status, total_kes, platform_fee_bps, discount_kes, coupon_id, buyer_name, buyer_email, created_at, lines")
      .eq("event_sanity_id", sanityEventId)
      .order("created_at", { ascending: false })
      .limit(500),
    adminClient
      .from("tickets")
      .select("id, tier_name, attendee_name, attendee_email, status, price_kes, checked_in_at, order_id, code")
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

  const { data: couponRows } = await adminClient
    .from("event_coupons")
    .select("id, code, discount_type, discount_value, max_redemptions, redeemed, expires_at, one_per_customer")
    .eq("event_sanity_id", sanityEventId).eq("active", true).order("created_at", { ascending: false });
  const couponIds = (couponRows ?? []).map((c) => c.id);
  const { data: redemptions } = await adminClient
    .from("coupon_redemptions").select("coupon_id, discount_kes")
    .in("coupon_id", couponIds.length ? couponIds : ["00000000-0000-0000-0000-000000000000"]);
  const useMap = new Map<string, { uses: number; given: number }>();
  for (const r of redemptions ?? []) {
    const cur = useMap.get(r.coupon_id) ?? { uses: 0, given: 0 };
    useMap.set(r.coupon_id, { uses: cur.uses + 1, given: cur.given + r.discount_kes });
  }
  const initialCoupons = (couponRows ?? []).map((c) => ({ ...c, uses: useMap.get(c.id)?.uses ?? 0, discount_given: useMap.get(c.id)?.given ?? 0 }));

  // Coupon-code map for the guest list. Orders may reference a coupon that was
  // deactivated after use, so fetch codes for every coupon_id on the orders — not
  // just the active couponRows above.
  const orderCouponIds = [...new Set((orders ?? []).map((o) => o.coupon_id).filter(Boolean))] as string[];
  const { data: allCouponCodes } = orderCouponIds.length
    ? await adminClient.from("event_coupons").select("id, code").in("id", orderCouponIds)
    : { data: [] as { id: string; code: string }[] };
  const codeById = new Map((allCouponCodes ?? []).map((c) => [c.id, c.code]));
  const couponByOrder = new Map((orders ?? []).map((o) => [o.id, o.coupon_id ? codeById.get(o.coupon_id) ?? null : null]));

  // KPIs
  const paidOrders = (orders ?? []).filter((o) => o.status === "paid");
  const gross = paidOrders.reduce((s, o) => s + o.total_kes, 0);
  const fees = paidOrders.reduce((s, o) => s + Math.floor((o.total_kes * o.platform_fee_bps) / 10_000), 0);
  const discountGiven = paidOrders.reduce((s, o) => s + (o.discount_kes ?? 0), 0);
  const couponsUsed = paidOrders.filter((o) => o.coupon_id).length;
  const issued = (tickets ?? []).filter((t) => t.status !== "cancelled");
  const checkedIn = issued.filter((t) => t.status === "checked_in").length;
  const avgOrder = paidOrders.length ? Math.round(gross / paidOrders.length) : 0;

  // Per-tier breakdown
  const perTier = new Map<string, { sold: number; revenue: number; checkedIn: number }>();
  for (const t of issued) {
    const cur = perTier.get(t.tier_name) ?? { sold: 0, revenue: 0, checkedIn: 0 };
    cur.sold += 1; cur.revenue += t.price_kes; if (t.status === "checked_in") cur.checkedIn += 1;
    perTier.set(t.tier_name, cur);
  }
  const tierRows = [...perTier.entries()].sort(([a], [b]) => a.localeCompare(b));

  // Sales timeline (paid orders per day, Africa/Nairobi)
  const byDay = new Map<string, number>();
  for (const o of paidOrders) {
    const day = new Date(o.created_at).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }); // YYYY-MM-DD
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const timeline = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }));

  // Guest list rows
  const guests = issued.map((t) => ({
    id: t.id, attendee_name: t.attendee_name, attendee_email: t.attendee_email,
    tier_name: t.tier_name, status: t.status, coupon_code: couponByOrder.get(t.order_id) ?? null,
  }));

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
          ["Avg order (KSh)", avgOrder.toLocaleString("en-KE")],
          ["Coupons used", String(couponsUsed)],
          ["Discount given (KSh)", discountGiven.toLocaleString("en-KE")],
          ["Platform fee (KSh)", fees.toLocaleString("en-KE")],
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

      {tierRows.length > 0 && (
        <section className="mt-8 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 text-right font-medium">Sold</th>
                <th className="px-4 py-3 text-right font-medium">Revenue (KSh)</th>
                <th className="px-4 py-3 text-right font-medium">Checked in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tierRows.map(([name, r]) => (
                <tr key={name}>
                  <td className="px-4 py-3 font-semibold">{name}</td>
                  <td className="px-4 py-3 text-right">{r.sold}</td>
                  <td className="px-4 py-3 text-right">{r.revenue.toLocaleString("en-KE")}</td>
                  <td className="px-4 py-3 text-right">{r.checkedIn}/{r.sold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <SalesTimeline data={timeline} />

      <DoorCodesPanel eventId={id} initialCodes={doorCodes ?? []} />

      <TierManager eventId={id} initialTiers={initialTiers} />

      <CouponManager eventId={id} initial={initialCoupons} />

      <GuestList guests={guests} />

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
