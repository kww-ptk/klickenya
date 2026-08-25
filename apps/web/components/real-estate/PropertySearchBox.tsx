"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES } from "@/lib/real-estate/constants";
import { LocationPicker, type LocationOption } from "./LocationPicker";
import {
  countMatches,
  digitsOnly,
  formatThousands,
  type SearchIndexEntry,
} from "@/lib/real-estate/searchIndex";

/**
 * Hero search.
 *
 * Previously this built a query string that the receiving page never read, so
 * every search returned the unfiltered category, and its "New Developments" tab
 * pushed to a URL that did not exist. Both are fixed. Beyond that it was a bare
 * text field for location with no idea what was on the market, unformatted
 * price boxes, and a bedrooms selector shown even when searching land.
 *
 * It now offers only locations that have listings, counts matches live so
 * nobody submits into an empty grid, formats prices as you type, validates the
 * range, and hides fields that make no sense for the selected tab.
 */

const TABS = [
  { id: "for-sale", href: "/real-estate/for-sale", icon: "🏠", label: "Buy" },
  { id: "for-rent", href: "/real-estate/for-rent", icon: "🔑", label: "Rent" },
  { id: "land", href: "/real-estate/land", icon: "🌍", label: "Land" },
  { id: "commercial", href: "/real-estate/commercial", icon: "🏢", label: "Commercial" },
  {
    id: "new-developments",
    href: "/real-estate/new-developments",
    icon: "🏗",
    label: "New Developments",
  },
] as const;

/** Bedrooms are meaningless on a plot or a warehouse. */
const TABS_WITHOUT_BEDROOMS = new Set(["land", "commercial"]);

/** Offering "Apartment" under the Land tab just invites an empty result. */
const TYPES_FOR_TAB: Record<string, string[]> = {
  land: ["land"],
  commercial: ["commercial"],
};

const fieldCls =
  "w-full bg-transparent text-[16px] font-medium text-text outline-none placeholder:text-text3";

const wrapCls =
  "flex flex-col gap-0.5 rounded-[14px] border border-border px-4 py-2.5 text-left transition-colors focus-within:border-purple2";

const labelCls = "text-[10px] font-bold uppercase tracking-[0.06em] text-text";

function PropertySearchBox({
  locations = [],
  index = [],
}: {
  locations?: LocationOption[];
  index?: SearchIndexEntry[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("for-sale");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const showBedrooms = !TABS_WITHOUT_BEDROOMS.has(activeTab);
  const allowedTypes = TYPES_FOR_TAB[activeTab];
  const typeOptions = allowedTypes
    ? PROPERTY_TYPES.filter((t) => allowedTypes.includes(t.value))
    : PROPERTY_TYPES.filter((t) => t.value !== "land" && t.value !== "commercial");

  const min = minPrice ? Number(minPrice) : null;
  const max = maxPrice ? Number(maxPrice) : null;
  const rangeInverted = min != null && max != null && min > max;

  const matches = useMemo(
    () =>
      index.length === 0
        ? null
        : countMatches(index, {
            category: activeTab,
            location,
            type: propertyType,
            beds: showBedrooms ? bedrooms : "",
            minPrice: rangeInverted ? null : min,
            maxPrice: rangeInverted ? null : max,
          }),
    [index, activeTab, location, propertyType, bedrooms, showBedrooms, min, max, rangeInverted]
  );

  function selectTab(id: string) {
    setActiveTab(id);
    // Carrying a bedroom count into a land search would silently exclude
    // every plot, because plots have no bedrooms.
    if (TABS_WITHOUT_BEDROOMS.has(id)) setBedrooms("");
    // Same for a property type the new tab does not offer.
    const allowed = TYPES_FOR_TAB[id];
    if (allowed && propertyType && !allowed.includes(propertyType)) setPropertyType("");
    if (!allowed && (propertyType === "land" || propertyType === "commercial")) {
      setPropertyType("");
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rangeInverted) return;

    const params = new URLSearchParams();
    if (location.trim()) params.set("city", location.trim());
    if (propertyType) params.set("type", propertyType);
    if (showBedrooms && bedrooms) params.set("beds", bedrooms);
    if (min != null) params.set("minPrice", String(min));
    if (max != null) params.set("maxPrice", String(max));

    const target = TABS.find((t) => t.id === activeTab)?.href ?? "/real-estate/for-sale";
    const qs = params.toString();
    router.push(qs ? `${target}?${qs}` : target);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search properties"
      className="w-full max-w-[880px] overflow-visible rounded-[26px] bg-white/97 shadow-xl backdrop-blur-[20px]"
    >
      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border px-1.5 scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 px-4 py-3.5 text-[13px] font-semibold transition-colors duration-200",
                isActive
                  ? "border-purple2 text-purple2"
                  : "border-transparent text-text3 hover:text-text"
              )}
            >
              <span aria-hidden="true">{tab.icon}</span> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Fields */}
      <div
        className={cn(
          "grid grid-cols-1 items-stretch gap-2.5 p-3 sm:grid-cols-2",
          showBedrooms
            ? "lg:grid-cols-[1.2fr_1fr_0.85fr_1.3fr_auto]"
            : "lg:grid-cols-[1.3fr_1fr_1.4fr_auto]"
        )}
      >
        <div className={wrapCls}>
          <span className={labelCls} id="search-location-label">
            Location
          </span>
          <LocationPicker
            value={location}
            onChange={setLocation}
            options={locations}
            onSubmit={() => handleSubmit(new Event("submit") as unknown as FormEvent)}
          />
        </div>

        <div className={wrapCls}>
          <label className={labelCls} htmlFor="search-type">
            Property type
          </label>
          <select
            id="search-type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={cn(fieldCls, "cursor-pointer appearance-none")}
          >
            <option value="">Any type</option>
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {showBedrooms && (
          <div className={wrapCls}>
            <label className={labelCls} htmlFor="search-beds">
              Bedrooms
            </label>
            <select
              id="search-beds"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className={cn(fieldCls, "cursor-pointer appearance-none")}
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          className={cn(
            wrapCls,
            rangeInverted && "border-[#EF4444] focus-within:border-[#EF4444]"
          )}
        >
          <span className={labelCls}>Price range (KSh)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Minimum price in Kenyan shillings"
              aria-invalid={rangeInverted}
              placeholder="Min"
              value={formatThousands(minPrice)}
              onChange={(e) => setMinPrice(digitsOnly(e.target.value))}
              className={fieldCls}
            />
            <span className="text-[13px] text-text3" aria-hidden="true">
              to
            </span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Maximum price in Kenyan shillings"
              aria-invalid={rangeInverted}
              placeholder="Max"
              value={formatThousands(maxPrice)}
              onChange={(e) => setMaxPrice(digitsOnly(e.target.value))}
              className={fieldCls}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={rangeInverted}
          className={cn(
            "col-span-full flex h-[52px] items-center justify-center gap-2 self-center rounded-[18px] px-7 text-[15px] font-bold transition-all duration-200 lg:col-span-1",
            rangeInverted
              ? "cursor-not-allowed bg-border text-text3"
              : "bg-purple2 text-white shadow-[0_4px_16px_rgba(139,77,171,0.35)] hover:bg-[#9B5ABF]"
          )}
        >
          <Search className="size-4" />
          {/* While the range is inverted the count is computed with the price
              ignored, so showing it would promise results the search cannot
              honour. */}
          {rangeInverted
            ? "Check price range"
            : matches == null
              ? "Search"
              : matches === 0
                ? "No matches"
                : `Show ${matches}`}
        </button>
      </div>

      {/* Feedback sits outside the grid so it never shifts the fields. */}
      {(rangeInverted || matches === 0) && (
        <p
          role="status"
          className="px-4 pb-3.5 text-[13px] font-medium text-text2"
        >
          {rangeInverted
            ? "The minimum price is above the maximum."
            : "Nothing matches yet. Try a wider price range or clear the location."}
        </p>
      )}
    </form>
  );
}

export { PropertySearchBox };
