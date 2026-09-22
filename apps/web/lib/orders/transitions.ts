/**
 * The order status machine, in one place.
 *
 * Four copies of this used to exist — the order PATCH route, the item PATCH
 * route, the owner queue and the station board — and they had already
 * drifted: the 'delivery' role added by migration 091 was missing from the
 * server copies, so the Food Delivery Station PIN got a 403 on the first
 * button it was built to press.
 */
export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "cancelled";

/** Forward moves only. Nothing leaves 'delivered' or 'cancelled'. */
export const ORDER_TRANSITIONS: Readonly<Record<string, readonly OrderStatus[]>> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "cancelled"],
};

export function isTransitionAllowed(from: string, to: string): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to as OrderStatus);
}

/**
 * Roles that run the whole lifecycle. 'delivery' is the Food Delivery
 * Station (091) — the tablet role whose only job is to drive delivery and
 * takeaway orders from new to ready.
 */
export const KITCHEN_DRIVING_ROLES: ReadonlySet<string> = new Set([
  "kitchen",
  "manager",
  "bar",
  "delivery",
]);

export type TransitionActor = { type: "owner" } | { type: "staff"; role: string };

/**
 * Owner and kitchen-driving staff may make any valid move. Everyone else
 * (waiter, cashier) may only complete a ready order — their pickup flow.
 */
export function canDriveTransition(actor: TransitionActor, from: string, to: string): boolean {
  if (actor.type === "owner" || KITCHEN_DRIVING_ROLES.has(actor.role)) return true;
  return from === "ready" && to === "delivered";
}

/** The one button on a queue card: what pressing it does next. */
export function nextAction(status: string): { to: OrderStatus; label: string } | null {
  switch (status) {
    case "new":
      return { to: "preparing", label: "Start preparing" };
    case "preparing":
      return { to: "ready", label: "Mark ready" };
    case "ready":
      return { to: "delivered", label: "Complete" };
    default:
      return null;
  }
}
