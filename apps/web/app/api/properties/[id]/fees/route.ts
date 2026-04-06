import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id")
    .eq("id", propertyId)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: fees } = await adminClient
    .from("property_fees")
    .select("id, name, fee_type, amount, apply_by_default, is_active, sort_order")
    .eq("property_id", propertyId)
    .order("sort_order");

  return NextResponse.json({ fees: fees ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id")
    .eq("id", propertyId)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, fee_type, amount, apply_by_default, sort_order } = body;

  if (!name || !fee_type || amount == null) {
    return NextResponse.json({ error: "name, fee_type and amount are required" }, { status: 400 });
  }

  const { data: fee, error } = await adminClient
    .from("property_fees")
    .insert({
      property_id: propertyId,
      name: name.trim(),
      fee_type,
      amount: Number(amount),
      apply_by_default: apply_by_default ?? true,
      is_active: true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ fee }, { status: 201 });
}
