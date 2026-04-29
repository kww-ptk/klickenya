import { NextRequest, NextResponse } from "next/server";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { loadFullBillForSession, getMenuIdForSession } from "../../_lib/sessions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/menu/sessions/[id]/receipt — JSON receipt.
 * Uses the same computeBill() output as the PDF and HTML print page so all
 * three render identical numbers.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const menuId = await getMenuIdForSession(id);
  if (!menuId) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const auth = await getPosOrOwnerAuth(req, menuId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = await loadFullBillForSession(id);
  if (!full) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  return NextResponse.json(full);
}
