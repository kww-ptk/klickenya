import { adminClient } from "@/lib/supabase/admin";

/**
 * The Food Delivery Station — created for a restaurant the moment delivery
 * is switched on, so nobody has to know that a screen needs a staff PIN
 * before it will open.
 *
 * Default PIN 0001, which the owner can change like any other. Not a secret:
 * it is a counter tablet in a kitchen, and the alternative was an owner
 * discovering that their delivery screen rejects every PIN because no staff
 * member with the right role exists yet.
 *
 * Idempotent, and it never touches an existing one. Re-enabling delivery
 * must not reset a PIN the owner has since changed, or wake a station they
 * deliberately switched off.
 */
export const DELIVERY_STATION_NAME = "Food Delivery Station";
export const DELIVERY_STATION_DEFAULT_PIN = "0001";

export async function ensureDeliveryStation(menuId: string): Promise<void> {
  const { data: existing } = await adminClient
    .from("restaurant_staff")
    .select("id")
    .eq("menu_id", menuId)
    .eq("role", "delivery")
    .limit(1);

  if (existing && existing.length > 0) return;

  // PINs are unique per menu (054). If 0001 is taken, walk up rather than
  // fail — an owner turning delivery on should not see an error about a
  // number they never chose.
  const { data: taken } = await adminClient
    .from("restaurant_staff")
    .select("pin")
    .eq("menu_id", menuId);
  const used = new Set((taken ?? []).map((t) => String(t.pin)));

  let pin = DELIVERY_STATION_DEFAULT_PIN;
  for (let n = 1; n < 40 && used.has(pin); n++) {
    pin = String(n + 1).padStart(4, "0");
  }
  if (used.has(pin)) return; // wildly unlikely; better to skip than to throw

  const { error } = await adminClient.from("restaurant_staff").insert({
    menu_id: menuId,
    name: DELIVERY_STATION_NAME,
    pin,
    role: "delivery",
    is_active: true,
  });

  if (error) {
    // Never fail the settings save over this. The owner asked to turn
    // delivery on; they can still add the station by hand.
    console.error("[ensureDeliveryStation]", error);
  }
}
