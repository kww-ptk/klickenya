import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

const ALLOWED_FIELDS = new Set([
  "status",
  "internal_notes",
  "guest_notes",
  "guest_email",
  "guest_phone",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  /* --- Auth --- */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* --- Verify ownership: booking → property → owner_id --- */
  const { data: booking } = await adminClient
    .from("bookings")
    .select("id, property_id")
    .eq("id", id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const { data: property } = await adminClient
    .from("properties")
    .select("owner_id")
    .eq("id", booking.property_id)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* --- Filter to allowed fields only --- */
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

  updates.updated_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await adminClient
    .from("bookings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json(
      { error: updateErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ booking: updated });
}
