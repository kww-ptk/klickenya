import { describe, it, expect } from "vitest";
import { buildOrderLines, computeTotals, type SanityTier } from "../pricing";

const tiers: SanityTier[] = [
  { _key: "ga", name: "General", price: 1000, available: 100, isSoldOut: false },
  { _key: "vip", name: "VIP", price: 5000, available: 10, isSoldOut: false },
  { _key: "gone", name: "Early Bird", price: 500, available: 0, isSoldOut: true },
];

describe("buildOrderLines", () => {
  it("joins requested tiers against Sanity tiers", () => {
    const lines = buildOrderLines(tiers, [{ tierKey: "ga", qty: 2 }]);
    expect(lines).toEqual([
      { tier_key: "ga", tier_name: "General", unit_price_kes: 1000, qty: 2, capacity: 100 },
    ]);
  });
  it("rejects unknown tier keys", () => {
    expect(() => buildOrderLines(tiers, [{ tierKey: "nope", qty: 1 }])).toThrow("UNKNOWN_TIER");
  });
  it("rejects sold-out tiers", () => {
    expect(() => buildOrderLines(tiers, [{ tierKey: "gone", qty: 1 }])).toThrow("SOLD_OUT");
  });
  it("rejects qty < 1, > 10, or duplicate tiers", () => {
    expect(() => buildOrderLines(tiers, [{ tierKey: "ga", qty: 0 }])).toThrow("BAD_QTY");
    expect(() => buildOrderLines(tiers, [{ tierKey: "ga", qty: 11 }])).toThrow("BAD_QTY");
    expect(() =>
      buildOrderLines(tiers, [{ tierKey: "ga", qty: 1 }, { tierKey: "ga", qty: 1 }]),
    ).toThrow("DUPLICATE_TIER");
  });
  it("builds a free line for free events (no tiers defined)", () => {
    const lines = buildOrderLines([], [{ tierKey: "free", qty: 2 }], { freeEvent: true, capacity: 50 });
    expect(lines).toEqual([
      { tier_key: "free", tier_name: "Free entry", unit_price_kes: 0, qty: 2, capacity: 50 },
    ]);
  });
});

describe("computeTotals", () => {
  it("sums line totals in whole KES", () => {
    const lines = buildOrderLines(tiers, [
      { tierKey: "ga", qty: 2 },
      { tierKey: "vip", qty: 1 },
    ]);
    expect(computeTotals(lines, 500)).toEqual({
      subtotal_kes: 7000,
      total_kes: 7000,
      platform_fee_kes: 350,
      host_share_kes: 6650,
    });
  });
  it("zero fee on free orders regardless of bps", () => {
    const lines = buildOrderLines([], [{ tierKey: "free", qty: 3 }], { freeEvent: true, capacity: null });
    expect(computeTotals(lines, 500)).toEqual({
      subtotal_kes: 0, total_kes: 0, platform_fee_kes: 0, host_share_kes: 0,
    });
  });
  it("rounds fee down to whole KES", () => {
    const lines = buildOrderLines(tiers, [{ tierKey: "ga", qty: 1 }]);
    expect(computeTotals(lines, 333).platform_fee_kes).toBe(33);
  });
});
