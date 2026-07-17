import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getPaymentProvider } from "@/lib/payments";
import { buildOrderLines, computeTotals, type SanityTier } from "@/lib/tickets/pricing";
import { issueTicketsForOrder } from "@/lib/tickets/issue";

const PENDING_TTL_MINUTES = 20;

const checkoutSchema = z.object({
  eventSanityId: z.string().min(5).max(120),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().max(20).optional(),
  userId: z.string().uuid().optional(),
  tiers: z.array(z.object({ tierKey: z.string().max(60), qty: z.number().int() })).min(1).max(5),
  turnstileToken: z.string().min(1),
});

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // dev fallback, same behavior as /api/contact
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip ?? undefined }),
  });
  const json = await res.json();
  return json?.success === true;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = checkoutSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const body = parsed.data;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return NextResponse.json({ error: "Verification failed — please retry" }, { status: 403 });
    }

    const event = await sanityClient.fetch<{
      title: string; status: string | null; isFree: boolean | null;
      totalCapacity: number | null; eventDate: string | null;
      ticketTypes: SanityTier[] | null;
    } | null>(
      `*[_type == "listing" && _id == $id && type == "event"][0]{
        title, status, isFree, totalCapacity, eventDate,
        ticketTypes[]{_key, name, price, available, isSoldOut}
      }`,
      { id: body.eventSanityId },
    );
    if (!event || event.status !== "published") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.eventDate && new Date(event.eventDate).getTime() < Date.now() - 24 * 3600 * 1000) {
      return NextResponse.json({ error: "This event has ended" }, { status: 410 });
    }

    let lines;
    try {
      lines = event.isFree
        ? buildOrderLines([], body.tiers, { freeEvent: true, capacity: event.totalCapacity ?? null })
        : buildOrderLines(event.ticketTypes ?? [], body.tiers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "BAD_REQUEST";
      const friendly: Record<string, string> = {
        SOLD_OUT: "That ticket type is sold out",
        UNKNOWN_TIER: "Unknown ticket type",
        BAD_QTY: "Invalid quantity",
        DUPLICATE_TIER: "Duplicate ticket type",
      };
      return NextResponse.json({ error: friendly[msg] ?? "Invalid request" }, { status: 400 });
    }

    const feeBps = Number(process.env.PLATFORM_TICKET_FEE_BPS ?? 0);
    const totals = computeTotals(lines, feeBps);
    const isFreeOrder = totals.total_kes === 0;

    const { error: reserveErr } = await adminClient.rpc("reserve_event_tickets", {
      p_event_sanity_id: body.eventSanityId,
      p_lines: lines.map((l) => ({ tier_key: l.tier_key, qty: l.qty, capacity: l.capacity })),
    });
    if (reserveErr) {
      if (reserveErr.message?.includes("SOLD_OUT")) {
        return NextResponse.json({ error: "Sold out — not enough tickets left" }, { status: 409 });
      }
      console.error("[checkout] reserve failed:", reserveErr);
      return NextResponse.json({ error: "Could not reserve tickets" }, { status: 500 });
    }

    const { data: order, error: orderErr } = await adminClient
      .from("ticket_orders")
      .insert({
        event_sanity_id: body.eventSanityId,
        buyer_name: body.name,
        buyer_email: body.email,
        buyer_phone: body.phone ?? null,
        user_id: body.userId ?? null,
        status: isFreeOrder ? "paid" : "pending",
        subtotal_kes: totals.subtotal_kes,
        total_kes: totals.total_kes,
        platform_fee_bps: isFreeOrder ? 0 : feeBps,
        lines,
        provider: isFreeOrder ? "free" : "paystack",
        paid_at: isFreeOrder ? new Date().toISOString() : null,
        expires_at: isFreeOrder
          ? null
          : new Date(Date.now() + PENDING_TTL_MINUTES * 60_000).toISOString(),
      })
      .select("id")
      .single();
    if (orderErr || !order) {
      await adminClient.rpc("release_event_tickets", {
        p_event_sanity_id: body.eventSanityId,
        p_lines: lines.map((l) => ({ tier_key: l.tier_key, qty: l.qty })),
      });
      console.error("[checkout] order insert failed:", orderErr);
      return NextResponse.json({ error: "Could not create order" }, { status: 500 });
    }

    if (isFreeOrder) {
      const tickets = await issueTicketsForOrder(order.id);
      return NextResponse.json({
        orderId: order.id,
        status: "paid",
        tickets: tickets.map((t) => ({ code: t.code, tierName: t.tier_name })),
      });
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klickenya.com";
    const provider = getPaymentProvider("paystack");
    const init = await provider.initialize({
      orderId: order.id,
      amountKes: totals.total_kes,
      email: body.email,
      callbackUrl: `${site}/events/tickets/confirm?order=${order.id}`,
      metadata: { event_sanity_id: body.eventSanityId, event_title: event.title },
    });
    await adminClient
      .from("ticket_orders")
      .update({ provider_ref: init.providerRef })
      .eq("id", order.id);

    return NextResponse.json({ orderId: order.id, status: "pending", checkoutUrl: init.checkoutUrl });
  } catch (err) {
    console.error("[checkout] error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
