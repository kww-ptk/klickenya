import { describe, expect, it } from "vitest";
import {
  formatPrice,
  formatPriceFull,
  getReductionPercent,
  isMonthlyPrice,
  pluralize,
  priceSuffix,
  pricePerSqm,
  toWhatsAppNumber,
  formatAcres,
} from "../format";

describe("formatPrice", () => {
  it("abbreviates millions and billions", () => {
    expect(formatPrice(12_500_000)).toBe("KSh 12.5M");
    expect(formatPrice(9_000_000)).toBe("KSh 9M");
    expect(formatPrice(2_400_000_000)).toBe("KSh 2.4B");
  });

  it("keeps sub-million prices exact", () => {
    expect(formatPrice(850_000)).toBe("KSh 850,000");
  });

  it("does not render a zero or negative price as KSh 0", () => {
    expect(formatPrice(0)).toBe("Price on request");
    expect(formatPrice(Number.NaN)).toBe("Price on request");
  });
});

describe("priceSuffix", () => {
  /*
   * The regression this guards: the card gated the "/month" suffix on
   * `status === "for-rent"`, but status only ever holds
   * available/under-offer/sold/let/draft. Rentals therefore rendered
   * "KSh 120,000" with no suffix, reading as a purchase price.
   */
  it("marks a for-rent listing as monthly", () => {
    expect(priceSuffix("for-rent", "total")).toBe("/month");
    expect(isMonthlyPrice("for-rent", "total")).toBe(true);
  });

  it("marks any per-month price as monthly whatever the category", () => {
    expect(priceSuffix("commercial", "per-month")).toBe("/month");
  });

  it("leaves a sale price with no suffix", () => {
    expect(priceSuffix("for-sale", "total")).toBe("");
    expect(priceSuffix("land", "total")).toBe("");
  });

  it("is never driven by the availability status", () => {
    // "available" must not be mistaken for a category.
    expect(priceSuffix("available", "total")).toBe("");
  });
});

describe("getReductionPercent", () => {
  it("returns the drop when a price was reduced", () => {
    expect(getReductionPercent(10_000_000, 8_500_000)).toBe(15);
  });

  it("returns null when the price went up or did not move", () => {
    expect(getReductionPercent(8_000_000, 9_000_000)).toBeNull();
    expect(getReductionPercent(8_000_000, 8_000_000)).toBeNull();
  });

  it("returns null when there is no previous price", () => {
    expect(getReductionPercent(undefined, 8_000_000)).toBeNull();
  });
});

describe("pluralize", () => {
  it("uses the singular for one", () => {
    // The old card hardcoded "beds" and rendered "1 beds".
    expect(pluralize(1, "bed")).toBe("1 bed");
    expect(pluralize(3, "bed")).toBe("3 beds");
    expect(pluralize(1, "bath")).toBe("1 bath");
  });
});

describe("pricePerSqm", () => {
  it("divides price by floor area", () => {
    expect(pricePerSqm(12_000_000, 120)).toBe(100_000);
  });

  it("returns null rather than dividing by zero", () => {
    expect(pricePerSqm(12_000_000, 0)).toBeNull();
    expect(pricePerSqm(12_000_000, undefined)).toBeNull();
    expect(pricePerSqm(0, 120)).toBeNull();
  });
});

describe("toWhatsAppNumber", () => {
  it("strips the plus from an international number", () => {
    expect(toWhatsAppNumber("+254712345678")).toBe("254712345678");
  });

  it("converts a Kenyan local number to international form", () => {
    expect(toWhatsAppNumber("0712 345 678")).toBe("254712345678");
  });

  it("leaves an already-international number alone", () => {
    expect(toWhatsAppNumber("254712345678")).toBe("254712345678");
  });

  it("returns null when there is no phone number", () => {
    expect(toWhatsAppNumber(undefined)).toBeNull();
    expect(toWhatsAppNumber("")).toBeNull();
  });
});

describe("formatAcres", () => {
  it("singularises one acre", () => {
    expect(formatAcres(1)).toBe("1 acre");
    expect(formatAcres(2.5)).toBe("2.5 acres");
  });

  it("returns null for a missing or zero size", () => {
    expect(formatAcres(0)).toBeNull();
    expect(formatAcres(undefined)).toBeNull();
  });
});

describe("formatPriceFull", () => {
  it("keeps every digit", () => {
    expect(formatPriceFull(12_500_000)).toBe("KSh 12,500,000");
  });
});
