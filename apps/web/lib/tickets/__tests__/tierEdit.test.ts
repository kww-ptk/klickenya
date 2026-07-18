// apps/web/lib/tickets/__tests__/tierEdit.test.ts
import { describe, it, expect } from "vitest";
import { mergeTierKeys, validateTierInput, type TierInput } from "../tierEdit";

describe("validateTierInput", () => {
  it("accepts a valid tier", () => {
    expect(validateTierInput({ name: "VIP", price: 5000, available: 100 })).toEqual({ ok: true });
  });
  it("rejects empty name, negative price, negative availability", () => {
    expect(validateTierInput({ name: "", price: 100 }).ok).toBe(false);
    expect(validateTierInput({ name: "GA", price: -1 }).ok).toBe(false);
    expect(validateTierInput({ name: "GA", price: 100, available: -5 }).ok).toBe(false);
  });
  it("allows blank/undefined availability (unlimited)", () => {
    expect(validateTierInput({ name: "GA", price: 100 }).ok).toBe(true);
  });
});

describe("mergeTierKeys", () => {
  const existing = [
    { _key: "k1", name: "GA", price: 1000 },
    { _key: "k2", name: "VIP", price: 5000 },
  ];
  it("keeps _key for tiers matched by _key", () => {
    const edited: TierInput[] = [{ _key: "k1", name: "GA", price: 1200 }];
    const out = mergeTierKeys(existing, edited, () => "NEW");
    expect(out[0]._key).toBe("k1");
    expect(out[0].price).toBe(1200);
  });
  it("assigns a fresh key to tiers with no _key", () => {
    const edited: TierInput[] = [{ name: "Early Bird", price: 500 }];
    const out = mergeTierKeys(existing, edited, () => "NEW");
    expect(out[0]._key).toBe("NEW");
  });
  it("drops tiers not present in the edited list (removal)", () => {
    const edited: TierInput[] = [{ _key: "k2", name: "VIP", price: 5000 }];
    const out = mergeTierKeys(existing, edited, () => "NEW");
    expect(out).toHaveLength(1);
    expect(out[0]._key).toBe("k2");
  });
  it("normalizes fields: rounds price, blank available → undefined, default isSoldOut false", () => {
    const edited: TierInput[] = [{ name: "GA", price: 100.7, available: undefined, isSoldOut: true }];
    const out = mergeTierKeys([], edited, () => "NEW");
    expect(out[0]).toMatchObject({ name: "GA", price: 101, isSoldOut: true });
    expect(out[0].available).toBeUndefined();
  });
});
