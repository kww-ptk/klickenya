import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { room_id, start_date, end_date, reason } = body;

    if (!room_id || !start_date || !end_date) {
      return NextResponse.json({ error: "room_id, start_date, end_date are required" }, { status: 400 });
    }

    // Verify ownership: room → property → owner
    const { data: room } = await adminClient
      .from("rooms")
      .select("id, property_id")
      .eq("id", room_id)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    const { data: prop } = await adminClient
      .from("properties")
      .select("id, owner_id")
      .eq("id", room.property_id)
      .single();

    if (!prop || prop.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: blocked, error } = await adminClient
      .from("blocked_dates")
      .insert({
        room_id,
        start_date,
        end_date,
        reason: reason ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Block dates error:", error);
      return NextResponse.json({ error: "Failed to block dates" }, { status: 500 });
    }

    return NextResponse.json({ success: true, blocked }, { status: 201 });
  } catch (err) {
    console.error("Block dates error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
