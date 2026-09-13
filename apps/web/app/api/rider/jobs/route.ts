import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getRiderSession } from "@/lib/rider/auth";

/**
 * GET /api/rider/jobs — everything this rider should be looking at.
 *
 * Two lists:
 *   mine      already picked up, not yet delivered — the job in hand
 *   available ready for collection and unclaimed, at kitchens they serve
 *
 * "Out for delivery" is derived from picked_up_at, not stored as a status —
 * see migration 088 for why adding an enum value would have broken the
 * margin report for every order in flight.
 *
 * No dispatch, deliberately. A shared list that the nearest rider claims
 * first beats an assignment algorithm at this size, and has far less to go
 * wrong.
 */

const JOB_SELECT = `
  id, status, order_type, customer_name, customer_phone,
  delivery_address, delivery_lat, delivery_lng,
  total_kes, created_at, picked_up_at, rider_id, menu_id,
  order_items ( id, item_name, quantity, is_voided )
`;

export async function GET(req: NextRequest) {
  const session = getRiderSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Which kitchens is this rider allowed to see at all?
  const { data: links } = await adminClient
    .from("rider_menus")
    .select("menu_id")
    .eq("rider_id", session.rider_id);

  const menuIds = (links ?? []).map((l) => l.menu_id as string);
  if (menuIds.length === 0) {
    return NextResponse.json({ mine: [], available: [], restaurants: {} });
  }

  const [{ data: mineRows }, { data: availableRows }] = await Promise.all([
    adminClient
      .from("orders")
      .select(JOB_SELECT)
      .eq("rider_id", session.rider_id)
      .is("delivered_at", null)
      .not("picked_up_at", "is", null)
      .order("picked_up_at", { ascending: true }),
    adminClient
      .from("orders")
      .select(JOB_SELECT)
      .in("menu_id", menuIds)
      .eq("order_type", "delivery")
      .eq("status", "ready")
      .is("picked_up_at", null)
      .is("rider_id", null)
      .order("created_at", { ascending: true }),
  ]);

  // Restaurant names, so the rider knows which kitchen to ride to.
  const allMenuIds = Array.from(
    new Set([...(mineRows ?? []), ...(availableRows ?? [])].map((o) => o.menu_id as string)),
  );
  const restaurants: Record<string, string> = {};
  if (allMenuIds.length > 0) {
    const { data: menus } = await adminClient
      .from("menus")
      .select("id, name")
      .in("id", allMenuIds);
    for (const m of menus ?? []) {
      // Menus are named "<Restaurant> Menu" for the dashboard; the rider just
      // needs the place.
      restaurants[m.id as string] = String(m.name ?? "").replace(/\s+menu\s*$/i, "").trim();
    }
  }

  return NextResponse.json({
    mine: mineRows ?? [],
    available: availableRows ?? [],
    restaurants,
  });
}
