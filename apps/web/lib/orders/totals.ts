import { adminClient } from "@/lib/supabase/admin";

/**
 * Recompute an order's money from its surviving lines.
 *
 * There is no database trigger doing this. `recomputeSessionTotals` covers
 * dine-in, but only because those orders hang off a table session — a
 * takeaway or delivery order has no session, so before this helper existed
 * voiding a line updated `order_items` and left `orders.total_kes` at its
 * original value. The guest's tracking page would show one fewer dish and the
 * same price, and the admin revenue tile would count money nobody paid.
 *
 * Voided lines are excluded, matching every read path. delivery_fee_kes is
 * added on top rather than recomputed: it is a property of the delivery, not
 * of the basket.
 */
export async function recomputeOrderTotals(orderId: string): Promise<void> {
  const [{ data: lines }, { data: order }] = await Promise.all([
    adminClient
      .from("order_items")
      .select("line_total, is_voided")
      .eq("order_id", orderId),
    adminClient
      .from("orders")
      .select("delivery_fee_kes, commission_bps")
      .eq("id", orderId)
      .maybeSingle(),
  ]);

  // A failed read must not zero out a real order's total.
  if (!lines) {
    console.error("[recomputeOrderTotals] could not read lines for", orderId);
    return;
  }

  const subtotal = lines
    .filter((l) => !l.is_voided)
    .reduce((sum, l) => sum + Number(l.line_total ?? 0), 0);
  const deliveryFee = Number(order?.delivery_fee_kes ?? 0);

  // Commission follows the food. Remove a dish and the restaurant's payout
  // and Klickenya's cut both have to move with it, or the ledger describes an
  // order that no longer exists.
  //
  // Uses the rate FROZEN on the order, never the menu's current one: an order
  // placed under an old rate stays on that rate, even if it is edited after a
  // renegotiation. Orders from before 092 have no rate and keep a null
  // commission rather than being retro-charged one they never agreed to.
  const commissionBps = order?.commission_bps;
  const money: Record<string, unknown> = {
    subtotal_kes: subtotal,
    total_kes: subtotal + deliveryFee,
  };
  if (typeof commissionBps === "number") {
    const commission = Math.round((subtotal * commissionBps) / 10000);
    money.commission_kes = commission;
    money.restaurant_payout_kes = subtotal - commission;
  }

  const { error } = await adminClient
    .from("orders")
    .update(money)
    .eq("id", orderId);

  if (error) {
    console.error("[recomputeOrderTotals] update failed for", orderId, error);
  }
}
