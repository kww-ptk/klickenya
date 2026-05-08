import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  menu_id: z.string().uuid(),
  enabled: z.boolean(),
  deduct_on: z.enum(["placed", "preparing", "ready", "paid"]).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { menu_id, enabled, deduct_on } = parsed.data;

  const update: Record<string, unknown> = { stock_enabled: enabled };
  if (deduct_on) update.stock_deduct_on = deduct_on;

  const { data, error } = await supabase
    .from("menus")
    .update(update)
    .eq("id", menu_id)
    .eq("business_id", user.id)
    .select("id, stock_enabled, stock_deduct_on")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Forbidden" }, { status: 403 });
  }

  // Bust the cached menu metadata so the next page render sees the new
  // stock_enabled / stock_deduct_on values immediately.
  revalidateTag(`menu:${menu_id}`, "default");

  return NextResponse.json(data);
}
