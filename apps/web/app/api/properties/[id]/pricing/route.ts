import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * GET /api/properties/[id]/pricing
 * Query params: room_id, check_in (YYYY-MM-DD), check_out (YYYY-MM-DD)
 *
 * Returns the canonical suggested rate_per_night based on:
 *   1. Highest-priority active pricing rule that overlaps the booking period
 *   2. Weekend multiplier if check-in falls on Fri/Sat/Sun and no rule applies
 *   3. Room base_price_kes as fallback
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room_id");
  const checkIn = searchParams.get("check_in");
  const checkOut = searchParams.get("check_out");

  if (!roomId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "room_id, check_in and check_out are required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: property } = await adminClient
    .from("properties")
    .select("id, owner_id, weekend_multiplier")
    .eq("id", propertyId)
    .single();

  if (!property || property.owner_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch room base price
  const { data: room } = await adminClient
    .from("rooms")
    .select("id, base_price_kes")
    .eq("id", roomId)
    .eq("property_id", propertyId)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Fetch active pricing rules that overlap the booking dates
  // A rule overlaps if: rule.start_date <= check_out AND rule.end_date >= check_in
  const { data: rules } = await adminClient
    .from("pricing_rules")
    .select("id, name, price_type, value, priority")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .lte("start_date", checkOut)
    .gte("end_date", checkIn)
    .order("priority", { ascending: false })
    .limit(1);

  const topRule = rules?.[0] ?? null;
  const basePrice = room.base_price_kes;

  if (topRule) {
    const rate =
      topRule.price_type === "fixed"
        ? topRule.value
        : Math.round(basePrice * topRule.value);

    return NextResponse.json({
      suggested_rate: rate,
      base_rate: basePrice,
      rule: { id: topRule.id, name: topRule.name, type: topRule.price_type, value: topRule.value },
      source: "pricing_rule",
    });
  }

  // No pricing rule — check weekend multiplier
  const weekendMultiplier = property.weekend_multiplier ?? 1.0;
  if (weekendMultiplier > 1) {
    const day = new Date(checkIn + "T00:00:00").getDay(); // 0=Sun,5=Fri,6=Sat
    if (day === 0 || day === 5 || day === 6) {
      return NextResponse.json({
        suggested_rate: Math.round(basePrice * weekendMultiplier),
        base_rate: basePrice,
        rule: null,
        source: "weekend_multiplier",
        multiplier: weekendMultiplier,
      });
    }
  }

  // Fallback: base price
  return NextResponse.json({
    suggested_rate: basePrice,
    base_rate: basePrice,
    rule: null,
    source: "base_price",
  });
}
