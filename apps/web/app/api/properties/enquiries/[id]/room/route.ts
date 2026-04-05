import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const newRoomId: string | undefined = body.room_id;
    if (!newRoomId) return NextResponse.json({ error: "room_id is required" }, { status: 400 });

    // Fetch enquiry
    const { data: enquiry, error: eErr } = await adminClient
      .from("contact_requests")
      .select("id, property_id, calendar_status")
      .eq("id", id)
      .single();

    if (eErr || !enquiry) return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });

    // Verify ownership
    const { data: prop } = await adminClient
      .from("properties")
      .select("id, owner_id")
      .eq("id", enquiry.property_id)
      .single();

    if (!prop || prop.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify the new room belongs to the same property
    const { data: room } = await adminClient
      .from("rooms")
      .select("id, property_id")
      .eq("id", newRoomId)
      .eq("property_id", enquiry.property_id)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found or does not belong to this property" }, { status: 400 });
    }

    // Update room_id
    const { data: updated, error: uErr } = await adminClient
      .from("contact_requests")
      .update({ room_id: newRoomId })
      .eq("id", id)
      .select("id, full_name, email, phone, room_id, check_in, check_out, guests, calendar_status, expires_at, listing_title, notes, property_id")
      .single();

    if (uErr || !updated) {
      return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
    }

    return NextResponse.json({ success: true, enquiry: updated });
  } catch (err) {
    console.error("Move enquiry room error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
