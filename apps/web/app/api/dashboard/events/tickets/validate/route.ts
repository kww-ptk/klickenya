import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { TICKET_CODE_RE } from "@/lib/tickets/codes";

const schema = z.object({
  eventSanityId: z.string().min(5).max(120),
  code: z.string().regex(TICKET_CODE_RE),
});

// Ownership mirrors apps/web/app/api/dashboard/events/attendees/{remove,email}/route.ts:
// a host owns the event if the Sanity listing's `hostId` equals their user id,
// OR they have a matching row in events_pending (sanity_event_id + host_id).
// The events_pending check uses the RLS-bound SSR client, exactly like those routes.
async function userOwnsEvent(
  supabase: SupabaseClient,
  userId: string,
  eventSanityId: string,
): Promise<boolean> {
  const hostId = await sanityClient.fetch<string | null>(
    `*[_type == "listing" && _id == $id][0].hostId`,
    { id: eventSanityId },
  );
  if (hostId === userId) return true;

  const { data } = await supabase
    .from("events_pending")
    .select("id")
    .eq("sanity_event_id", eventSanityId)
    .eq("host_id", userId)
    .maybeSingle();
  return !!data;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { eventSanityId, code } = parsed.data;

    if (!(await userOwnsEvent(supabase, user.id, eventSanityId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: ticket } = await adminClient
      .from("tickets")
      .select("id, event_sanity_id, tier_name, attendee_name, status, checked_in_at")
      .eq("code", code)
      .maybeSingle();

    if (!ticket) return NextResponse.json({ result: "invalid" });
    if (ticket.event_sanity_id !== eventSanityId) {
      return NextResponse.json({ result: "wrong_event", tierName: ticket.tier_name });
    }
    if (ticket.status === "cancelled") {
      return NextResponse.json({ result: "cancelled", attendeeName: ticket.attendee_name });
    }
    if (ticket.status === "checked_in") {
      return NextResponse.json({
        result: "already_used",
        attendeeName: ticket.attendee_name,
        checkedInAt: ticket.checked_in_at,
      });
    }

    // Atomic check-in: the .eq("status","issued") guard is the double-scan defense.
    // If a concurrent request already flipped it, this returns no row → already_used.
    const { data: flipped } = await adminClient
      .from("tickets")
      .update({ status: "checked_in", checked_in_at: new Date().toISOString(), checked_in_by: user.id })
      .eq("id", ticket.id)
      .eq("status", "issued")
      .select("id")
      .maybeSingle();
    if (!flipped) {
      return NextResponse.json({ result: "already_used", attendeeName: ticket.attendee_name });
    }

    const { count } = await adminClient
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_sanity_id", eventSanityId)
      .eq("status", "checked_in");

    return NextResponse.json({
      result: "valid",
      attendeeName: ticket.attendee_name,
      tierName: ticket.tier_name,
      checkedInCount: count ?? 1,
    });
  } catch (err) {
    console.error("[validate] error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
