/**
 * Where a delivery actually is.
 *
 * There is deliberately no out_for_delivery status (see migration 088 and
 * docs/food-delivery-state.md): the margin report and the stock triggers
 * key on 'preparing' / 'ready' / 'delivered', so the delivery leg is carried
 * by timestamps. Five surfaces used to derive this ad hoc and the guest page
 * did not derive it at all — it told the customer "On its way to you" the
 * moment the kitchen pressed Mark ready. Derive it here, once.
 */
export type DeliveryStage =
  | "waiting" // new — the kitchen has not accepted yet
  | "cooking" // preparing, no rider yet
  | "rider_assigned" // a rider has claimed it and is riding to the kitchen
  | "awaiting_rider" // ready on the pass, nobody has claimed it
  | "out_for_delivery" // the rider has the food
  | "delivered"
  | "cancelled";

export type DeliveryStageInput = {
  status: string;
  rider_accepted_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
};

export function deliveryStage(o: DeliveryStageInput): DeliveryStage {
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "delivered") return "delivered";
  if (o.picked_up_at) return "out_for_delivery";
  if (o.status === "ready") return o.rider_accepted_at ? "rider_assigned" : "awaiting_rider";
  if (o.status === "preparing") return o.rider_accepted_at ? "rider_assigned" : "cooking";
  return "waiting";
}
