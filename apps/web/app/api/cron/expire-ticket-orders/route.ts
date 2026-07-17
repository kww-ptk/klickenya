import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import type { OrderLine } from "@/lib/tickets/pricing";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stale } = await adminClient
    .from("ticket_orders")
    .select("id, event_sanity_id, lines")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .limit(200);

  let expired = 0;
  for (const order of stale ?? []) {
    const { data: flipped } = await adminClient
      .from("ticket_orders")
      .update({ status: "expired" })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!flipped) continue;
    const lines = order.lines as OrderLine[];
    await adminClient.rpc("release_event_tickets", {
      p_event_sanity_id: order.event_sanity_id,
      p_lines: lines.map((l) => ({ tier_key: l.tier_key, qty: l.qty })),
    });
    expired++;
  }
  return NextResponse.json({ expired });
}
