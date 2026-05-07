import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  lines: z
    .array(
      z.object({
        po_item_id: z.string().uuid(),
        qty_received: z.coerce.number().min(0),
      }),
    )
    .min(1),
  // The owner must have already seen + confirmed the price-change modal
  // client-side. We don't auto-roll cost_per_unit unless this is true.
  update_costs: z.boolean().default(false),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id: poId } = await ctx.params;
  if (!poId) return NextResponse.json({ error: "Missing PO id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.issues }, { status: 400 });
  }

  // Defer all atomicity to the RPC. The function:
  //   - re-checks ownership (auth.uid() vs business_id) and current status
  //   - upserts qty_received per line
  //   - inserts stock_movements (the existing trigger lifts on_hand)
  //   - optionally rolls forward ingredients.cost_per_unit
  //   - flips the PO status to 'received' or 'partial' and caches received_total
  // All in a single Postgres transaction. If anything throws the whole
  // thing rolls back, so the worst case the client sees is an error toast
  // and the PO untouched.
  const { data, error } = await supabase.rpc("fn_receive_purchase_order", {
    p_po_id: poId,
    p_lines: parsed.data.lines,
    p_update_costs: parsed.data.update_costs,
  });

  if (error) {
    // Surface RPC RAISE EXCEPTIONs ('forbidden', 'cannot receive a X PO'…)
    // so the UI can show a useful message.
    const code = /forbidden/i.test(error.message)
      ? 403
      : /cannot receive/i.test(error.message)
        ? 409
        : 500;
    return NextResponse.json({ error: error.message }, { status: code });
  }

  // RPC returns table → array of one row.
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json(result ?? { ok: true });
}
