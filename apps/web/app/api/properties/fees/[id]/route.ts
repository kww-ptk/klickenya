import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

async function getOwnedFee(feeId: string, userId: string) {
  const { data: fee } = await adminClient
    .from("property_fees")
    .select("id, property_id")
    .eq("id", feeId)
    .single();

  if (!fee) return null;

  const { data: property } = await adminClient
    .from("properties")
    .select("owner_id")
    .eq("id", fee.property_id)
    .single();

  if (!property || property.owner_id !== userId) return null;
  return fee;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fee = await getOwnedFee(id, user.id);
  if (!fee) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const allowed = new Set(["name", "fee_type", "amount", "apply_by_default", "is_active", "sort_order"]);
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed.has(k)) updates[k] = v;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data: updated, error } = await adminClient
    .from("property_fees")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fee: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fee = await getOwnedFee(id, user.id);
  if (!fee) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await adminClient.from("property_fees").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
