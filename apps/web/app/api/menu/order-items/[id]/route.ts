import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { resolveManagerApproval, writeAuditLog } from "@/app/api/pos/_lib/managerOverride";
import { recomputeSessionTotals } from "@/app/api/menu/sessions/_lib/sessions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/menu/order-items/[id]
 *
 * Two actions supported, both manager-only with reason + audit log:
 *
 *   { action: "edit", new_quantity: number, reason: string,
 *     manager_override_pin?: string }
 *     - Reduce the line's quantity (must be 0 ≤ new_quantity < current).
 *       new_quantity = 0 is treated the same as "void" (soft-delete).
 *       Increasing quantity is rejected — for additions, the waiter
 *       should send a new order line through the normal flow.
 *
 *   { action: "void", reason: string, manager_override_pin?: string }
 *     - Soft-delete the whole line (legacy alias for action=edit with
 *       new_quantity=0). Kept for backwards compatibility with any caller
 *       still on the old shape.
 *
 * Either way the line stays in the database (audit trail) — voided lines
 * are excluded from bill aggregation; quantity-reduced lines have
 * line_total recomputed from item_price × new_quantity (+ option
 * modifiers, which we re-derive from selected_options).
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id: itemId } = await ctx.params;

  let body: {
    action?:               string;
    new_quantity?:         number;
    reason?:               string;
    manager_override_pin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action !== "edit" && body.action !== "void") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "Reason required" },
      { status: 400 },
    );
  }

  // Resolve the item → its parent order → menu_id (for auth + audit scope).
  const { data: item } = await adminClient
    .from("order_items")
    .select(`
      id, item_name, item_price, quantity, selected_options, is_voided,
      orders!inner ( id, menu_id, table_session_id )
    `)
    .eq("id", itemId)
    .single();

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const orderJoin = Array.isArray(item.orders) ? item.orders[0] : item.orders;
  if (!orderJoin) return NextResponse.json({ error: "Item has no parent order" }, { status: 500 });

  if (item.is_voided) {
    return NextResponse.json({ error: "Item is already voided" }, { status: 400 });
  }

  const currentQty = Number(item.quantity ?? 0);

  // Resolve target quantity. action=void is sugar for new_quantity=0.
  let nextQty: number;
  if (body.action === "void") {
    nextQty = 0;
  } else {
    if (typeof body.new_quantity !== "number" || !Number.isFinite(body.new_quantity)) {
      return NextResponse.json({ error: "new_quantity required" }, { status: 400 });
    }
    nextQty = Math.max(0, Math.floor(body.new_quantity));
    if (nextQty >= currentQty) {
      return NextResponse.json(
        { error: "new_quantity must be lower than the current quantity" },
        { status: 400 },
      );
    }
  }

  const auth = await getPosOrOwnerAuth(req, orderJoin.menu_id);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actingRole = auth.type === "owner" ? "owner" : auth.role;
  const actingStaffId = auth.type === "staff" ? auth.staffId : null;

  const approval = await resolveManagerApproval({
    actingRole,
    actingStaffId,
    menuId:      orderJoin.menu_id,
    overridePin: body.manager_override_pin,
  });
  if (!approval.ok) {
    return NextResponse.json(
      { error: approval.error, requires_manager: true },
      { status: 403 },
    );
  }

  // Build the update. Going to 0 is a soft-delete (same as void); going to
  // a smaller positive number reduces quantity and recomputes line_total.
  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> =
    nextQty === 0
      ? {
          is_voided:     true,
          voided_at:     nowIso,
          voided_by:     approval.approvingStaffId,
          voided_reason: reason,
        }
      : {
          quantity:   nextQty,
          line_total: deriveLineTotal({
            itemPrice:       Number(item.item_price ?? 0),
            quantity:        nextQty,
            selectedOptions: item.selected_options,
          }),
        };

  const { error: updateErr } = await adminClient
    .from("order_items")
    .update(updates)
    .eq("id", itemId);

  if (updateErr) {
    console.error("[order-items PATCH] error:", updateErr);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }

  if (orderJoin.table_session_id) {
    await recomputeSessionTotals(orderJoin.table_session_id);
  }

  await writeAuditLog({
    menuId:           orderJoin.menu_id,
    actingStaffId,
    approvingStaffId: approval.approvingStaffId,
    action:           "void_order_item",
    targetType:       "order",
    targetId:         orderJoin.id,
    reason,
    metadata: {
      item_id:   itemId,
      item_name: item.item_name,
      from_qty:  currentQty,
      to_qty:    nextQty,
    },
  });

  return NextResponse.json({ success: true, new_quantity: nextQty });
}

/**
 * Recompute line_total from price × qty + option modifiers. Mirrors the
 * formula used at order-placement time; option add-ons are stored on each
 * line so we don't need to re-resolve them from the menu.
 */
function deriveLineTotal(args: {
  itemPrice:       number;
  quantity:        number;
  selectedOptions: unknown;
}): number {
  const opts = Array.isArray(args.selectedOptions) ? args.selectedOptions : [];
  const optionAdds = opts.reduce((s: number, o: unknown) => {
    const r = o as Record<string, unknown>;
    return s + (Number(r.price_modifier ?? r.price_add ?? 0) || 0);
  }, 0);
  const unit = args.itemPrice + optionAdds;
  return Math.round(unit * args.quantity * 100) / 100;
}
