import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { resolveManagerApproval, writeAuditLog } from "@/app/api/pos/_lib/managerOverride";
import { ORDER_QUEUE_SELECT } from "@/lib/orders/projection";
import { canDriveTransition, isTransitionAllowed } from "@/lib/orders/transitions";

/* ── GET — fetch active orders for a menu (kitchen + waiter polling) ── */
//
// Query params:
//   menu_id  — required, UUID of the menu
//   status   — optional, comma-separated subset of "new,preparing,ready".
//              Defaults to all three. Waiter "Ready" tab passes "ready".
//
// Returns orders with the requested statuses, newest first, including their
// order_items. Auth: owner (Supabase) or any staff role with a valid PIN
// cookie scoped to this menu.

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const menuId = searchParams.get("menu_id");

    if (!menuId) {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    const auth = await getPosOrOwnerAuth(req, menuId);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Status filter — defaults to the kitchen-active set. Callers who want
    // only "ready" (waiter Ready tab) pass status=ready.
    const ALLOWED_STATUSES = ["new", "preparing", "ready"] as const;
    const requested = (searchParams.get("status") ?? "new,preparing,ready")
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is (typeof ALLOWED_STATUSES)[number] =>
        (ALLOWED_STATUSES as readonly string[]).includes(s),
      );
    const statuses = requested.length > 0 ? requested : ALLOWED_STATUSES;

    // Fetch active orders with their items
    const { data: orders, error } = await adminClient
      .from("orders")
      .select(ORDER_QUEUE_SELECT)
      .eq("menu_id", menuId)
      .in("status", statuses)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[menu/orders GET] error:", error);
      return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
    }

    // Resolve waiter names in a single follow-up query so the kitchen card can
    // show "Marco" next to waiter-placed orders. Cheap — typically <10 staff.
    const waiterIds = Array.from(
      new Set((orders ?? []).map((o) => o.waiter_id).filter((v): v is string => !!v)),
    );
    const waiterMap = new Map<string, string>();
    if (waiterIds.length > 0) {
      const { data: waiters } = await adminClient
        .from("restaurant_staff")
        .select("id, name")
        .in("id", waiterIds);
      for (const w of waiters ?? []) waiterMap.set(w.id, w.name);
    }

    // Rider names, same follow-up-query shape as waiters above. The kitchen
    // needs to know who is coming, and needs to be able to reach them.
    const riderIds = Array.from(
      new Set((orders ?? []).map((o) => o.rider_id).filter((v): v is string => !!v)),
    );
    const riderMap = new Map<string, { name: string; phone: string }>();
    if (riderIds.length > 0) {
      const { data: riders } = await adminClient
        .from("riders")
        .select("id, name, phone")
        .in("id", riderIds);
      for (const r of riders ?? []) riderMap.set(r.id, { name: r.name, phone: r.phone });
    }

    const enriched = (orders ?? []).map((o) => ({
      ...o,
      waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
      rider_name: o.rider_id ? riderMap.get(o.rider_id)?.name ?? null : null,
      rider_phone: o.rider_id ? riderMap.get(o.rider_id)?.phone ?? null : null,
    }));

    return NextResponse.json({ orders: enriched });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ── PATCH — update order status ────────────────────────────────── */
//
// Body: { order_id: string, status: "preparing" | "ready" | "delivered" | "cancelled" }
//
// Auth: owner OR staff PIN cookie. Role-based authorisation:
//   - kitchen / manager / owner: any valid transition
//   - waiter / cashier:           ready → delivered only (their pickup flow)
//
// Other roles trying ready → delivered are fine because "everyone can complete
// an order" was the explicit product call.

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const order_id          = body?.order_id;
    const newStatus         = body?.status;
    const reason            = (body?.reason ?? "").toString().trim() || null;
    const managerOverridePin = body?.manager_override_pin ?? null;
    const estimatedReadyMinutes = Number(body?.estimated_ready_minutes);

    if (!order_id || !newStatus) {
      return NextResponse.json(
        { error: "order_id and status required" },
        { status: 400 }
      );
    }

    // Fetch the order so we can authorise against its menu_id.
    const { data: order } = await adminClient
      .from("orders")
      .select("id, status, menu_id, order_type, rider_id, picked_up_at")
      .eq("id", order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const auth = await getPosOrOwnerAuth(req, order.menu_id);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role gate: a waiter shouldn't be able to mark a "new" order as
    // "preparing" — that's kitchen territory. Owners and kitchen staff drive
    // the full lifecycle; waiters can only complete ready→delivered.
    const actor =
      auth.type === "owner"
        ? { type: "owner" as const }
        : { type: "staff" as const, role: auth.role };
    if (!canDriveTransition(actor, order.status, newStatus)) {
      return NextResponse.json(
        { error: "Forbidden — only kitchen or manager can drive this transition." },
        { status: 403 },
      );
    }

    // Cancelling an order that's already been sent to the kitchen (status
    // new / preparing / ready → cancelled) is a manager-only action with an
    // audit log entry. This is the "send steak, void it, eat the steak"
    // path — even kitchen staff need a reason on the record.
    let auditEntry: Parameters<typeof writeAuditLog>[0] | null = null;
    if (newStatus === "cancelled" && (order.status === "new" || order.status === "preparing" || order.status === "ready")) {
      if (!reason) {
        return NextResponse.json(
          { error: "Reason required to cancel an order that's been sent to the kitchen" },
          { status: 400 },
        );
      }
      const actingRole = auth.type === "owner" ? "owner" : auth.role;
      const actingStaffId = auth.type === "staff" ? auth.staffId : null;
      const approval = await resolveManagerApproval({
        actingRole,
        actingStaffId,
        menuId:      order.menu_id,
        overridePin: managerOverridePin,
      });
      if (!approval.ok) {
        return NextResponse.json(
          { error: approval.error, requires_manager: true },
          { status: 403 },
        );
      }
      auditEntry = {
        menuId:           order.menu_id,
        actingStaffId,
        approvingStaffId: approval.approvingStaffId,
        action:           "void_order_after_send",
        targetType:       "order",
        targetId:         order_id,
        reason,
        metadata:         { previous_status: order.status },
      };
    }

    // Validate the status transition
    if (!isTransitionAllowed(order.status, newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${order.status}" to "${newStatus}".` },
        { status: 400 }
      );
    }

    // The delivery leg belongs to the rider once one has claimed the job.
    // "Complete" from the counter used to set status='delivered' with no
    // delivered_at and no cash, and left the rider holding a job whose every
    // button answered 400.
    if (order.order_type === "delivery" && order.rider_id && newStatus === "delivered") {
      return NextResponse.json(
        { error: "A rider has this one — they complete it at the door." },
        { status: 409 },
      );
    }

    if (newStatus === "cancelled") {
      // Cascade to non-voided live items so the derive_order_status trigger
      // collapses orders.status to 'cancelled' on its own and stays there
      // even if a stale UI click later mutates an item.
      const { error: itemErr } = await adminClient
        .from("order_items")
        .update({ station_status: "cancelled" })
        .eq("order_id", order_id)
        .eq("is_voided", false)
        .in("station_status", ["new", "preparing", "ready"]);
      if (itemErr) {
        console.error("[menu/orders PATCH cascade] error:", itemErr);
        return NextResponse.json({ error: "Failed to cancel order." }, { status: 500 });
      }
      // Belt-and-braces: if the order has no live items (all voided), the
      // trigger won't fire and orders.status would stay put. Force-set it.
      // Takeaway declines also record the reason for the guest status page.
      await adminClient
        .from("orders")
        .update(
          (order.order_type === "takeaway" || order.order_type === "delivery") && reason
            ? { status: "cancelled", decline_reason: reason }
            : { status: "cancelled" },
        )
        .eq("id", order_id)
        .in("status", ["new", "preparing", "ready"]);
    } else {
      const updatePayload: Record<string, unknown> = { status: newStatus };

      // Whole-order channels. Takeaway and delivery are driven from the
      // queue rather than the station board, so the order row leads and the
      // lines follow: acceptance is stamped here, and station_status is
      // cascaded so the board and the derive_order_status trigger agree.
      // Without the cascade a delivery's lines stayed at 'new' all the way
      // to ready, and voiding one line let the trigger drop the order back
      // to 'new' — taking the handover code off the screen while the rider
      // stood at the counter.
      const isWholeOrder = order.order_type === "takeaway" || order.order_type === "delivery";
      const isAccept = isWholeOrder && order.status === "new" && newStatus === "preparing";

      if (isAccept) {
        updatePayload.accepted_at = new Date().toISOString();
        if (
          Number.isFinite(estimatedReadyMinutes) &&
          estimatedReadyMinutes > 0 &&
          estimatedReadyMinutes <= 240
        ) {
          updatePayload.estimated_ready_at = new Date(
            Date.now() + estimatedReadyMinutes * 60_000,
          ).toISOString();
        }
      }

      // The precondition rides in the write. Four screens hit this route and
      // a stale read must lose, not overwrite.
      const { data: updated, error } = await adminClient
        .from("orders")
        .update(updatePayload)
        .eq("id", order_id)
        .eq("status", order.status)
        .select("id");
      if (error) {
        console.error("[menu/orders PATCH] error:", error);
        return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
      }
      if (!updated || updated.length === 0) {
        return NextResponse.json(
          { error: "This order changed on another screen. Refresh and try again." },
          { status: 409 },
        );
      }

      if (
        isWholeOrder &&
        (newStatus === "preparing" || newStatus === "ready" || newStatus === "delivered")
      ) {
        const from =
          newStatus === "preparing"
            ? ["new"]
            : newStatus === "ready"
            ? ["new", "preparing"]
            : ["new", "preparing", "ready"];
        const { error: cascadeErr } = await adminClient
          .from("order_items")
          .update({ station_status: newStatus })
          .eq("order_id", order_id)
          .eq("is_voided", false)
          .in("station_status", from);
        if (cascadeErr) {
          console.error("[menu/orders PATCH cascade] error:", cascadeErr);
        }
      }
    }

    if (auditEntry) {
      await writeAuditLog(auditEntry);
    }

    return NextResponse.json({ success: true, order_id, status: newStatus });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
