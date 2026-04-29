import { NextRequest, NextResponse } from "next/server";
import { getPosOrOwnerAuth } from "@/app/api/pos/_lib/auth";
import { loadFullBillForSession, getMenuIdForSession } from "../../_lib/sessions";
import { renderBillPdf } from "../../_lib/billPdf";
import { formatNairobiDate } from "@/lib/pos/bill";

// jsPDF allocates Buffers — keep this on Node, not Edge.
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const menuId = await getMenuIdForSession(id);
  if (!menuId) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const auth = await getPosOrOwnerAuth(req, menuId);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const full = await loadFullBillForSession(id);
  if (!full) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const pdf = await renderBillPdf(full);

  const datePart = formatNairobiDate(full.opened_at).replace(/\s+/g, "-");
  const restoSlug = full.restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `receipt-${restoSlug}-${datePart}-table-${full.table_number}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control":       "private, no-store",
    },
  });
}
