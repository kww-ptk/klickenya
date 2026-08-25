"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LISTED_BY_LABELS,
  PROPERTY_TYPE_LABELS,
  type ListedBy,
} from "@/lib/real-estate/constants";
import {
  SORT_OPTIONS,
  type Facets,
  type PropertyFilters,
} from "@/lib/real-estate/filters";

/* Inputs are 16px throughout — anything smaller makes iOS Safari zoom the
   viewport on focus (see CLAUDE.md). The old search box used 14px. */
const fieldCls =
  "w-full rounded-[12px] border-[1.5px] border-border bg-white px-3.5 py-2.5 text-[16px] text-text outline-none transition-colors focus:border-purple2 placeholder:text-text3";

const labelCls =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-text3";

interface PropertyFilterPanelProps {
  filters: PropertyFilters;
  facets: Facets;
  onChange: (patch: Partial<PropertyFilters>) => void;
  onReset: () => void;
  /** Hidden on /real-estate/[category]/[city], where the city is the page. */
  showCityFilter?: boolean;
  showNeighbourhoodFilter?: boolean;
  className?: string;
}

function PropertyFilterPanel({
  filters,
  facets,
  onChange,
  onReset,
  showCityFilter = true,
  showNeighbourhoodFilter = true,
  className,
}: PropertyFilterPanelProps) {
  function toggleFeature(feature: string) {
    const next = filters.features.includes(feature)
      ? filters.features.filter((f) => f !== feature)
      : [...filters.features, feature];
    onChange({ features: next });
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {showCityFilter && facets.cities.length > 1 && (
        <div>
          <label className={labelCls} htmlFor="filter-city">
            City
          </label>
          <select
            id="filter-city"
            className={fieldCls}
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value, neighbourhood: "" })}
          >
            <option value="">All cities</option>
            {facets.cities.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value} ({c.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {showNeighbourhoodFilter && facets.neighbourhoods.length > 1 && (
        <div>
          <label className={labelCls} htmlFor="filter-neighbourhood">
            Neighbourhood
          </label>
          <select
            id="filter-neighbourhood"
            className={fieldCls}
            value={filters.neighbourhood}
            onChange={(e) => onChange({ neighbourhood: e.target.value })}
          >
            <option value="">All neighbourhoods</option>
            {facets.neighbourhoods.map((n) => (
              <option key={n.value} value={n.value}>
                {n.value} ({n.count})
              </option>
            ))}
          </select>
        </div>
      )}

      {facets.types.length > 1 && (
        <div>
          <label className={labelCls} htmlFor="filter-type">
            Property type
          </label>
          <select
            id="filter-type"
            className={fieldCls}
            value={filters.type}
            onChange={(e) => onChange({ type: e.target.value })}
          >
            <option value="">Any type</option>
            {facets.types.map((t) => (
              <option key={t.value} value={t.value}>
                {PROPERTY_TYPE_LABELS[t.value] ?? t.value} ({t.count})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="filter-beds">
            Bedrooms
          </label>
          <select
            id="filter-beds"
            className={fieldCls}
            value={filters.beds ?? ""}
            onChange={(e) =>
              onChange({ beds: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="filter-baths">
            Bathrooms
          </label>
          <select
            id="filter-baths"
            className={fieldCls}
            value={filters.baths ?? ""}
            onChange={(e) =>
              onChange({ baths: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className={labelCls}>Price range (KSh)</span>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Minimum price in Kenyan shillings"
            placeholder="Min"
            className={fieldCls}
            value={filters.minPrice ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              onChange({ minPrice: digits ? Number(digits) : null });
            }}
          />
          <input
            type="text"
            inputMode="numeric"
            aria-label="Maximum price in Kenyan shillings"
            placeholder="Max"
            className={fieldCls}
            value={filters.maxPrice ?? ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              onChange({ maxPrice: digits ? Number(digits) : null });
            }}
          />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="filter-size">
          Minimum size (m&sup2;)
        </label>
        <input
          id="filter-size"
          type="text"
          inputMode="numeric"
          placeholder="Any size"
          className={fieldCls}
          value={filters.minSize ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onChange({ minSize: digits ? Number(digits) : null });
          }}
        />
      </div>

      {facets.features.length > 0 && (
        <div>
          <span className={labelCls}>Features</span>
          <div className="flex flex-wrap gap-1.5">
            {facets.features.map((f) => {
              const active = filters.features.includes(f.value);
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleFeature(f.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "border-purple2 bg-purple2/10 text-purple2"
                      : "border-border bg-white text-text2 hover:border-text3"
                  )}
                >
                  {f.value}
                  <span className="ml-1 text-text3">{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {facets.listedBy.length > 1 && (
        <div>
          <label className={labelCls} htmlFor="filter-listed-by">
            Listed by
          </label>
          <select
            id="filter-listed-by"
            className={fieldCls}
            value={filters.listedBy}
            onChange={(e) => onChange({ listedBy: e.target.value })}
          >
            <option value="">Anyone</option>
            {facets.listedBy.map((l) => (
              <option key={l.value} value={l.value}>
                {LISTED_BY_LABELS[l.value as ListedBy] ?? l.value} ({l.count})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium text-text2">
          <input
            type="checkbox"
            className="size-[18px] accent-purple2"
            checked={filters.newOnly}
            onChange={(e) => onChange({ newOnly: e.target.checked })}
          />
          New developments only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium text-text2">
          <input
            type="checkbox"
            className="size-[18px] accent-purple2"
            checked={filters.savedOnly}
            onChange={(e) => onChange({ savedOnly: e.target.checked })}
          />
          Saved properties only
        </label>
      </div>

      <div>
        <label className={labelCls} htmlFor="filter-sort">
          Sort by
        </label>
        <select
          id="filter-sort"
          className={fieldCls}
          value={filters.sort}
          onChange={(e) =>
            onChange({ sort: e.target.value as PropertyFilters["sort"] })
          }
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="flex items-center justify-center gap-1.5 rounded-[12px] border border-border py-2.5 text-[14px] font-semibold text-text2 transition-colors hover:border-text3 hover:text-text"
      >
        <X className="size-3.5" />
        Clear all filters
      </button>
    </div>
  );
}

export { PropertyFilterPanel };
