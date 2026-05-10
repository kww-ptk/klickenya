/**
 * POST /api/setup/decline — owner said "no" to a setup step.
 *
 * Body: { menu_id, step: 'reservations' | 'table_ordering' | 'stock' }
 *
 * Sets <step>_decided_at = now() WITHOUT flipping the corresponding flag.
 * The dashboard banner resolver treats "decided_at IS NOT NULL && flag is
 * still false" as "owner has been asked and said no" so it skips this step
 * on subsequent loads.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getSetupAuth } from "../_lib/auth";

const STEPS = ["reservations", "table_ordering", "stock"] as const;
type Step = (typeof STEPS)[number];

const COLUMN: Record<Step, string> = {
  reservations: "reservations_decided_at",
  table_ordering: "table_ordering_decided_at",
  stock: "stock_decided_at",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const menu_id = typeof body.menu_id === "string" ? body.menu_id : null;
  const step = body.step as Step | undefined;
  if (!menu_id || !step || !STEPS.includes(step)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { userId, menu } = await getSetupAuth(menu_id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!menu) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await adminClient
    .from("menus")
    .update({ [COLUMN[step]]: new Date().toISOString() })
    .eq("id", menu_id);

  if (error) {
    console.error("[setup/decline POST] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
