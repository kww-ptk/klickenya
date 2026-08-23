import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceFull } from "../format";
import {
  APPROX_KES_RATES,
  isCurrency,
  toComparableKes,
  toCurrency,
  withSymbol,
} from "../currency";
import {
  EMPTY_FILTERS,
  applyFilters,
  sortProperties,
} from "../filters";
import type { PropertyCardData } from "../mappers";
import { propertyListingSchema } from "../schema";

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
    neighbourhood: "N",
    city: "C",
    photoCount: 1,
    ...o,
  };
}

describe("formatPrice with a currency", () => {
  /*
   * The Claris stock is quoted in euro. Before currency existed, an asking
   * price of 485,000 euro rendered as "KSh 485,000" — out by a factor of
   * roughly 150.
   */
  it("renders euro with the euro symbol", () => {
    expect(formatPrice(485_000, "EUR")).toBe("€485,000");
    expect(formatPriceFull(485_000, "EUR")).toBe("€485,000");
  });

  it("still defaults to shillings", () => {
    expect(formatPrice(850_000)).toBe("KSh 850,000");
    expect(formatPrice(12_500_000)).toBe("KSh 12.5M");
  });

  it("puts a space after a word symbol and none after a glyph", () => {
    expect(withSymbol("1,000", "KES")).toBe("KSh 1,000");
    expect(withSymbol("1,000", "EUR")).toBe("€1,000");
    expect(withSymbol("1,000", "USD")).toBe("$1,000");
    expect(withSymbol("1,000", "GBP")).toBe("£1,000");
  });

  it("abbreviates millions in any currency", () => {
    expect(formatPrice(1_200_000, "USD")).toBe("$1.2M");
    expect(formatPrice(2_000_000, "EUR")).toBe("€2M");
  });

  it("falls back to shillings for an unknown currency rather than dropping the symbol", () => {
    expect(formatPrice(1_000, "XYZ")).toBe("KSh 1,000");
    expect(toCurrency(undefined)).toBe("KES");
    expect(toCurrency("EUR")).toBe("EUR");
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("BTC")).toBe(false);
  });

  it("still refuses to print a zero price", () => {
    expect(formatPrice(0, "EUR")).toBe("Price on request");
  });
});

describe("toComparableKes", () => {
  it("leaves shillings untouched", () => {
    expect(toComparableKes(10_000_000, "KES")).toBe(10_000_000);
  });

  it("scales other currencies up to a shilling equivalent", () => {
    expect(toComparableKes(1_000, "EUR")).toBe(1_000 * APPROX_KES_RATES.EUR);
    expect(toComparableKes(1_000, "USD")).toBe(1_000 * APPROX_KES_RATES.USD);
  });
});

describe("mixed-currency filtering and sorting", () => {
  const villaEur = card({ id: "eur", price: 485_000, currency: "EUR" }); // ≈ KSh 72.75M
  const plotKes = card({ id: "kes", price: 2_000_000, currency: "KES" });

  it("does not treat a euro price as if it were shillings", () => {
    // Raw numbers would put the 2M shilling plot above the 485k euro villa.
    const sorted = sortProperties([villaEur, plotKes], "price-desc");
    expect(sorted.map((c) => c.id)).toEqual(["eur", "kes"]);
  });

  it("sorts ascending on the shilling equivalent", () => {
    expect(sortProperties([villaEur, plotKes], "price-asc").map((c) => c.id)).toEqual([
      "kes",
      "eur",
    ]);
  });

  it("applies a shilling max price against the converted value", () => {
    // A KSh 10M ceiling must exclude a 485k euro villa, not include it.
    const result = applyFilters([villaEur, plotKes], {
      ...EMPTY_FILTERS,
      maxPrice: 10_000_000,
    });
    expect(result.map((c) => c.id)).toEqual(["kes"]);
  });

  it("includes a euro listing when the ceiling is genuinely high enough", () => {
    const result = applyFilters([villaEur, plotKes], {
      ...EMPTY_FILTERS,
      minPrice: 50_000_000,
    });
    expect(result.map((c) => c.id)).toEqual(["eur"]);
  });
});

describe("propertyListingSchema currency", () => {
  const base = {
    _id: "a",
    title: "Villa",
    slug: { current: "villa" },
    listingCategory: "for-sale",
    status: "available",
    price: 485_000,
    city: "Watamu",
  };

  it("reports the listing's own currency to search engines", () => {
    const offers = propertyListingSchema({ ...base, currency: "EUR" }, [])
      .offers as Record<string, unknown>;
    expect(offers.priceCurrency).toBe("EUR");
  });

  it("defaults to KES when the document predates the currency field", () => {
    const offers = propertyListingSchema(base, []).offers as Record<string, unknown>;
    expect(offers.priceCurrency).toBe("KES");
  });
});
