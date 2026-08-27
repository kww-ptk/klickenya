import { describe, expect, it } from "vitest";
import {
  breadcrumbSchema,
  itemListSchema,
  propertyListingSchema,
  shouldNoIndex,
} from "../schema";
import type { PropertyCardData } from "../mappers";

const property = {
  _id: "abc",
  _createdAt: "2026-01-01T00:00:00Z",
  _updatedAt: "2026-02-01T00:00:00Z",
  title: "3 Bedroom Apartment in Kilimani",
  slug: { current: "3-bed-kilimani" },
  listingCategory: "for-sale",
  status: "available",
  price: 12_000_000,
  priceType: "total",
  bedrooms: 3,
  bathrooms: 2,
  sizeSqm: 140,
  neighbourhood: "Kilimani",
  city: "Nairobi",
  county: "Nairobi",
  lat: -1.29,
  lng: 36.78,
  features: ["Pool", "Parking"],
  agent: { displayName: "Jane Doe", slug: { current: "jane-doe" }, phone: "+254712345678" },
};

describe("propertyListingSchema", () => {
  it("carries the fields the old schema dropped", () => {
    const schema = propertyListingSchema(property, ["https://example.com/1.jpg"]);
    expect(schema.numberOfBedrooms).toBe(3);
    expect(schema.numberOfBathroomsTotal).toBe(2);
    expect(schema.floorSize).toEqual({
      "@type": "QuantitativeValue",
      value: 140,
      unitCode: "MTK",
    });
    expect(schema.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: -1.29,
      longitude: 36.78,
    });
    expect(schema.datePosted).toBe("2026-01-01T00:00:00Z");
    expect((schema.broker as Record<string, unknown>).name).toBe("Jane Doe");
    expect(schema.amenityFeature).toHaveLength(2);
  });

  it("marks an available listing in stock", () => {
    const offers = propertyListingSchema(property, []).offers as Record<string, unknown>;
    expect(offers.availability).toBe("https://schema.org/InStock");
    expect(offers.priceCurrency).toBe("KES");
  });

  it("marks a sold listing as sold out", () => {
    const offers = propertyListingSchema({ ...property, status: "sold" }, [])
      .offers as Record<string, unknown>;
    expect(offers.availability).toBe("https://schema.org/SoldOut");
  });

  it("marks an under-offer listing as limited availability", () => {
    const offers = propertyListingSchema({ ...property, status: "under-offer" }, [])
      .offers as Record<string, unknown>;
    expect(offers.availability).toBe("https://schema.org/LimitedAvailability");
  });

  it("prices a rental per month", () => {
    const offers = propertyListingSchema(
      { ...property, listingCategory: "for-rent", price: 120_000 },
      []
    ).offers as Record<string, { unitCode?: string }>;
    expect(offers.priceSpecification?.unitCode).toBe("MON");
  });

  it("omits geo entirely when there are no coordinates", () => {
    const schema = propertyListingSchema({ ...property, lat: null, lng: null }, []);
    expect(schema.geo).toBeUndefined();
  });

  it("uses an absolute url", () => {
    const schema = propertyListingSchema(property, []);
    expect(String(schema.url)).toMatch(/^https?:\/\/.+\/real-estate\/3-bed-kilimani$/);
  });
});

describe("shouldNoIndex", () => {
  it("keeps available listings indexable", () => {
    expect(shouldNoIndex("available")).toBe(false);
    expect(shouldNoIndex("under-offer")).toBe(false);
  });

  it("drops listings that are off the market out of the index", () => {
    expect(shouldNoIndex("sold")).toBe(true);
    expect(shouldNoIndex("let")).toBe(true);
    expect(shouldNoIndex("draft")).toBe(true);
  });
});

describe("breadcrumbSchema", () => {
  it("numbers items from one and leaves the last without a url", () => {
    const schema = breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Real Estate", path: "/real-estate" },
      { name: "3 Bed Apartment" },
    ]);
    const items = schema.itemListElement;
    expect(items).toHaveLength(3);
    expect(items[0].position).toBe(1);
    expect(items[2].position).toBe(3);
    expect(items[2]).not.toHaveProperty("item");
    expect(items[1].item).toMatch(/\/real-estate$/);
  });
});

describe("itemListSchema", () => {
  const cards = [
    { slug: "one", title: "One" },
    { slug: "two", title: "Two" },
  ] as PropertyCardData[];

  it("lists every property with an absolute url", () => {
    const schema = itemListSchema(cards, { name: "For sale", url: "/real-estate/for-sale" });
    expect(schema.numberOfItems).toBe(2);
    expect(schema.itemListElement[0].url).toMatch(/\/real-estate\/one$/);
    expect(schema.itemListElement[1].position).toBe(2);
  });

  it("caps the list at 100 entries", () => {
    const many = Array.from({ length: 150 }, (_, i) => ({
      slug: `p${i}`,
      title: `P${i}`,
    })) as PropertyCardData[];
    const schema = itemListSchema(many, { name: "All", url: "/real-estate" });
    expect(schema.itemListElement).toHaveLength(100);
    expect(schema.numberOfItems).toBe(150);
  });
});
