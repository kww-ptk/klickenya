import type { PropertyCardData } from "./mappers";
import { toComparableKes } from "./currency";
import { citySlug } from "./constants";
import type { LocationOption } from "@/components/real-estate/LocationPicker";

/**
 * A compact index of what is on the market, handed to the hero search box so it
 * can offer real places and count matches before anyone submits.
 *
 * Only the fields the search box actually filters on, so the payload stays
 * small even as the catalogue grows.
 */
export interface SearchIndexEntry {
  category: string;
  city: string;
  neighbourhood: string;
  type?: string;
  beds: number;
  /** Shilling equivalent, so a euro listing compares against a shilling budget. */
  priceKes: number;
  isNewDevelopment: boolean;
}

export function buildSearchIndex(cards: PropertyCardData[]): SearchIndexEntry[] {
  return cards.map((c) => ({
    category: c.listingCategory,
    city: c.city,
    neighbourhood: c.neighbourhood,
    type: c.propertyType,
    beds: c.bedrooms ?? 0,
    priceKes: toComparableKes(c.price, c.currency),
    isNewDevelopment: Boolean(c.isNewDevelopment),
  }));
}

/** Places that actually have listings, with counts, for the location picker. */
export function buildLocationOptions(cards: PropertyCardData[]): LocationOption[] {
  const cities = new Map<string, number>();
  const areas = new Map<string, { city: string; count: number }>();

  for (const c of cards) {
    if (c.city) cities.set(c.city, (cities.get(c.city) ?? 0) + 1);
    if (c.neighbourhood) {
      const found = areas.get(c.neighbourhood);
      if (found) found.count += 1;
      else areas.set(c.neighbourhood, { city: c.city, count: 1 });
    }
  }

  return [
    ...Array.from(cities, ([value, count]) => ({
      value,
      kind: "city" as const,
      count,
    })),
    ...Array.from(areas, ([value, { city, count }]) => ({
      value,
      kind: "neighbourhood" as const,
      city,
      count,
    })),
  ];
}

export interface SearchSelection {
  category: string;
  location: string;
  type: string;
  beds: string;
  minPrice: number | null;
  maxPrice: number | null;
}

/**
 * How many listings the current selection would return. The search box shows
 * this on the button so nobody submits into an empty grid.
 */
export function countMatches(
  index: SearchIndexEntry[],
  selection: SearchSelection
): number {
  const loc = selection.location.trim().toLowerCase();
  const beds = selection.beds ? Number(selection.beds) : null;

  return index.filter((e) => {
    if (selection.category === "new-developments") {
      if (!e.isNewDevelopment) return false;
    } else if (selection.category && e.category !== selection.category) {
      return false;
    }
    if (loc) {
      const matches =
        citySlug(e.city) === citySlug(loc) ||
        citySlug(e.neighbourhood) === citySlug(loc) ||
        e.city.toLowerCase().includes(loc) ||
        e.neighbourhood.toLowerCase().includes(loc);
      if (!matches) return false;
    }
    if (selection.type && e.type !== selection.type) return false;
    if (beds != null && e.beds < beds) return false;
    if (selection.minPrice != null && e.priceKes < selection.minPrice) return false;
    if (selection.maxPrice != null && e.priceKes > selection.maxPrice) return false;
    return true;
  }).length;
}

/** "12500000" typed by a human, shown back as "12,500,000". */
export function formatThousands(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("en-KE");
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}
