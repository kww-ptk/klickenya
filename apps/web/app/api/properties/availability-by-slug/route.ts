import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * GET /api/properties/availability-by-slug
 * Public endpoint — no auth required.
 * Checks room availability for a listing by its Sanity slug.
 *
 * Params: slug, check_in (YYYY-MM-DD), check_out (YYYY-MM-DD)
 * Returns: { rooms: Record<sanity_room_key | room_name, boolean>, entireProperty: boolean }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");

  if (!slug || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "slug, check_in, and check_out are required" },
      { status: 400 }
    );
  }

  if (checkOut <= checkIn) {
    return NextResponse.json(
      { error: "check_out must be after check_in" },
      { status: 400 }
    );
  }

  // Find the property by listing slug
  const { data: props } = await adminClient
    .from("properties")
    .select("id")
    .eq("listing_slug", slug)
    .eq("is_active", true)
    .limit(1);

  if (!props || props.length === 0) {
    // No PMS linked — return empty (frontend falls back to Sanity)
    return NextResponse.json({ rooms: null, entireProperty: null });
  }

  // Get all active rooms
  const { data: pmsRooms } = await adminClient
    .from("rooms")
    .select("id, name, sanity_room_key, base_price_kes")
    .eq("property_id", props[0].id)
    .eq("is_active", true);

  if (!pmsRooms || pmsRooms.length === 0) {
    return NextResponse.json({ rooms: null, entireProperty: null });
  }

  // Check availability for each room via RPC (security definer — safe for public)
  const results = await Promise.all(
    pmsRooms.map(async (r) => {
      const { data: available } = await adminClient.rpc("is_room_available", {
        p_room_id: r.id,
        p_check_in: checkIn,
        p_check_out: checkOut,
      });
      return {
        name: r.name,
        sanity_room_key: r.sanity_room_key,
        available: available === true,
        price: r.base_price_kes,
      };
    })
  );

  // Build availability map keyed by sanity_room_key (preferred) or name (fallback)
  const rooms: Record<string, { available: boolean; price: number }> = {};
  for (const r of results) {
    const key = r.sanity_room_key ?? r.name;
    rooms[key] = { available: r.available, price: r.price };
  }

  const entireProperty = results.every((r) => r.available);

  // Fetch active fees for this property (public — only expose display fields)
  const { data: feesData } = await adminClient
    .from("property_fees")
    .select("id, name, fee_type, amount, apply_by_default")
    .eq("property_id", props[0].id)
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({ rooms, entireProperty, property_id: props[0].id, fees: feesData ?? [] });
}
