import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  // V0.1 only supports cancelling a PO from the detail page. Marking as
  // sent is exposed via /receive when received; editing line items is
  // out of scope.
  status: z.enum(["cancelled", "sent"]).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing PO id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (parsed.data.status === "cancelled") {
    update.status = "cancelled";
  } else if (parsed.data.status === "sent") {
    update.status = "sent";
    update.ordered_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(update)
    .eq("id", id)
    .eq("business_id", user.id)
    .select("id, status, ordered_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
