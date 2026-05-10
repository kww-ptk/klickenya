/**
 * POST /api/setup/waitlist — Step 6 "Notify me" toggle.
 *
 * Body: { menu_id, feature: 'takeaway' | 'delivery', value?: boolean }
 *
 * Toggles takeaway_waitlist or delivery_waitlist. If value is omitted the
 * flag is set to true.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getSetupAuth } from "../_lib/auth";

const COLUMN = {
  takeaway: "takeaway_waitlist",
  delivery: "delivery_waitlist",
} as const;
type Feature = keyof typeof COLUMN;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const menu_id = typeof body.menu_id === "string" ? body.menu_id : null;
  const feature = body.feature as Feature | undefined;
  const value = typeof body.value === "boolean" ? body.value : true;

  if (!menu_id || !feature || !(feature in COLUMN)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { userId, menu } = await getSetupAuth(menu_id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await adminClient
    .from("menus")
    .update({ [COLUMN[feature]]: value })
    .eq("id", menu_id);

  if (error) {
    console.error("[setup/waitlist POST] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, feature, value });
}
