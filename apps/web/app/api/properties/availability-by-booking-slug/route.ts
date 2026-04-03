import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * GET /api/properties/availability-by-booking-slug
 * Public endpoint for the /b/[slug] booking widget.
 * Accepts either ?slug= (listing_slug) or ?booking_slug= (booking_slug).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listingSlug = searchParams.get("slug");
  const bookingSlug = searchParams.get("booking_slug");
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");

  if ((!listingSlug && !bookingSlug) || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "slug or booking_slug, check_in, and check_out are required" },
      { status: 400 }
    );
  }

  // Find property
  let query = adminClient.from("properties").select("id").eq("is_active", true);
  if (listingSlug) query = query.eq("listing_slug", listingSlug);
  else query = query.eq("booking_slug", bookingSlug);

  const { data: props } = await query.limit(1);
  if (!props || props.length === 0) {
    return NextResponse.json({ rooms: null, entireProperty: null });
  }

  const { data: pmsRooms } = await adminClient
    .from("rooms")
    .select("id, name, sanity_room_key, base_price_kes")
    .eq("property_id", props[0].id)
    .eq("is_active", true);

  if (!pmsRooms || pmsRooms.length === 0) {
    return NextResponse.json({ rooms: null, entireProperty: null });
  }

  const results = await Promise.all(
    pmsRooms.map(async (r) => {
      const { data: available } = await adminClient.rpc("is_room_available", {
        p_room_id: r.id,
        p_check_in: checkIn,
        p_check_out: checkOut,
      });
      return { ...r, available: available === true };
    })
  );

  const rooms: Record<string, { available: boolean; price: number }> = {};
  for (const r of results) {
    const key = r.sanity_room_key ?? r.name;
    rooms[key] = { available: r.available, price: r.base_price_kes };
  }

  return NextResponse.json({
    rooms,
    entireProperty: results.every((r) => r.available),
  });
}
