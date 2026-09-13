import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { writeAuditLog } from "@/app/api/pos/_lib/managerOverride";
import { recomputeOrderTotals } from "@/lib/orders/totals";
import { recomputeSessionTotals } from "@/app/api/menu/sessions/_lib/sessions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/menu/orders/[id]/items — add a line to an order already placed.
 *
 * The counterpart to PATCH /api/menu/order-items/[id], which can only reduce
 * or void. That route rejects increases and tells the caller to "send a new
 * order line through the normal flow" — which exists for dine-in, where a
 * table session accumulates orders, and does not exist at all for takeaway or
 * delivery. So "the customer called and asked for chips too" had no answer.
 *
 * Prices and names are read from the database and snapshotted here, exactly
 * as POST /api/orders does. Nothing the client says about money is trusted.
 *
 * Not manager-gated. Voiding a line removes food someone paid for and is the
 * classic fraud path, hence the reason + approval on that route; adding a
 * line bills more, which the guest will see on their own tracking page and
 * query immediately. It is audited either way.
 */

const bodySchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  // Option IDs only. Labels and price modifiers come from the database.
  selected_option_ids: z.array(z.string().uuid()).max(30).optional().default([]),
  allergy_notes: z.string().max(500).optional(),
});

function sanitize(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/<[^>]*>/g, "").trim().slice(0, 500);
  return trimmed || null;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id: orderId } = await ctx.params;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: order } = await adminClient
    .from("orders")
    .select("id, menu_id, status, table_session_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // A finished order is a record, not a working document. Reopening one to
  // bill more would be invisible to a guest who has closed their tracking page.
  if (order.status === "delivered" || order.status === "cancelled") {
    return NextResponse.json(
      { error: "This order is closed. Place a new order instead." },
      { status: 400 },
    );
  }

  const auth = await getPosOrOwnerAuth(req, order.menu_id);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The item must belong to THIS menu — otherwise an owner could bill a dish
  // from someone else's restaurant by guessing an id.
  const { data: dbItem } = await adminClient
    .from("menu_items")
    .select("id, name, price_kes, is_available, menu_sections!inner ( menu_id, station )")
    .eq("id", body.menu_item_id)
    .maybeSingle();

  const sectionRaw = (dbItem as unknown as { menu_sections?: unknown } | null)?.menu_sections;
  const section = Array.isArray(sectionRaw) ? sectionRaw[0] : sectionRaw;
  const sectionMenuId = (section as { menu_id?: string } | undefined)?.menu_id;

  if (!dbItem || sectionMenuId !== order.menu_id) {
    return NextResponse.json({ error: "That dish is not on this menu" }, { status: 400 });
  }

  // Option prices come from the database too, and only options that belong to
  // the dish being added are honoured.
  let selectedOptions: { group: string; choice: string; price_add: number }[] = [];
  if (body.selected_option_ids.length > 0) {
    const { data: opts } = await adminClient
      .from("item_options")
      .select("id, name, price_modifier, item_option_groups!inner ( name, menu_item_id )")
      .in("id", body.selected_option_ids);

    selectedOptions = (opts ?? [])
      .map((o) => {
        const gRaw = (o as unknown as { item_option_groups?: unknown }).item_option_groups;
        const g = Array.isArray(gRaw) ? gRaw[0] : gRaw;
        const grp = g as { name?: string; menu_item_id?: string } | undefined;
        if (grp?.menu_item_id !== body.menu_item_id) return null;
        return {
          group: grp?.name ?? "",
          choice: o.name as string,
          price_add: Number(o.price_modifier ?? 0),
        };
      })
      .filter((o): o is { group: string; choice: string; price_add: number } => o !== null);
  }

  const basePrice = Number(dbItem.price_kes ?? 0);
  const optionTotal = selectedOptions.reduce((n, o) => n + o.price_add, 0);
  const lineTotal = (basePrice + optionTotal) * body.quantity;
  const station: "kitchen" | "bar" =
    (section as { station?: string } | undefined)?.station === "bar" ? "bar" : "kitchen";

  const { data: inserted, error: insertErr } = await adminClient
    .from("order_items")
    .insert({
      order_id: orderId,
      menu_item_id: dbItem.id,
      item_name: dbItem.name,      // SNAPSHOT
      item_price: basePrice,       // SNAPSHOT
      quantity: body.quantity,
      selected_options: selectedOptions,
      allergy_notes: sanitize(body.allergy_notes),
      line_total: lineTotal,
      station,
      station_status: "new",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[orders/items POST] insert error:", insertErr);
    return NextResponse.json({ error: "Could not add that item" }, { status: 500 });
  }

  await recomputeOrderTotals(orderId);
  if (order.table_session_id) {
    await recomputeSessionTotals(order.table_session_id);
  }

  await writeAuditLog({
    menuId: order.menu_id,
    actingStaffId: auth.type === "staff" ? auth.staffId : null,
    approvingStaffId: null,
    action: "add_order_item_post_send",
    targetType: "order",
    targetId: orderId,
    reason: "Item added to an order already placed",
    metadata: {
      item_id: inserted.id,
      item_name: dbItem.name,
      quantity: body.quantity,
      line_total: lineTotal,
    },
  });

  return NextResponse.json({ success: true, item_id: inserted.id });
}
