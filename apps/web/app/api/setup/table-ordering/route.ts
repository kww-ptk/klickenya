/**
 * POST /api/setup/table-ordering — Step 3 "yes": flip table_ordering on.
 *
 * Body: { menu_id }
 *
 * Sets table_ordering = true and table_ordering_decided_at = now().
 * Hard precondition: menu must be published (mirrors the wizard UI guard).
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

  if (!menu.is_published) {
    return NextResponse.json(
      { error: "menu_not_published", message: "Publish your menu before turning on table ordering." },
      { status: 400 },
    );
  }

  const { error } = await adminClient
    .from("menus")
    .update({
      table_ordering: true,
      table_ordering_decided_at: new Date().toISOString(),
    })
    .eq("id", menu_id);

  if (error) {
    console.error("[setup/table-ordering POST] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
