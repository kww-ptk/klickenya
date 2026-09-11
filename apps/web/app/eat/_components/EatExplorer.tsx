"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import { isOpenNow } from "@/lib/listings/openingHours";

export type EatCard = ListingCardProps & {
  cuisine: string[];
};

export type CuisineTile = {
  name: string;
  count: number;
  photo: string;
};

/**
 * Colour-blocked tiles, cycled. Full class strings on purpose — Tailwind's
 * scanner cannot see classes assembled from template literals, so a computed
 * `border-${colour}` would silently ship without styles.
 */
const PALETTE = [
  { border: "border-amber", bar: "bg-amber", label: "text-dark" },
  { border: "border-teal", bar: "bg-teal", label: "text-white" },
  { border: "border-purple2", bar: "bg-purple2", label: "text-white" },
  { border: "border-amber2", bar: "bg-amber2", label: "text-dark" },
  { border: "border-green", bar: "bg-green", label: "text-white" },
  { border: "border-purple", bar: "bg-purple", label: "text-white" },
];

/**
 * The interactive core of /eat: pick a cuisine (or "open now") and the grid
 * below reshuffles instantly. No navigation, no requests — everything is
 * already on the page, so it stays fast and stays statically cacheable.
 *
 * "Open now" is computed in the browser against the reader's clock; a cached
 * page could not answer it correctly.
 */
export function EatExplorer({
  cards,
  cuisines,
}: {
  cards: EatCard[];
  cuisines: CuisineTile[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        if (active && !c.cuisine.includes(active)) return false;
        if (openOnly && isOpenNow(c.openingHours) !== true) return false;
        return true;
      }),
    [cards, active, openOnly],
  );

  const scroll = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 360, behavior: "smooth" });
  };

  return (
    <>
      {/* ── Cuisine rail — dark strip continuing the hero ── */}
      <div className="relative bg-dark pb-11 md:pb-14">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 pb-4">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber block">
            Pick a craving
          </span>
        </div>
        <div
          ref={railRef}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-px-5 px-5 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {cuisines.map((c, i) => {
            const tone = PALETTE[i % PALETTE.length];
            const isActive = active === c.name;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setActive((v) => (v === c.name ? null : c.name))}
                aria-pressed={isActive}
                className={`group relative shrink-0 snap-start w-[150px] sm:w-[180px] rounded-[18px] overflow-hidden border-[3px] ${tone.border} transition-transform duration-200 hover:-translate-y-1 ${
                  isActive ? "-translate-y-1 ring-2 ring-white/70" : ""
                }`}
              >
                <div className="relative aspect-[3/4] bg-dark">
                  {c.photo ? (
                    <Image
                      src={c.photo}
                      alt=""
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                </div>
                <div
                  className={`${tone.bar} ${tone.label} px-3 py-2.5 flex items-baseline justify-between gap-2`}
                >
                  <span className="font-display font-extrabold text-[14px] tracking-[-0.01em] uppercase truncate">
                    {c.name}
                  </span>
                  <span className="text-[11px] font-bold opacity-70 tabular-nums">
                    {c.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Rail arrows — pointer devices only; touch users just swipe. */}
        <div className="hidden md:block">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll cuisines left"
            className="absolute left-2 top-[38%] -translate-y-1/2 size-10 rounded-full bg-white/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors"
          >
            <ChevronLeft className="size-5 text-dark" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll cuisines right"
            className="absolute right-2 top-[38%] -translate-y-1/2 size-10 rounded-full bg-white/90 backdrop-blur border border-border shadow-sm flex items-center justify-center hover:bg-white transition-colors"
          >
            <ChevronRight className="size-5 text-dark" />
          </button>
        </div>
      </div>

      {/* ── Controls + results ───────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 pt-10">
        <div className="flex flex-wrap items-center gap-3 mb-7">
          <button
            type="button"
            onClick={() => setOpenOnly((v) => !v)}
            aria-pressed={openOnly}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-bold transition-colors ${
              openOnly
                ? "border-amber bg-amber text-dark"
                : "border-border bg-white text-text2 hover:border-amber hover:text-text"
            }`}
          >
            <Clock className="size-3.5" />
            Open now
          </button>

          <p className="text-text2 text-[14px] font-semibold" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "place" : "places"}
            {active ? ` · ${active}` : ""}
          </p>

          {(active || openOnly) && (
            <button
              type="button"
              onClick={() => {
                setActive(null);
                setOpenOnly(false);
              }}
              className="text-[13px] font-bold text-text3 hover:text-text underline underline-offset-4"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <ListingGrid listings={filtered} columns={4} />
        ) : (
          <div className="rounded-[22px] border border-border bg-surface px-6 py-14 text-center">
            <p className="text-text2 text-[15px]">
              Nothing open matches that right now. Try clearing a filter.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
