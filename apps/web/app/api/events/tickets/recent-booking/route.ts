import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

// Returns the timestamp of the most recent PAID order for an event, used for an
// honest "last booked X ago" social-proof line. Returns null when there is no
// paid order — the caller must hide the line rather than fabricate a number.
export async function GET(req: NextRequest) {
  const eventSanityId = req.nextUrl.searchParams.get("eventSanityId")?.trim();
  if (!eventSanityId) return NextResponse.json({ lastBookedAt: null });
  const { data } = await adminClient
    .from("ticket_orders")
    .select("paid_at, created_at")
    .eq("event_sanity_id", eventSanityId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ lastBookedAt: data?.paid_at ?? data?.created_at ?? null });
}
