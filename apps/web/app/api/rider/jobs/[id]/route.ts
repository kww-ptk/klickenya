import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getRiderSession } from "@/lib/rider/auth";
import { menusForRider } from "@/lib/rider/scope";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Wrong handover codes before pickup locks for PICKUP_LOCK_MINUTES. */
const MAX_PICKUP_ATTEMPTS = 5;
const PICKUP_LOCK_MINUTES = 15;

/**
 * PATCH /api/rider/jobs/[id] — the steps of a delivery.
 *
 *   { action: "accept" }
 *     Claim it and start riding. Allowed while the food is still cooking, so
 *     the journey overlaps the cooking instead of following it.
 *
 *   { action: "release" }
 *     Hand it back before pickup — a puncture, a wrong turn, a shift that
 *     ends. The job returns to the shared list. Not allowed once they have
 *     the food: at that point the order is in their hands, literally.
 *
 *   { action: "pickup", pickup_code: "1234" }
 *     Confirm they have the food. Requires status='ready' — a rider cannot
 *     collect something the kitchen has not finished — and the handover code
 *     the kitchen reads out. Five wrong codes lock this step for fifteen
 *     minutes: without that, the code was 9,000 guesses from a script.
 *
 *   { action: "deliver", cash_collected_kes?: number }
 *     Finish it. Sets status='delivered', which the existing stock and
 *     reporting triggers already key on (062, 063). Only from 'ready' and
 *     only once — a cancelled order cannot be "delivered" back to life, and
 *     a settled one cannot have its cash rewritten.
 *
 * Every write carries its precondition in the UPDATE filter rather than in a
 * read-then-write. Two riders tapping the same job, or a kitchen cancelling
 * while a rider taps Delivered, is the expected case on a shared list, and
 * the loser must be told rather than silently overwriting the winner.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const session = getRiderSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { action?: string; cash_collected_kes?: number; pickup_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: order } = await adminClient
    .from("orders")
    .select(
      "id, menu_id, status, order_type, rider_id, rider_accepted_at, picked_up_at, delivered_at, total_kes, pickup_code",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Scope: a rider may only touch orders at kitchens they can work. Resolved
  // through the same helper the job list uses, so the list and the actions
  // can never disagree about what a rider is allowed to do.
  const allowed = await menusForRider(session.rider_id);
  if (!allowed || !allowed.includes(order.menu_id)) {
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

    // Atomic claim: the filters are part of the write, so the second rider
    // updates zero rows and is told, instead of stealing the job — and a
    // cancellation that landed between the read and this write is respected.
    const { data: claimed } = await adminClient
      .from("orders")
      .update({ rider_id: session.rider_id, rider_accepted_at: new Date().toISOString() })
      .eq("id", id)
      .is("rider_id", null)
      .in("status", ["preparing", "ready"])
      .select("id");

    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: "Another rider just took this one, or the kitchen cancelled it." },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, action: "accept" });
  }

  if (body.action === "release") {
    if (order.rider_id !== session.rider_id) {
      return NextResponse.json({ error: "This isn't your delivery." }, { status: 403 });
    }
    if (order.picked_up_at) {
      return NextResponse.json(
        { error: "You already have the food — call the restaurant if you can't finish this." },
        { status: 400 },
      );
    }
    const { error } = await adminClient
      .from("orders")
      .update({ rider_id: null, rider_accepted_at: null })
      .eq("id", id)
      .eq("rider_id", session.rider_id)
      .is("picked_up_at", null);
    if (error) {
      console.error("[rider/jobs PATCH release]", error);
      return NextResponse.json({ error: "Could not hand that back." }, { status: 500 });
    }
    return NextResponse.json({ success: true, action: "release" });
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

    // Lock state is read on its own so a database without migration 093
    // degrades to "no lock" rather than failing the whole select.
    let lock: { pickup_attempts: number | null; pickup_locked_until: string | null } | null = null;
    {
      const { data, error } = await adminClient
        .from("orders")
        .select("pickup_attempts, pickup_locked_until")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        console.warn("[rider/jobs PATCH pickup] lock columns unavailable (093 not applied?):", error.message);
      } else {
        lock = data;
      }
    }
    if (lock?.pickup_locked_until && new Date(lock.pickup_locked_until) > new Date()) {
      return NextResponse.json(
        {
          error: `Too many wrong codes. Ask the kitchen to check the order on their screen, then try again in ${PICKUP_LOCK_MINUTES} minutes.`,
        },
        { status: 429 },
      );
    }

    // Orders placed before 090 have no code. Requiring one would strand them
    // forever, so an absent code means no check — a missing code is not a
    // wrong code.
    if (order.pickup_code) {
      const given = String(body.pickup_code ?? "").trim();
      if (given !== order.pickup_code) {
        if (lock) {
          const attempts = (lock.pickup_attempts ?? 0) + 1;
          const locking = attempts >= MAX_PICKUP_ATTEMPTS;
          await adminClient
            .from("orders")
            .update({
              pickup_attempts: locking ? 0 : attempts,
              pickup_locked_until: locking
                ? new Date(Date.now() + PICKUP_LOCK_MINUTES * 60_000).toISOString()
                : null,
            })
            .eq("id", id);
        }
        return NextResponse.json(
          { error: "That code doesn't match. Ask the kitchen to read it again." },
          { status: 400 },
        );
      }
    }

    const update: Record<string, unknown> = { picked_up_at: new Date().toISOString() };
    if (lock) {
      update.pickup_attempts = 0;
      update.pickup_locked_until = null;
    }
    const { error } = await adminClient
      .from("orders")
      .update(update)
      .eq("id", id)
      .eq("rider_id", session.rider_id)
      .eq("status", "ready");

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
    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "The restaurant cancelled this order. Take the food back to them." },
        { status: 409 },
      );
    }
    if (order.status !== "ready" || order.delivered_at) {
      return NextResponse.json({ error: "This order is already closed." }, { status: 409 });
    }

    const cash =
      typeof body.cash_collected_kes === "number" && body.cash_collected_kes >= 0
        ? body.cash_collected_kes
        : null;

    const { data: done, error } = await adminClient
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        cash_collected_kes: cash,
      })
      .eq("id", id)
      .eq("rider_id", session.rider_id)
      .eq("status", "ready")
      .is("delivered_at", null)
      .select("id");

    if (error) {
      console.error("[rider/jobs PATCH deliver]", error);
      return NextResponse.json({ error: "Could not complete that." }, { status: 500 });
    }
    if (!done || done.length === 0) {
      return NextResponse.json(
        { error: "This order changed on another screen. Refresh and check it." },
        { status: 409 },
      );
    }

    // Keep the lines in step with the order so the station board and the
    // derive_order_status trigger agree. Best-effort: the order is already
    // delivered and the trigger's terminal safeguard will not move it back.
    const { error: cascadeErr } = await adminClient
      .from("order_items")
      .update({ station_status: "delivered" })
      .eq("order_id", id)
      .eq("is_voided", false)
      .in("station_status", ["new", "preparing", "ready"]);
    if (cascadeErr) {
      console.error("[rider/jobs PATCH deliver cascade]", cascadeErr);
    }

    return NextResponse.json({ success: true, action: "deliver" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
