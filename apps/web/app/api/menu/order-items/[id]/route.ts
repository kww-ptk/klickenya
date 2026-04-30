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
 * Body:
 *   { action: "void", reason: string, manager_override_pin?: string }
 *
 * Removes a single line item from a sent order. The line stays in the
 * database (soft-delete) so the audit trail can show what was removed,
 * but is excluded from the bill aggregation in recomputeSessionTotals.
 *
 * Manager-only action — closes the "send steak, void the line, eat the
 * steak" hole. Reason is required and ends up in staff_audit_log.
 *
 * Once an item is voided it can't be un-voided here; that's a deliberate
 * one-way operation. If a waiter voids the wrong item, place a fresh
 * order line for it.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id: itemId } = await ctx.params;

  let body: {
    action?:               string;
    reason?:               string;
    manager_override_pin?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (body.action !== "void") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const reason = (body.reason ?? "").trim();
  if (!reason) {
    return NextResponse.json(
      { error: "Reason required to void an order item" },
      { status: 400 },
    );
  }

  // Resolve the item → its order → menu_id (for auth + audit scope) and
  // the live session id (so we can recompute totals after the void).
  const { data: item } = await adminClient
    .from("order_items")
    .select(`
      id, is_voided,
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

  const { error: updateErr } = await adminClient
    .from("order_items")
    .update({
      is_voided:     true,
      voided_at:     new Date().toISOString(),
      voided_by:     approval.approvingStaffId,
      voided_reason: reason,
    })
    .eq("id", itemId);

  if (updateErr) {
    console.error("[order-items PATCH] error:", updateErr);
    return NextResponse.json({ error: "Failed to void item" }, { status: 500 });
  }

  // Recompute the cached session totals so the bill drops the voided line.
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
    metadata:         { item_id: itemId },
  });

  return NextResponse.json({ success: true });
}
