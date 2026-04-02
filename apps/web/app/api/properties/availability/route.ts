import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");

  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "room_id, check_in, and check_out are required" },
      { status: 400 }
    );
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    return NextResponse.json(
      { error: "Dates must be YYYY-MM-DD format" },
      { status: 400 }
    );
  }

  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "check_out must be after check_in" },
      { status: 400 }
    );
  }

  // Call the Postgres function
  const { data: result, error: rpcErr } = await adminClient.rpc(
    "is_room_available",
    { p_room_id: roomId, p_check_in: checkIn, p_check_out: checkOut }
  );

  if (rpcErr) {
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }

  const available = result === true;

  if (available) {
    return NextResponse.json({ available: true });
  }

  // Not available — find the conflicting booking
  const { data: conflict } = await adminClient
    .from("bookings")
    .select("id, guest_name, check_in_date, check_out_date, source")
    .eq("room_id", roomId)
    .neq("status", "cancelled")
    .lt("check_in_date", checkOut)
    .gt("check_out_date", checkIn)
    .limit(1)
    .single();

  // Also check blocked dates
  if (!conflict) {
    const { data: block } = await adminClient
      .from("blocked_dates")
      .select("id, start_date, end_date, reason")
      .eq("room_id", roomId)
      .lt("start_date", checkOut)
      .gt("end_date", checkIn)
      .limit(1)
      .single();

    return NextResponse.json({
      available: false,
      blocked: block
        ? {
            start_date: block.start_date,
            end_date: block.end_date,
            reason: block.reason,
          }
        : undefined,
    });
  }

  return NextResponse.json({
    available: false,
    conflict: {
      id: conflict.id,
      guest_name: conflict.guest_name,
      check_in_date: conflict.check_in_date,
      check_out_date: conflict.check_out_date,
      source: conflict.source,
    },
  });
}
