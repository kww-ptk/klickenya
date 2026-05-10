/**
 * POST /api/setup/stock — Step 5 "yes": flip stock_enabled on.
 *
 * Body: { menu_id }
 *
 * Sets stock_enabled = true and stock_decided_at = now(). The wizard then
 * routes the owner to the existing /dashboard/menu/[id]/stock surface to
 * start adding ingredients.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getSetupAuth } from "../_lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const menu_id = typeof body.menu_id === "string" ? body.menu_id : null;
  if (!menu_id) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { userId, menu } = await getSetupAuth(menu_id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Server-side precondition: stock tracking is anchored to recipes which
  // attach to menu_items. Without a published menu there's nothing real to
  // attach recipes to, and the kitchen reports come up empty. Block at the
  // route layer the same way table-ordering and reservations do.
  if (!menu.is_published) {
    return NextResponse.json(
      { error: "menu_not_published", message: "Publish your menu before turning on Klickenya Kitchen." },
      { status: 400 },
    );
  }

  const { error } = await adminClient
    .from("menus")
    .update({
      stock_enabled: true,
      stock_decided_at: new Date().toISOString(),
    })
    .eq("id", menu_id);

  if (error) {
    console.error("[setup/stock POST] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
