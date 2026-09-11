"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import { isOpenNow } from "@/lib/listings/openingHours";

export type EatCityCard = ListingCardProps & {
  cuisine: string[];
  priceRangeKey?: string;
};

const PRICE_LABELS: Record<string, string> = {
  budget: "$ Budget",
  "mid-range": "$$ Mid-range",
  "fine-dining": "$$$ Fine dining",
};

/**
 * Client-side filtering over the statically rendered set — no requests, no
 * loading states. This is what the marketplace city grid at
 * /restaurants/[city] cannot do, and the reason the /eat hub is a distinct
 * page rather than a duplicate of it.
 *
 * "Open now" is computed in the browser because it depends on the reader's
 * current time; rendering it on a statically cached page would be wrong
 * within the hour.
 */
export function EatCityFilters({
  cards,
  cuisines,
  priceRanges,
}: {
  cards: EatCityCard[];
  cuisines: string[];
  priceRanges: string[];
}) {
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (cuisine && !c.cuisine.includes(cuisine)) return false;
      if (price && c.priceRangeKey !== price) return false;
      if (openOnly && isOpenNow(c.openingHours) !== true) return false;
      return true;
    });
  }, [cards, cuisine, price, openOnly]);

  const chip =
    "px-3.5 py-2 rounded-full border text-[13px] font-semibold transition-colors";
  const off = "border-border bg-white text-text2 hover:border-amber hover:text-text";
  const on = "border-amber bg-amber-dim text-amber-700";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-7">
        <button
          type="button"
          onClick={() => setOpenOnly((v) => !v)}
          aria-pressed={openOnly}
          className={`${chip} ${openOnly ? on : off} inline-flex items-center gap-1.5`}
        >
          <Clock className="size-3.5" />
          Open now
        </button>

        {cuisines.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCuisine((v) => (v === c ? null : c))}
            aria-pressed={cuisine === c}
            className={`${chip} ${cuisine === c ? on : off}`}
          >
            {c}
          </button>
        ))}

        {priceRanges.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPrice((v) => (v === p ? null : p))}
            aria-pressed={price === p}
            className={`${chip} ${price === p ? on : off}`}
          >
            {PRICE_LABELS[p] ?? p}
          </button>
        ))}

        {(cuisine || price || openOnly) && (
          <button
            type="button"
            onClick={() => {
              setCuisine(null);
              setPrice(null);
              setOpenOnly(false);
            }}
            className="text-[13px] font-semibold text-text3 hover:text-text underline underline-offset-4 ml-1"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-text2 text-[14px] mb-6" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "place" : "places"}
        {openOnly && " open right now"}
      </p>

      {filtered.length > 0 ? (
        <ListingGrid listings={filtered} columns={4} />
      ) : (
        <div className="rounded-[22px] border border-border bg-surface px-6 py-14 text-center">
          <p className="text-text2 text-[15px]">
            Nothing matches that combination. Try clearing a filter.
          </p>
        </div>
      )}
    </>
  );
}
