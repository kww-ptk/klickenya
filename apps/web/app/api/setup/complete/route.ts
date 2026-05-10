/**
 * POST /api/setup/complete — Step 7 finish: stamp setup_completed_at.
 *
 * Body: { menu_id }
 *
 * Banner stops showing once this is set. Distinct from /api/setup/dismiss
 * (we want analytics on completed-vs-skipped).
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

  const { error } = await adminClient
    .from("menus")
    .update({ setup_completed_at: new Date().toISOString() })
    .eq("id", menu_id);

  if (error) {
    console.error("[setup/complete POST] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
