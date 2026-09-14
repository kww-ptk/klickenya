/**
 * How an order's money is divided.
 *
 * Rates are basis points, matching PLATFORM_TICKET_FEE_BPS — 1000 bps = 10%.
 * Integers avoid the rounding drift that makes a ledger disagree with itself
 * after a few hundred orders.
 *
 * Two separate pots, and they are not the same money:
 *
 *   the food     the restaurant's. Klickenya takes a commission of it —
 *                10% on delivery, 7% on pickup by default, per restaurant.
 *   the delivery the fee the guest pays to have it brought. Split with the
 *                rider, 80/20 by default. The restaurant has no share of it;
 *                they did not carry anything.
 *
 * Every number is snapshotted onto the order. Rates get renegotiated, and an
 * order settled in March must not change because a rate changed in June.
 */

/** 10% of the food on a delivery order. */
export const DEFAULT_COMMISSION_DELIVERY_BPS = 1000;
/** 7% of the food on a pickup (takeaway) order. */
export const DEFAULT_COMMISSION_PICKUP_BPS = 700;
/**
 * The rider's share of the delivery fee. A platform-level term between
 * Klickenya and its riders — not something a restaurant negotiates, which is
 * why it does not live on the menu.
 */
export const RIDER_DELIVERY_SHARE_BPS = Number(
  process.env.RIDER_DELIVERY_SHARE_BPS ?? 8000,
);

export type OrderMoneyInput = {
  /** Food only, before any fee. */
  subtotalKes: number;
  /** What the guest pays for delivery. Zero on pickup. */
  deliveryFeeKes: number;
  isDelivery: boolean;
  commissionDeliveryBps: number;
  commissionPickupBps: number;
};

export type OrderMoney = {
  subtotalKes: number;
  deliveryFeeKes: number;
  /** What the guest is charged. */
  totalKes: number;
  /** The rate actually applied, snapshotted. */
  commissionBps: number;
  /** Klickenya's cut of the food. */
  commissionKes: number;
  /** The restaurant's share of the food. */
  restaurantPayoutKes: number;
  /** The rider's share of the delivery fee. */
  riderFeeKes: number;
  /** Klickenya's share of the delivery fee. */
  platformDeliveryFeeKes: number;
  /** Everything Klickenya keeps on this order. */
  platformTotalKes: number;
};

const bps = (amount: number, rate: number) => Math.round((amount * rate) / 10000);

export function splitOrderMoney(input: OrderMoneyInput): OrderMoney {
  // Negatives are nonsense here and would silently invert a payout.
  const subtotalKes = Math.max(0, Math.round(input.subtotalKes));
  const deliveryFeeKes = input.isDelivery ? Math.max(0, Math.round(input.deliveryFeeKes)) : 0;

  const commissionBps = Math.max(
    0,
    input.isDelivery ? input.commissionDeliveryBps : input.commissionPickupBps,
  );

  const commissionKes = bps(subtotalKes, commissionBps);
  const riderFeeKes = bps(deliveryFeeKes, RIDER_DELIVERY_SHARE_BPS);

  // Complements by subtraction, never a second rounding. Two rounded halves
  // can miss the whole by a shilling, and a ledger that is one short every
  // few hundred orders is worse than one that is simply wrong.
  const restaurantPayoutKes = subtotalKes - commissionKes;
  const platformDeliveryFeeKes = deliveryFeeKes - riderFeeKes;

  return {
    subtotalKes,
    deliveryFeeKes,
    totalKes: subtotalKes + deliveryFeeKes,
    commissionBps,
    commissionKes,
    restaurantPayoutKes,
    riderFeeKes,
    platformDeliveryFeeKes,
    platformTotalKes: commissionKes + platformDeliveryFeeKes,
  };
}

/** "10%" from 1000. For labels, never for arithmetic. */
export function bpsToPercent(value: number): string {
  const pct = value / 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(2)}%`;
}
