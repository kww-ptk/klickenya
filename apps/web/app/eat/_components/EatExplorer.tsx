"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Clock, ShoppingBag } from "lucide-react";
import { FoodGrid, type FoodCardData } from "@/components/eat/FoodCard";
import { isOpenNow } from "@/lib/listings/openingHours";

export type EatCard = FoodCardData;

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
  const [orderOnly, setOrderOnly] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      cards.filter((c) => {
        if (active && !c.cuisine.includes(active)) return false;
        if (orderOnly && !c.canOrder) return false;
        if (openOnly && isOpenNow(c.openingHours) !== true) return false;
        return true;
      }),
    [cards, active, openOnly, orderOnly],
  );

  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /** Which arrows to show. Tolerance absorbs sub-pixel scroll positions. */
  const updateEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  // Run once mounted, and again on resize — a wide viewport can fit every
  // tile, in which case neither arrow should ever appear.
  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  const scroll = useCallback((dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Advance by a viewport of tiles, less one, so nothing is skipped over.
    const step = Math.max(el.clientWidth - 160, 200);
    el.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
  }, []);

  /** Arrow keys page the rail when it has focus. */
  const onRailKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scroll(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        scroll(-1);
      }
    },
    [scroll],
  );

  return (
    <>
      {/* ── Cuisine slider — dark strip continuing the hero ── */}
      <div className="relative bg-dark pb-11 md:pb-14">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 pb-4 flex items-end justify-between gap-4">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber block">
            Pick a craving
          </span>
          <span className="text-[11px] font-semibold text-white/35 tabular-nums hidden sm:block">
            {cuisines.length} cuisines
          </span>
        </div>

        <div
          ref={railRef}
          role="group"
          aria-label="Filter restaurants by cuisine"
          tabIndex={0}
          onScroll={updateEdges}
          onKeyDown={onRailKeyDown}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-px-5 md:scroll-px-10 px-5 md:px-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-dark rounded-[4px]"
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
                className={`group relative shrink-0 snap-start w-[142px] sm:w-[172px] aspect-[3/4] rounded-[18px] overflow-hidden ${tone.bar} transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-dark ${
                  isActive ? "-translate-y-1 ring-2 ring-white ring-offset-2 ring-offset-dark" : ""
                }`}
              >
                {/* Photo is TEXTURE, not subject. Restaurant cover shots are
                    venue photography — a beach, a villa, a boat — so showing
                    one as "this is Seafood" reads as a mistake. Desaturated
                    and dropped behind the colour, it adds depth without
                    claiming to depict the cuisine. */}
                {c.photo ? (
                  <Image
                    src={c.photo}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 142px, 172px"
                    className="object-cover opacity-25 grayscale mix-blend-luminosity"
                  />
                ) : null}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10"
                />

                <div className="absolute inset-0 p-3.5 flex flex-col justify-end text-left">
                  <span
                    className={`font-display font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-[clamp(16px,1.6vw,20px)] ${tone.label}`}
                  >
                    {c.name}
                  </span>
                  <span
                    className={`text-[11px] font-bold tabular-nums opacity-65 mt-1 ${tone.label}`}
                  >
                    {c.count} {c.count === 1 ? "place" : "places"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Arrows: pointer devices only — touch users swipe. 44px minimum
            touch target, and they disappear at the ends rather than sitting
            there doing nothing. */}
        <div className="hidden md:block">
          {!atStart && (
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label="Previous cuisines"
              className="absolute left-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-amber transition-colors"
            >
              <ChevronLeft className="size-5 text-dark" />
            </button>
          )}
          {!atEnd && (
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label="More cuisines"
              className="absolute right-3 top-1/2 -translate-y-1/2 size-11 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-amber transition-colors"
            >
              <ChevronRight className="size-5 text-dark" />
            </button>
          )}
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

          <button
            type="button"
            onClick={() => setOrderOnly((v) => !v)}
            aria-pressed={orderOnly}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-[13px] font-bold transition-colors ${
              orderOnly
                ? "border-amber bg-amber text-dark"
                : "border-border bg-white text-text2 hover:border-amber hover:text-text"
            }`}
          >
            <ShoppingBag className="size-3.5" />
            Order online
          </button>

          <p className="text-text2 text-[14px] font-semibold" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "place" : "places"}
            {active ? ` · ${active}` : ""}
          </p>

          {(active || openOnly || orderOnly) && (
            <button
              type="button"
              onClick={() => {
                setActive(null);
                setOpenOnly(false);
                setOrderOnly(false);
              }}
              className="text-[13px] font-bold text-text3 hover:text-text underline underline-offset-4"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length > 0 ? (
          <FoodGrid items={filtered} />
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
