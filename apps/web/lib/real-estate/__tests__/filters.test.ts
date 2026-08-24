import { describe, expect, it } from "vitest";
import {
  EMPTY_FILTERS,
  applyFilters,
  buildFacets,
  countActiveFilters,
  parseFilters,
  serialiseFilters,
  sortProperties,
} from "../filters";
import type { PropertyCardData } from "../mappers";

function card(overrides: Partial<PropertyCardData> = {}): PropertyCardData {
  return {
    id: overrides.id ?? "p1",
    title: "Test property",
    slug: "test-property",
    listingCategory: "for-sale",
    propertyType: "apartment",
    status: "available",
    price: 10_000_000,
    currency: "KES",
    priceType: "total",
    features: [],
    neighbourhood: "Kilimani",
    city: "Nairobi",
    photoCount: 3,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("parseFilters", () => {
  /*
   * The hero search box has always emitted exactly these params. Nothing on the
   * receiving page read them, so every search returned the unfiltered category.
   */
  it("reads the params the hero search box emits", () => {
    const filters = parseFilters(
      new URLSearchParams("city=nairobi&type=villa&beds=3&minPrice=5000000&maxPrice=20000000")
    );
    expect(filters.city).toBe("nairobi");
    expect(filters.type).toBe("villa");
    expect(filters.beds).toBe(3);
    expect(filters.minPrice).toBe(5_000_000);
    expect(filters.maxPrice).toBe(20_000_000);
  });

  it("falls back to defaults for junk values", () => {
    const filters = parseFilters(new URLSearchParams("beds=abc&sort=explode"));
    expect(filters.beds).toBeNull();
    expect(filters.sort).toBe("newest");
  });

  it("splits the comma separated feature list", () => {
    const filters = parseFilters(new URLSearchParams("features=Pool,Borehole"));
    expect(filters.features).toEqual(["Pool", "Borehole"]);
  });

  it("round trips through serialiseFilters", () => {
    const original = {
      ...EMPTY_FILTERS,
      city: "Mombasa",
      beds: 2,
      maxPrice: 15_000_000,
      features: ["Pool"],
      sort: "price-asc" as const,
    };
    expect(parseFilters(new URLSearchParams(serialiseFilters(original)))).toEqual(original);
  });

  it("omits defaults from the query string", () => {
    expect(serialiseFilters(EMPTY_FILTERS)).toBe("");
  });
});

describe("applyFilters", () => {
  const cards = [
    card({ id: "a", city: "Nairobi", neighbourhood: "Kilimani", bedrooms: 3, price: 12_000_000, propertyType: "apartment", features: ["Pool", "Parking"] }),
    card({ id: "b", city: "Mombasa", neighbourhood: "Nyali", bedrooms: 2, price: 7_000_000, propertyType: "villa", features: ["Parking"] }),
    card({ id: "c", city: "Nairobi", neighbourhood: "Karen", bedrooms: 5, price: 45_000_000, propertyType: "house", sizeSqm: 400 }),
  ];

  it("matches a city typed in lowercase against the stored display name", () => {
    // The search box sends "nairobi"; Sanity stores "Nairobi".
    const result = applyFilters(cards, { ...EMPTY_FILTERS, city: "nairobi" });
    expect(result.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("treats bedrooms as a minimum, not an exact match", () => {
    const result = applyFilters(cards, { ...EMPTY_FILTERS, beds: 3 });
    expect(result.map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("applies price bounds inclusively", () => {
    const result = applyFilters(cards, {
      ...EMPTY_FILTERS,
      minPrice: 7_000_000,
      maxPrice: 12_000_000,
    });
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("requires every selected feature, not any of them", () => {
    const result = applyFilters(cards, {
      ...EMPTY_FILTERS,
      features: ["Pool", "Parking"],
    });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });

  it("filters to saved properties only when asked", () => {
    const result = applyFilters(
      cards,
      { ...EMPTY_FILTERS, savedOnly: true },
      new Set(["b"])
    );
    expect(result.map((c) => c.id)).toEqual(["b"]);
  });

  it("returns everything when no filter is set", () => {
    expect(applyFilters(cards, EMPTY_FILTERS)).toHaveLength(3);
  });

  it("excludes properties with no bedroom data from a bedroom filter", () => {
    const noBeds = [card({ id: "x", bedrooms: undefined })];
    expect(applyFilters(noBeds, { ...EMPTY_FILTERS, beds: 1 })).toHaveLength(0);
  });
});

describe("sortProperties", () => {
  const cards = [
    card({ id: "a", price: 12_000_000, bedrooms: 3, sizeSqm: 120, createdAt: "2026-01-01T00:00:00Z" }),
    card({ id: "b", price: 7_000_000, bedrooms: 5, sizeSqm: 400, createdAt: "2026-03-01T00:00:00Z" }),
  ];

  it("sorts by price ascending and descending", () => {
    expect(sortProperties(cards, "price-asc").map((c) => c.id)).toEqual(["b", "a"]);
    expect(sortProperties(cards, "price-desc").map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("sorts newest first by default", () => {
    expect(sortProperties(cards, "newest").map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("sorts by bedrooms and by size", () => {
    expect(sortProperties(cards, "beds-desc").map((c) => c.id)).toEqual(["b", "a"]);
    expect(sortProperties(cards, "size-desc").map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("does not mutate the input array", () => {
    const input = [...cards];
    sortProperties(input, "price-asc");
    expect(input.map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("buildFacets", () => {
  it("counts each city, neighbourhood and type", () => {
    const facets = buildFacets([
      card({ id: "a", city: "Nairobi", propertyType: "apartment", features: ["Pool"] }),
      card({ id: "b", city: "Nairobi", propertyType: "villa", features: ["Pool", "Gym"] }),
    ]);
    expect(facets.cities).toEqual([{ value: "Nairobi", count: 2 }]);
    expect(facets.types.map((t) => t.value).sort()).toEqual(["apartment", "villa"]);
  });

  /*
   * Imported listings carry the agent's own feature wording next to the
   * canonical vocabulary. Claris alone contributed "4 ceiling fans" and
   * "About 100 m from the beach", each on a single property. A chip that
   * narrows the grid to one result is a label, not a filter.
   */
  it("only offers a feature as a filter when two or more properties have it", () => {
    const facets = buildFacets([
      card({ id: "a", features: ["Pool", "4 ceiling fans"] }),
      card({ id: "b", features: ["Pool", "Gym"] }),
    ]);
    expect(facets.features).toEqual([{ value: "Pool", count: 2 }]);
  });

  it("caps the feature list so the panel stays scannable", () => {
    const many = Array.from({ length: 30 }, (_, i) => `Feature ${i}`);
    const facets = buildFacets([
      card({ id: "a", features: many }),
      card({ id: "b", features: many }),
    ]);
    expect(facets.features.length).toBeLessThanOrEqual(14);
  });
});

describe("countActiveFilters", () => {
  it("counts nothing for a clean slate", () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it("counts each feature separately", () => {
    expect(
      countActiveFilters({
        ...EMPTY_FILTERS,
        city: "Nairobi",
        features: ["Pool", "Gym"],
      })
    ).toBe(3);
  });

  it("does not count the sort order as a filter", () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, sort: "price-asc" })).toBe(0);
  });
});
