import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/orders/[id]/cancel — the guest changes their mind.
 *
 * Only while the order is still 'new': once the kitchen has pressed Start
 * preparing, food is being cooked and cancelling is a phone call, not a
 * button. The order UUID is the credential, as on the tracking page — it is
 * unguessable and only ever handed to the person who placed the order.
 *
 * The precondition is in the UPDATE filter: a kitchen accepting at the same
 * moment wins, and the guest is told.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: order } = await adminClient
    .from("orders")
    .select("id, status, order_type")
    .eq("id", id)
    .maybeSingle();

  if (!order || (order.order_type !== "takeaway" && order.order_type !== "delivery")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (order.status !== "new") {
    return NextResponse.json(
      { error: "The kitchen has already started on this order. Call them to change it." },
      { status: 409 },
    );
  }

  const { data: updated, error } = await adminClient
    .from("orders")
    .update({ status: "cancelled", decline_reason: "Cancelled by the customer" })
    .eq("id", id)
    .eq("status", "new")
    .select("id");

  if (error) {
    console.error("[orders/cancel] update failed:", error);
    return NextResponse.json({ error: "Could not cancel the order." }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: "The kitchen has already started on this order. Call them to change it." },
      { status: 409 },
    );
  }

  // Keep the lines in step so the station board and the status trigger agree.
  const { error: cascadeErr } = await adminClient
    .from("order_items")
    .update({ station_status: "cancelled" })
    .eq("order_id", id)
    .eq("is_voided", false)
    .in("station_status", ["new", "preparing", "ready"]);
  if (cascadeErr) {
    console.error("[orders/cancel] cascade failed:", cascadeErr);
  }

  return NextResponse.json({ success: true });
}
