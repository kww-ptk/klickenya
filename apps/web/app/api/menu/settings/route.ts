import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getMenuAuth, verifyMenuAccess } from "../_lib/auth";

/* ── PATCH — update menu settings ──────────────────────────────────
 *
 * Supported fields (all optional, only provided fields are updated):
 *   table_ordering  boolean
 *
 * Also returns open_order_count when table_ordering is being set to false,
 * so the client can warn before confirming.
 */

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { menu_id, table_ordering } = body;

    if (!menu_id) {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    // Verify ownership
    const menu = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!menu) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update payload — only include fields that were provided
    const updates: Record<string, unknown> = {};
    if (typeof table_ordering === "boolean") {
      updates.table_ordering = table_ordering;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    const { error } = await adminClient
      .from("menus")
      .update(updates)
      .eq("id", menu_id);

    if (error) {
      console.error("[menu/settings PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
    }

    // If disabling table ordering, return count of open orders for client warning
    let open_order_count: number | null = null;
    if (table_ordering === false) {
      const { count } = await adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("menu_id", menu_id)
        .in("status", ["new", "preparing"]);
      open_order_count = count ?? 0;
    }

    return NextResponse.json({ success: true, ...updates, open_order_count });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
