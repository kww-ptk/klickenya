import type { PropertyCardData } from "./mappers";
import { citySlug } from "./constants";

/**
 * Search/filter state. Serialised straight into the query string so a filtered
 * view is linkable and shareable — the hero search box previously produced
 * these params and nothing on the receiving page ever read them.
 */
export interface PropertyFilters {
  city: string;
  neighbourhood: string;
  type: string;
  beds: number | null;
  baths: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  minSize: number | null;
  features: string[];
  newOnly: boolean;
  savedOnly: boolean;
  sort: SortKey;
}

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "beds-desc", label: "Most bedrooms" },
  { value: "size-desc", label: "Largest first" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

const SORT_KEYS = SORT_OPTIONS.map((o) => o.value) as readonly string[];

export const EMPTY_FILTERS: PropertyFilters = {
  city: "",
  neighbourhood: "",
  type: "",
  beds: null,
  baths: null,
  minPrice: null,
  maxPrice: null,
  minSize: null,
  features: [],
  newOnly: false,
  savedOnly: false,
  sort: "newest",
};

function toInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Read filters out of a URLSearchParams (or anything with a `get`). */
export function parseFilters(params: URLSearchParams): PropertyFilters {
  const sort = params.get("sort") ?? "";
  const features = (params.get("features") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    city: params.get("city")?.trim() ?? "",
    neighbourhood: params.get("neighbourhood")?.trim() ?? "",
    type: params.get("type")?.trim() ?? "",
    beds: toInt(params.get("beds")),
    baths: toInt(params.get("baths")),
    minPrice: toInt(params.get("minPrice")),
    maxPrice: toInt(params.get("maxPrice")),
    minSize: toInt(params.get("minSize")),
    features,
    newOnly: params.get("new") === "1",
    savedOnly: params.get("saved") === "1",
    sort: (SORT_KEYS.includes(sort) ? sort : "newest") as SortKey,
  };
}

/** Inverse of parseFilters. Omits defaults so canonical URLs stay clean. */
export function serialiseFilters(filters: PropertyFilters): string {
  const p = new URLSearchParams();
  if (filters.city) p.set("city", filters.city);
  if (filters.neighbourhood) p.set("neighbourhood", filters.neighbourhood);
  if (filters.type) p.set("type", filters.type);
  if (filters.beds) p.set("beds", String(filters.beds));
  if (filters.baths) p.set("baths", String(filters.baths));
  if (filters.minPrice) p.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice) p.set("maxPrice", String(filters.maxPrice));
  if (filters.minSize) p.set("minSize", String(filters.minSize));
  if (filters.features.length) p.set("features", filters.features.join(","));
  if (filters.newOnly) p.set("new", "1");
  if (filters.savedOnly) p.set("saved", "1");
  if (filters.sort !== "newest") p.set("sort", filters.sort);
  return p.toString();
}

/** How many filters the user has actually applied (drives the mobile badge). */
export function countActiveFilters(filters: PropertyFilters): number {
  let n = 0;
  if (filters.city) n++;
  if (filters.neighbourhood) n++;
  if (filters.type) n++;
  if (filters.beds) n++;
  if (filters.baths) n++;
  if (filters.minPrice) n++;
  if (filters.maxPrice) n++;
  if (filters.minSize) n++;
  if (filters.newOnly) n++;
  if (filters.savedOnly) n++;
  n += filters.features.length;
  return n;
}

export function hasActiveFilters(filters: PropertyFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/**
 * City comes off the search box as a free-text slug ("nairobi") but off a
 * facet chip as a display name ("Nairobi"). Compare on the slug form so both
 * shapes match the same properties.
 */
function cityMatches(cardCity: string, filterCity: string): boolean {
  if (!filterCity) return true;
  return citySlug(cardCity) === citySlug(filterCity);
}

export function applyFilters(
  cards: PropertyCardData[],
  filters: PropertyFilters,
  savedIds?: ReadonlySet<string>
): PropertyCardData[] {
  return cards.filter((card) => {
    if (!cityMatches(card.city, filters.city)) return false;
    if (
      filters.neighbourhood &&
      citySlug(card.neighbourhood) !== citySlug(filters.neighbourhood)
    )
      return false;
    if (filters.type && card.propertyType !== filters.type) return false;
    if (filters.beds != null && (card.bedrooms ?? 0) < filters.beds) return false;
    if (filters.baths != null && (card.bathrooms ?? 0) < filters.baths) return false;
    if (filters.minPrice != null && card.price < filters.minPrice) return false;
    if (filters.maxPrice != null && card.price > filters.maxPrice) return false;
    if (filters.minSize != null && (card.sizeSqm ?? 0) < filters.minSize) return false;
    if (filters.newOnly && !card.isNewDevelopment) return false;
    if (filters.savedOnly && !(savedIds?.has(card.id) ?? false)) return false;
    if (filters.features.length) {
      const owned = new Set(card.features);
      if (!filters.features.every((f) => owned.has(f))) return false;
    }
    return true;
  });
}

export function sortProperties(
  cards: PropertyCardData[],
  sort: SortKey
): PropertyCardData[] {
  const out = [...cards];
  switch (sort) {
    case "price-asc":
      return out.sort((a, b) => a.price - b.price);
    case "price-desc":
      return out.sort((a, b) => b.price - a.price);
    case "beds-desc":
      return out.sort((a, b) => (b.bedrooms ?? 0) - (a.bedrooms ?? 0));
    case "size-desc":
      return out.sort((a, b) => (b.sizeSqm ?? 0) - (a.sizeSqm ?? 0));
    case "newest":
    default:
      return out.sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
      );
  }
}

/**
 * Facet counts for the filter panel — every option shows how many properties
 * it would return, so nobody picks a filter that empties the grid.
 */
export interface Facets {
  cities: { value: string; count: number }[];
  neighbourhoods: { value: string; count: number }[];
  types: { value: string; count: number }[];
  features: { value: string; count: number }[];
}

export function buildFacets(cards: PropertyCardData[]): Facets {
  const cities = new Map<string, number>();
  const neighbourhoods = new Map<string, number>();
  const types = new Map<string, number>();
  const features = new Map<string, number>();

  for (const card of cards) {
    if (card.city) cities.set(card.city, (cities.get(card.city) ?? 0) + 1);
    if (card.neighbourhood)
      neighbourhoods.set(
        card.neighbourhood,
        (neighbourhoods.get(card.neighbourhood) ?? 0) + 1
      );
    if (card.propertyType)
      types.set(card.propertyType, (types.get(card.propertyType) ?? 0) + 1);
    for (const f of card.features) features.set(f, (features.get(f) ?? 0) + 1);
  }

  const toSorted = (m: Map<string, number>) =>
    Array.from(m.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    cities: toSorted(cities),
    neighbourhoods: toSorted(neighbourhoods),
    types: toSorted(types),
    features: toSorted(features),
  };
}
