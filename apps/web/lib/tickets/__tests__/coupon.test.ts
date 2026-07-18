// apps/web/lib/tickets/__tests__/coupon.test.ts
import { describe, it, expect } from "vitest";
import { applyCoupon, couponError, type Coupon } from "../coupon";

const base: Coupon = {
  id: "c1", event_sanity_id: "evt1", discount_type: "percent", discount_value: 20,
  expires_at: null, active: true,
};

describe("applyCoupon", () => {
  it("percent discount floors and clamps", () => {
    expect(applyCoupon(7000, base)).toEqual({ discount_kes: 1400, total_kes: 5600 });
    expect(applyCoupon(999, { ...base, discount_value: 33 })).toEqual({ discount_kes: 329, total_kes: 670 });
  });
  it("fixed discount never exceeds subtotal (free floor)", () => {
    expect(applyCoupon(500, { ...base, discount_type: "fixed", discount_value: 800 }))
      .toEqual({ discount_kes: 500, total_kes: 0 });
  });
  it("100% percent → free", () => {
    expect(applyCoupon(3000, { ...base, discount_value: 100 })).toEqual({ discount_kes: 3000, total_kes: 0 });
  });
});

describe("couponError (non-DB checks)", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  it("passes a valid coupon for its event", () => {
    expect(couponError(base, { now, eventSanityId: "evt1" })).toBeNull();
  });
  it("rejects inactive, wrong event, expired", () => {
    expect(couponError({ ...base, active: false }, { now, eventSanityId: "evt1" })).toBe("inactive");
    expect(couponError(base, { now, eventSanityId: "other" })).toBe("wrong_event");
    expect(couponError({ ...base, expires_at: "2026-07-18T11:00:00Z" }, { now, eventSanityId: "evt1" })).toBe("expired");
  });
});
