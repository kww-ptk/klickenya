import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { property_id, name, room_type, max_guests, base_price_kes, description, bed_type, room_size_sqm, amenities, photos } = body;

  if (!property_id || !name || !room_type || !max_guests || !base_price_kes) {
    return NextResponse.json(
      { error: "property_id, name, room_type, max_guests and base_price_kes are required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id, listing_slug")
    .eq("id", property_id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get current max display_order
  const { data: existing } = await adminClient
    .from("rooms")
    .select("display_order")
    .eq("property_id", property_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();

  const displayOrder = existing ? (existing.display_order ?? 0) + 1 : 0;

  const { data: newRoom, error } = await adminClient
    .from("rooms")
    .insert({
      property_id,
      name: name.trim(),
      room_type,
      max_guests: Number(max_guests),
      base_price_kes: Number(base_price_kes),
      description: description?.trim() || null,
      bed_type: bed_type || null,
      room_size_sqm: room_size_sqm ? Number(room_size_sqm) : null,
      amenities: amenities ?? [],
      photos: photos ?? [],
      is_active: true,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (property.listing_slug) {
    revalidatePath(`/stays/${property.listing_slug}`);
  }
  revalidatePath(`/dashboard/property/${property_id}`);

  return NextResponse.json({ room: newRoom }, { status: 201 });
}
