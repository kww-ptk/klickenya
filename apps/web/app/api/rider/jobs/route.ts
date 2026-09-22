import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { getRiderSession } from "@/lib/rider/auth";
import { menusForRider } from "@/lib/rider/scope";

/**
 * GET /api/rider/jobs — everything this rider should be looking at.
 *
 * Two lists:
 *   mine      accepted and not yet delivered — travelling to the kitchen,
 *             waiting for the food, or out delivering it
 *   available unclaimed, at kitchens they serve, and ALREADY COOKING
 *
 * Jobs appear at 'preparing', not 'ready'. A rider who only learns about an
 * order once it is ready leaves the food sitting on the pass for the length
 * of their journey, which is how delivery arrives cold. They accept while it
 * cooks and ride over during it.
 *
 * Both states are derived from timestamps, never from a new order status —
 * see migration 088 for why adding an enum value would have broken the margin
 * report for every order in flight.
 *
 * No dispatch, deliberately. A shared list that the nearest rider claims
 * first beats an assignment algorithm at this size, and has far less to go
 * wrong.
 */

// NOTE: pickup_code is deliberately absent. The rider is the party the code
// checks; handing it to their app would make the check theatre.
const JOB_SELECT = `
  id, status, order_type, customer_name, customer_phone,
  delivery_address, delivery_lat, delivery_lng,
  total_kes, created_at, rider_accepted_at, picked_up_at, rider_id, menu_id,
  order_items ( id, item_name, quantity, is_voided )
`;

export async function GET(req: NextRequest) {
  const session = getRiderSession(req);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // Which kitchens is this rider allowed to see at all? A Klickenya rider
  // gets every delivering restaurant; a restaurant's own rider gets theirs.
  const menuIds = (await menusForRider(session.rider_id)) ?? [];
  if (menuIds.length === 0) {
    return NextResponse.json({ mine: [], available: [], restaurants: {} });
  }

  const [{ data: mineRows }, { data: availableRows }] = await Promise.all([
    adminClient
      .from("orders")
      .select(JOB_SELECT)
      .eq("rider_id", session.rider_id)
      .is("delivered_at", null)
      // A cancelled order used to stay here forever — the rider's only job,
      // with no button that worked. Cancelled leaves the list; the rider
      // sees it vanish, which is what happened to it.
      .in("status", ["preparing", "ready"])
      .order("rider_accepted_at", { ascending: true }),
    adminClient
      .from("orders")
      .select(JOB_SELECT)
      .in("menu_id", menuIds)
      .eq("order_type", "delivery")
      // preparing OR ready: the kitchen has started, so there is a real job
      // to ride towards. 'new' is excluded — the restaurant has not committed
      // to cooking it yet and may still decline.
      .in("status", ["preparing", "ready"])
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
