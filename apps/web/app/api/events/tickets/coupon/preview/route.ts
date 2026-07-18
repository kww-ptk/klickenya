import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { buildOrderLines, computeTotals, type SanityTier } from "@/lib/tickets/pricing";
import { applyCoupon, couponError, type Coupon } from "@/lib/tickets/coupon";

// Per-instance in-memory limiter — a stopgap (resets on cold start, not shared
// across instances). Adequate for a low-QPS preview lookup, same pattern as door redeem.
const attempts = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const r = attempts.get(ip);
  if (!r || now > r.resetAt) { attempts.set(ip, { count: 1, resetAt: now + 5 * 60_000 }); return false; }
  r.count++;
  return r.count > 20;
}

const schema = z.object({
  eventSanityId: z.string().min(5).max(120),
  code: z.string().trim().toUpperCase().min(1).max(40),
  tiers: z.array(z.object({ tierKey: z.string().max(60), qty: z.number().int() })).min(1).max(5),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { eventSanityId, code, tiers } = parsed.data;

  const event = await sanityClient.fetch<{ isFree: boolean | null; totalCapacity: number | null; ticketTypes: SanityTier[] | null } | null>(
    `*[_type == "listing" && _id == $id && type == "event"][0]{ isFree, totalCapacity, ticketTypes[]{_key, name, price, available, isSoldOut} }`,
    { id: eventSanityId },
  );
  if (!event || event.isFree) return NextResponse.json({ error: "No discount available" }, { status: 400 });

  let lines;
  try {
    lines = buildOrderLines(event.ticketTypes ?? [], tiers);
  } catch {
    return NextResponse.json({ error: "Invalid tickets" }, { status: 400 });
  }
  const subtotal = computeTotals(lines, 0).subtotal_kes;

  const { data: coupon } = await adminClient
    .from("event_coupons")
    .select("id, event_sanity_id, discount_type, discount_value, expires_at, active")
    .eq("event_sanity_id", eventSanityId)
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid code" });

  const err = couponError(coupon as Coupon, { now: new Date(), eventSanityId });
  if (err) return NextResponse.json({ valid: false, error: err === "expired" ? "Code expired" : "Invalid code" });

  const { discount_kes, total_kes } = applyCoupon(subtotal, coupon as Coupon);
  return NextResponse.json({ valid: true, discount_kes, total_kes });
}
