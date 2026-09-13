import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getRiderSession } from "@/lib/rider/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/rider/jobs/[id] — the three steps of a delivery.
 *
 *   { action: "accept" }
 *     Claim it and start riding. Allowed while the food is still cooking, so
 *     the journey overlaps the cooking instead of following it.
 *
 *   { action: "pickup" }
 *     Confirm they have the food. Requires status='ready' — a rider cannot
 *     collect something the kitchen has not finished.
 *
 *   { action: "deliver", cash_collected_kes?: number }
 *     Finish it. Sets status='delivered', which the existing stock and
 *     reporting triggers already key on (062, 063).
 *
 * Accept and pickup are separate on purpose. Collapsed into one tap, a rider
 * could not reserve a job while travelling, so two riders would set off for
 * the same order and one would arrive to find it gone.
 *
 * The claim is guarded by matching rider_id IS NULL inside the UPDATE, not by
 * a read-then-write. Two riders tapping the same job at the same moment is
 * the expected case on a shared list, and the loser must be told rather than
 * silently overwriting the winner.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const session = getRiderSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { action?: string; cash_collected_kes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: order } = await adminClient
    .from("orders")
    .select("id, menu_id, status, order_type, rider_id, rider_accepted_at, picked_up_at, total_kes")
    .eq("id", id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Scope: a rider may only touch orders at kitchens they are linked to.
  const { data: link } = await adminClient
    .from("rider_menus")
    .select("menu_id")
    .eq("rider_id", session.rider_id)
    .eq("menu_id", order.menu_id)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ error: "Not your restaurant" }, { status: 403 });
  }

  if (body.action === "accept") {
    if (order.order_type !== "delivery") {
      return NextResponse.json({ error: "Not a delivery order" }, { status: 400 });
    }
    if (order.status !== "preparing" && order.status !== "ready") {
      return NextResponse.json(
        { error: "The kitchen hasn't started this one yet." },
        { status: 400 },
      );
    }

    // Atomic claim: the filter is part of the write, so the second rider
    // updates zero rows and is told, instead of stealing the job.
    const { data: claimed } = await adminClient
      .from("orders")
      .update({ rider_id: session.rider_id, rider_accepted_at: new Date().toISOString() })
      .eq("id", id)
      .is("rider_id", null)
      .select("id");

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: "Another rider just took this one." },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, action: "accept" });
  }

  if (body.action === "pickup") {
    if (order.rider_id !== session.rider_id) {
      return NextResponse.json({ error: "This isn't your delivery." }, { status: 403 });
    }
    if (order.status !== "ready") {
      return NextResponse.json(
        { error: "The kitchen hasn't finished cooking this yet." },
        { status: 400 },
      );
    }
    const { error } = await adminClient
      .from("orders")
      .update({ picked_up_at: new Date().toISOString() })
      .eq("id", id)
      .eq("rider_id", session.rider_id);

    if (error) {
      console.error("[rider/jobs PATCH pickup]", error);
      return NextResponse.json({ error: "Could not update that." }, { status: 500 });
    }
    return NextResponse.json({ success: true, action: "pickup" });
  }

  if (body.action === "deliver") {
    if (order.rider_id !== session.rider_id) {
      return NextResponse.json({ error: "This isn't your delivery." }, { status: 403 });
    }
    if (!order.picked_up_at) {
      return NextResponse.json({ error: "Pick it up first." }, { status: 400 });
    }

    const cash =
      typeof body.cash_collected_kes === "number" && body.cash_collected_kes >= 0
        ? body.cash_collected_kes
        : null;

    const { error } = await adminClient
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        cash_collected_kes: cash,
      })
      .eq("id", id)
      .eq("rider_id", session.rider_id);

    if (error) {
      console.error("[rider/jobs PATCH deliver]", error);
      return NextResponse.json({ error: "Could not complete that." }, { status: 500 });
    }
    return NextResponse.json({ success: true, action: "deliver" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
