import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { resolveManagerApproval, writeAuditLog } from "@/app/api/pos/_lib/managerOverride";

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
      .select(`
        id,
        status,
        table_number,
        customer_name,
        notes,
        total_kes,
        created_at,
        waiter_id,
        order_items (
          id,
          item_name,
          item_price,
          quantity,
          notes,
          selected_options,
          allergy_notes,
          line_total
        )
      `)
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

    const enriched = (orders ?? []).map((o) => ({
      ...o,
      waiter_name: o.waiter_id ? waiterMap.get(o.waiter_id) ?? null : null,
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

const VALID_TRANSITIONS: Record<string, string[]> = {
  new:       ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready:     ["delivered", "cancelled"],
};

const KITCHEN_DRIVING_ROLES: ReadonlySet<string> = new Set(["kitchen", "manager"]);

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const order_id          = body?.order_id;
    const newStatus         = body?.status;
    const reason            = (body?.reason ?? "").toString().trim() || null;
    const managerOverridePin = body?.manager_override_pin ?? null;

    if (!order_id || !newStatus) {
      return NextResponse.json(
        { error: "order_id and status required" },
        { status: 400 }
      );
    }

    // Fetch the order so we can authorise against its menu_id.
    const { data: order } = await adminClient
      .from("orders")
      .select("id, status, menu_id")
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
    const isKitchenDriver =
      auth.type === "owner" || (auth.type === "staff" && KITCHEN_DRIVING_ROLES.has(auth.role));
    if (!isKitchenDriver) {
      const isWaiterCompleting = order.status === "ready" && newStatus === "delivered";
      if (!isWaiterCompleting) {
        return NextResponse.json(
          { error: "Forbidden — only kitchen or manager can drive this transition." },
          { status: 403 },
        );
      }
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
    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${order.status}" to "${newStatus}".` },
        { status: 400 }
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
      await adminClient.from("orders").update({ status: "cancelled" }).eq("id", order_id);
    } else {
      const { error } = await adminClient
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order_id);
      if (error) {
        console.error("[menu/orders PATCH] error:", error);
        return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
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
