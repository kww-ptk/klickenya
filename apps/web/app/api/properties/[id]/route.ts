import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = new Set([
  "name",
  "property_type",
  "check_in_time",
  "check_out_time",
  "min_stay_nights",
  "is_active",
  "address",
  "city",
  "listing_slug",
  "is_entire_property",
  "renting_type",
  "entire_place_price",
  "booking_slug",
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

  // Verify ownership
  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id")
    .eq("id", id)
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
    .from("properties")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (updated.listing_slug) {
    revalidatePath(`/stays/${updated.listing_slug}`);
  }
  revalidatePath(`/dashboard/property/${id}`);

  return NextResponse.json({ property: updated });
}
