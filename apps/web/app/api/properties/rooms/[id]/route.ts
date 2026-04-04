import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = new Set([
  "name",
  "room_number",
  "room_type",
  "bed_type",
  "room_size_sqm",
  "max_guests",
  "base_price_kes",
  "description",
  "amenities",
  "photos",
  "is_active",
  "display_order",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify room belongs to a property owned by this user
  const { data: room } = await adminClient
    .from("rooms")
    .select("id, property_id")
    .eq("id", id)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id, listing_slug")
    .eq("id", room.property_id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const { data: updated, error: updateErr } = await adminClient
    .from("rooms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (property.listing_slug) {
    revalidatePath(`/stays/${property.listing_slug}`);
  }
  revalidatePath(`/dashboard/property/${property.id}`);

  return NextResponse.json({ room: updated });
}
