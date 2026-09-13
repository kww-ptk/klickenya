import { adminClient } from "@/lib/supabase/admin";

/**
 * Which kitchens a rider may work — the one place that answers it.
 *
 * Two kinds of rider:
 *   restaurant  linked to specific menus through rider_menus
 *   Klickenya   every menu that has delivery switched on, including ones
 *               onboarded after the rider was hired
 *
 * Platform scope is resolved live rather than stored as links, so a new
 * restaurant is visible to the fleet the moment it enables delivery. Nothing
 * to backfill means nothing to forget.
 *
 * Returns null when the rider does not exist or is not active — callers treat
 * that as "no work", never as "all work".
 */
export async function menusForRider(riderId: string): Promise<string[] | null> {
  const { data: rider } = await adminClient
    .from("riders")
    .select("id, is_active, is_platform")
    .eq("id", riderId)
    .maybeSingle();

  if (!rider || !rider.is_active) return null;

  if (rider.is_platform) {
    const { data: menus } = await adminClient
      .from("menus")
      .select("id")
      .eq("delivery_enabled", true);
    return (menus ?? []).map((m) => m.id as string);
  }

  const { data: links } = await adminClient
    .from("rider_menus")
    .select("menu_id")
    .eq("rider_id", riderId);
  return (links ?? []).map((l) => l.menu_id as string);
}
