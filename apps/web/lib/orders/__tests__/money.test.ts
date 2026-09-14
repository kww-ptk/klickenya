import { describe, it, expect } from "vitest";
import {
  splitOrderMoney,
  bpsToPercent,
  DEFAULT_COMMISSION_DELIVERY_BPS,
  DEFAULT_COMMISSION_PICKUP_BPS,
  RIDER_DELIVERY_SHARE_BPS,
} from "@/lib/orders/money";

const base = {
  commissionDeliveryBps: DEFAULT_COMMISSION_DELIVERY_BPS,
  commissionPickupBps: DEFAULT_COMMISSION_PICKUP_BPS,
};

describe("order money", () => {
  it("takes 10% of the food on a delivery", () => {
    const m = splitOrderMoney({ ...base, subtotalKes: 2500, deliveryFeeKes: 200, isDelivery: true });
    expect(m.commissionBps).toBe(1000);
    expect(m.commissionKes).toBe(250);
    expect(m.restaurantPayoutKes).toBe(2250);
  });

  it("takes 7% of the food on a pickup, and charges no delivery fee", () => {
    const m = splitOrderMoney({ ...base, subtotalKes: 2500, deliveryFeeKes: 200, isDelivery: false });
    expect(m.commissionBps).toBe(700);
    expect(m.commissionKes).toBe(175);
    // A pickup order carries no delivery fee even if one is configured —
    // nobody delivered anything.
    expect(m.deliveryFeeKes).toBe(0);
    expect(m.riderFeeKes).toBe(0);
    expect(m.totalKes).toBe(2500);
  });

  it("splits the delivery fee 80/20 with the rider", () => {
    const m = splitOrderMoney({ ...base, subtotalKes: 1000, deliveryFeeKes: 200, isDelivery: true });
    expect(RIDER_DELIVERY_SHARE_BPS).toBe(8000);
    expect(m.riderFeeKes).toBe(160);
    expect(m.platformDeliveryFeeKes).toBe(40);
  });

  it("never loses a shilling to rounding", () => {
    // 333 at 80% is 266.4 — the halves must still sum to the whole.
    for (const fee of [1, 3, 7, 33, 99, 333, 1001]) {
      const m = splitOrderMoney({ ...base, subtotalKes: 777, deliveryFeeKes: fee, isDelivery: true });
      expect(m.riderFeeKes + m.platformDeliveryFeeKes).toBe(m.deliveryFeeKes);
      expect(m.commissionKes + m.restaurantPayoutKes).toBe(m.subtotalKes);
      expect(m.totalKes).toBe(m.subtotalKes + m.deliveryFeeKes);
    }
  });

  it("adds up: what everyone gets equals what the guest paid", () => {
    const m = splitOrderMoney({ ...base, subtotalKes: 4321, deliveryFeeKes: 250, isDelivery: true });
    expect(m.restaurantPayoutKes + m.riderFeeKes + m.platformTotalKes).toBe(m.totalKes);
  });

  it("honours a renegotiated rate", () => {
    const m = splitOrderMoney({
      subtotalKes: 1000,
      deliveryFeeKes: 0,
      isDelivery: true,
      commissionDeliveryBps: 1500, // 15%
      commissionPickupBps: 700,
    });
    expect(m.commissionKes).toBe(150);
  });

  it("handles zero rates — a restaurant on no commission", () => {
    const m = splitOrderMoney({
      subtotalKes: 1000, deliveryFeeKes: 100, isDelivery: true,
      commissionDeliveryBps: 0, commissionPickupBps: 0,
    });
    expect(m.commissionKes).toBe(0);
    expect(m.restaurantPayoutKes).toBe(1000);
  });

  it("refuses to invert a payout on negative input", () => {
    const m = splitOrderMoney({ ...base, subtotalKes: -500, deliveryFeeKes: -100, isDelivery: true });
    expect(m.subtotalKes).toBe(0);
    expect(m.deliveryFeeKes).toBe(0);
    expect(m.restaurantPayoutKes).toBe(0);
  });

  it("formats rates for labels", () => {
    expect(bpsToPercent(1000)).toBe("10%");
    expect(bpsToPercent(700)).toBe("7%");
    expect(bpsToPercent(1250)).toBe("12.50%");
  });
});
