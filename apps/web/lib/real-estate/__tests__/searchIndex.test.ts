import { describe, expect, it } from "vitest";
import {
  buildLocationOptions,
  buildSearchIndex,
  countMatches,
  digitsOnly,
  formatThousands,
} from "../searchIndex";
import type { PropertyCardData } from "../mappers";

function card(o: Partial<PropertyCardData> & { id: string }): PropertyCardData {
  return {
    title: "P",
    slug: "p",
    listingCategory: "for-sale",
    status: "available",
    price: 10_000_000,
    currency: "KES",
    priceType: "total",
    features: [],
    neighbourhood: "Turtle Bay",
    city: "Watamu",
    photoCount: 1,
    ...o,
  };
}

describe("buildLocationOptions", () => {
  it("offers only places that have listings, with counts", () => {
    const options = buildLocationOptions([
      card({ id: "a", city: "Watamu", neighbourhood: "Turtle Bay" }),
      card({ id: "b", city: "Watamu", neighbourhood: "Kanani" }),
    ]);
    const watamu = options.find((o) => o.value === "Watamu");
    expect(watamu).toEqual({ value: "Watamu", kind: "city", count: 2 });
    expect(options.find((o) => o.value === "Kanani")).toEqual({
      value: "Kanani",
      kind: "neighbourhood",
      city: "Watamu",
      count: 1,
    });
    // Nowhere else should be offered — the old free-text box let you type
    // "Nairobi" and land on an empty grid.
    expect(options.some((o) => o.value === "Nairobi")).toBe(false);
  });
});

describe("countMatches", () => {
  const index = buildSearchIndex([
    card({ id: "a", city: "Watamu", neighbourhood: "Turtle Bay", bedrooms: 2, price: 205_000, currency: "EUR" }),
    card({ id: "b", city: "Watamu", neighbourhood: "Kanani", listingCategory: "land", price: 125_000, currency: "EUR" }),
    card({ id: "c", city: "Nairobi", neighbourhood: "Kilimani", bedrooms: 3, price: 12_000_000 }),
  ]);

  const base = { category: "for-sale", location: "", type: "", beds: "", minPrice: null, maxPrice: null };

  it("counts within the selected category", () => {
    expect(countMatches(index, base)).toBe(2);
    expect(countMatches(index, { ...base, category: "land" })).toBe(1);
  });

  it("matches a location by city or by neighbourhood", () => {
    expect(countMatches(index, { ...base, location: "Watamu" })).toBe(1);
    expect(countMatches(index, { ...base, location: "Kilimani" })).toBe(1);
  });

  it("is case and spacing insensitive on location", () => {
    expect(countMatches(index, { ...base, location: "  watamu " })).toBe(1);
  });

  /*
   * A shilling budget has to be compared against a shilling equivalent, or the
   * €205,000 villa looks cheaper than the KSh 12M flat.
   */
  it("compares a shilling budget against converted prices", () => {
    expect(countMatches(index, { ...base, maxPrice: 15_000_000 })).toBe(1);
    expect(countMatches(index, { ...base, minPrice: 20_000_000 })).toBe(1);
  });

  it("treats bedrooms as a minimum", () => {
    // for-sale holds the 2-bed Watamu villa and the 3-bed Nairobi flat.
    expect(countMatches(index, { ...base, beds: "2" })).toBe(2);
    expect(countMatches(index, { ...base, beds: "3" })).toBe(1);
    expect(countMatches(index, { ...base, beds: "4" })).toBe(0);
  });

  it("counts new developments across categories", () => {
    const devIndex = buildSearchIndex([
      card({ id: "d", isNewDevelopment: true }),
      card({ id: "e" }),
    ]);
    expect(countMatches(devIndex, { ...base, category: "new-developments" })).toBe(1);
  });
});

describe("price input formatting", () => {
  it("groups digits as they are typed", () => {
    expect(formatThousands("12500000")).toBe("12,500,000");
    expect(formatThousands("")).toBe("");
  });

  it("strips anything that is not a digit", () => {
    expect(digitsOnly("KSh 12,500,000")).toBe("12500000");
    expect(digitsOnly("abc")).toBe("");
  });
});
