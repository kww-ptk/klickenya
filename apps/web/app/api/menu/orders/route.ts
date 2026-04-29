import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "../_lib/auth";

/* ── GET — fetch active orders for a menu (kitchen polling) ─────── */
//
// Query params:
//   menu_id  — required, UUID of the menu
//
// Returns orders with status in (new, preparing, ready), newest first,
// including their order_items.

export async function GET(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const menuId = searchParams.get("menu_id");

    if (!menuId) {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    // Verify the caller owns this menu (or is admin)
    const menu = await verifyMenuAccess(supabase, menuId, userId, isAdmin);
    if (!menu) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      .in("status", ["new", "preparing", "ready"])
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
// The caller must own the menu that the order belongs to.

const VALID_TRANSITIONS: Record<string, string[]> = {
  new:       ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready:     ["delivered", "cancelled"],
};

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { order_id, status: newStatus } = await req.json();

    if (!order_id || !newStatus) {
      return NextResponse.json(
        { error: "order_id and status required" },
        { status: 400 }
      );
    }

    // Fetch the order to verify ownership and current status
    const { data: order } = await adminClient
      .from("orders")
      .select("id, status, menu_id")
      .eq("id", order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Verify caller owns the menu
    const menu = await verifyMenuAccess(supabase, order.menu_id, userId, isAdmin);
    if (!menu) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate the status transition
    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${order.status}" to "${newStatus}".` },
        { status: 400 }
      );
    }

    const { error } = await adminClient
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order_id);

    if (error) {
      console.error("[menu/orders PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
    }

    return NextResponse.json({ success: true, order_id, status: newStatus });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
