"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import {
  LISTED_BY_LABELS,
  PROPERTY_TYPE_LABELS,
  type ListedBy,
} from "@/lib/real-estate/constants";
import { formatPrice } from "@/lib/real-estate/format";
import { convert, roundConverted } from "@/lib/real-estate/currency";
import { useDisplayCurrency } from "@/components/currency/CurrencyProvider";
import type { PropertyCardData } from "@/lib/real-estate/mappers";
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  applyFilters,
  buildFacets,
  countActiveFilters,
  parseFilters,
  serialiseFilters,
  sortProperties,
  type PropertyFilters,
} from "@/lib/real-estate/filters";
import { useSavedProperties } from "@/lib/real-estate/useSavedProperties";
import { PropertyCard } from "./PropertyCard";
import { PropertyGrid } from "./PropertyGrid";
import { PropertyFilterPanel } from "./PropertyFilterPanel";

/**
 * Filtering runs in the browser over the full category set, which the server
 * already renders into the HTML. That keeps the page statically generated (good
 * for indexing — every property link is in the source) while filters respond
 * instantly with no round trip.
 *
 * If a single category ever passes roughly 500 live properties, move this to a
 * server-side filtered fetch with real pagination; below that the payload is
 * smaller than the images on the page.
 */

interface PropertyBrowserProps {
  cards: PropertyCardData[];
  showCityFilter?: boolean;
  showNeighbourhoodFilter?: boolean;
  /** Copy for the zero-results state, e.g. "properties for sale in Nairobi". */
  emptyLabel: string;
}

function PropertyBrowser({
  cards,
  showCityFilter = true,
  showNeighbourhoodFilter = true,
  emptyLabel,
}: PropertyBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { savedIds } = useSavedProperties();
  const { currency: display, rates } = useDisplayCurrency();

  // Filter values are shillings in the URL; chips read in the viewer's currency.
  const asDisplay = (kes: number) =>
    formatPrice(roundConverted(convert(kes, "KES", display, rates)), display);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const facets = useMemo(() => buildFacets(cards), [cards]);
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const results = useMemo(() => {
    const filtered = applyFilters(cards, filters, savedSet);
    return sortProperties(filtered, filters.sort);
  }, [cards, filters, savedSet]);

  const activeCount = countActiveFilters(filters);

  const push = useCallback(
    (next: PropertyFilters) => {
      const qs = serialiseFilters(next);
      // replace, not push — filter tweaks should not stack up in the back stack.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const handleChange = useCallback(
    (patch: Partial<PropertyFilters>) => push({ ...filters, ...patch }),
    [filters, push]
  );

  const handleReset = useCallback(() => push(EMPTY_FILTERS), [push]);

  /* Chips summarising what is currently applied, each individually removable. */
  const chips: { label: string; clear: Partial<PropertyFilters> }[] = [];
  if (filters.city) chips.push({ label: filters.city, clear: { city: "" } });
  if (filters.neighbourhood)
    chips.push({ label: filters.neighbourhood, clear: { neighbourhood: "" } });
  if (filters.type)
    chips.push({
      label: PROPERTY_TYPE_LABELS[filters.type] ?? filters.type,
      clear: { type: "" },
    });
  if (filters.beds) chips.push({ label: `${filters.beds}+ beds`, clear: { beds: null } });
  if (filters.baths)
    chips.push({ label: `${filters.baths}+ baths`, clear: { baths: null } });
  if (filters.minPrice)
    chips.push({ label: `From ${asDisplay(filters.minPrice)}`, clear: { minPrice: null } });
  if (filters.maxPrice)
    chips.push({ label: `Up to ${asDisplay(filters.maxPrice)}`, clear: { maxPrice: null } });
  if (filters.minSize)
    chips.push({ label: `${filters.minSize}m²+`, clear: { minSize: null } });
  if (filters.listedBy)
    chips.push({
      label: LISTED_BY_LABELS[filters.listedBy as ListedBy] ?? filters.listedBy,
      clear: { listedBy: "" },
    });
  if (filters.newOnly) chips.push({ label: "New developments", clear: { newOnly: false } });
  if (filters.savedOnly) chips.push({ label: "Saved only", clear: { savedOnly: false } });
  for (const f of filters.features)
    chips.push({
      label: f,
      clear: { features: filters.features.filter((x) => x !== f) },
    });

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      {/* ── Desktop sidebar ─────────────────── */}
      <aside className="hidden w-[276px] shrink-0 lg:block">
        <div className="sticky top-[88px] rounded-[24px] border border-border bg-white p-5">
          <h2 className="mb-4 text-[15px] font-bold text-text">Refine search</h2>
          <PropertyFilterPanel
            filters={filters}
            facets={facets}
            onChange={handleChange}
            onReset={handleReset}
            showCityFilter={showCityFilter}
            showNeighbourhoodFilter={showNeighbourhoodFilter}
          />
        </div>
      </aside>

      {/* ── Results ─────────────────────────── */}
      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-text" aria-live="polite">
            {results.length}{" "}
            <span className="font-normal text-text2">
              {results.length === 1 ? "property" : "properties"}
              {activeCount > 0 && cards.length !== results.length
                ? ` of ${cards.length}`
                : ""}
            </span>
          </p>

          <div className="flex items-center gap-2">
            {/* Mobile filter trigger */}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-[14px] font-semibold text-text2 lg:hidden"
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {activeCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-purple2 text-[11px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Sort — always reachable without opening the sheet */}
            <label className="sr-only" htmlFor="sort-inline">
              Sort properties
            </label>
            <select
              id="sort-inline"
              value={filters.sort}
              onChange={(e) =>
                handleChange({ sort: e.target.value as PropertyFilters["sort"] })
              }
              className="rounded-full border border-border bg-white px-4 py-2 text-[16px] font-semibold text-text2 outline-none focus:border-purple2"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChange(chip.clear)}
                className="flex items-center gap-1.5 rounded-full border border-purple2/30 bg-purple2/8 px-3 py-1.5 text-[13px] font-semibold text-purple2 transition-colors hover:bg-purple2/15"
              >
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-1.5 text-[13px] font-semibold text-text3 underline-offset-2 hover:text-text hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Grid */}
        {results.length > 0 ? (
          <PropertyGrid variant="standard">
            {results.map((card, i) => (
              <PropertyCard key={card.id} {...card} priority={i === 0} />
            ))}
          </PropertyGrid>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border py-20 text-center">
            <span className="mb-4 text-[44px]" aria-hidden="true">
              🏠
            </span>
            <p className="mb-2 text-[18px] font-semibold text-text">
              {activeCount > 0
                ? "No properties match these filters"
                : `No ${emptyLabel} yet`}
            </p>
            <p className="mb-6 max-w-[380px] text-[15px] text-text2">
              {activeCount > 0
                ? "Try widening your price range or clearing a filter."
                : "We add new properties every week. Check back soon or explore another category."}
            </p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full bg-purple2 px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-[#9B5ABF]"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile filter sheet ─────────────── */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-dark/45 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter properties"
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white p-6 pb-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[18px] font-bold text-text">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="flex size-9 items-center justify-center rounded-full bg-surface text-text2"
              >
                <X className="size-4" />
              </button>
            </div>

            <PropertyFilterPanel
              filters={filters}
              facets={facets}
              onChange={handleChange}
              onReset={handleReset}
              showCityFilter={showCityFilter}
              showNeighbourhoodFilter={showNeighbourhoodFilter}
            />

            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 w-full rounded-[16px] bg-purple2 py-3.5 text-[15px] font-bold text-white"
            >
              Show {results.length}{" "}
              {results.length === 1 ? "property" : "properties"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { PropertyBrowser };
