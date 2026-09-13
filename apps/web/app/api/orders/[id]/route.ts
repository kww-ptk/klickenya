import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ── GET — public takeaway order status (guest polling) ──────────────
   The unguessable order UUID is the access token. Minimal projection:
   never lists orders, never exposes another guest's data. Dine-in orders
   404 so this endpoint can't be used to probe them. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: order } = await adminClient
      .from("orders")
      .select(`
        id, menu_id, order_type, status, created_at,
        accepted_at, estimated_ready_at, decline_reason, total_kes,
        delivery_address,
        order_items ( item_name, quantity, line_total, is_voided )
      `)
      .eq("id", id)
      .single();

    // Delivery uses the same accept/decline/ready lifecycle as takeaway, so it
    // gets the same public status page. Dine-in does not — a seated guest has
    // a waiter, not a tracking link.
    if (!order || (order.order_type !== "takeaway" && order.order_type !== "delivery")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: menu } = await adminClient
      .from("menus")
      .select("name, slug")
      .eq("id", order.menu_id)
      .single();

    return NextResponse.json({
      order: {
        id:                 order.id,
        short_id:           order.id.slice(0, 8).toUpperCase(),
        // The page reads very differently for a delivery than a pickup —
        // "Ready for pickup!" is wrong when a rider is on the way.
        order_type:         order.order_type,
        delivery_address:   order.delivery_address ?? null,
        status:             order.status,
        created_at:         order.created_at,
        accepted_at:        order.accepted_at,
        estimated_ready_at: order.estimated_ready_at,
        decline_reason:     order.decline_reason,
        total_kes:          order.total_kes,
        items: (order.order_items ?? [])
          .filter((i) => !i.is_voided)
          .map((i) => ({
            name:       i.item_name,
            quantity:   i.quantity,
            line_total: i.line_total,
          })),
        restaurant: { name: menu?.name ?? "", slug: menu?.slug ?? "" },
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
