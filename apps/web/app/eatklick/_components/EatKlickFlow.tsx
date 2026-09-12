"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UtensilsCrossed,
  X,
  ChevronRight,
  Plus,
  Minus,
  ShoppingBasket,
  Pill,
  Wine,
  MapPin,
  ArrowLeft,
  ShoppingBag,
  CalendarCheck,
  Check,
} from "lucide-react";
import { isOpenNow } from "@/lib/listings/openingHours";
import type { MenuSectionLite, MenuItemLite } from "@/lib/eat/menus";
import { matchesFoodTag } from "@/lib/eat/foodTags";
import { useEatCart } from "@/components/eat/useEatCart";
import { CartPanel } from "@/components/eat/CartPanel";

export type Town = { slug: string; label: string; count: number; photo: string };

export type Place = {
  id: string;
  name: string;
  town: string;
  category: CategoryKey;
  cuisine: string[];
  priceRange?: string;
  openingHours?: string;
  isVerified: boolean;
  photo: string;
  href: string;
  orderHref?: string;
  canBook: boolean;
  /** Dish tags derived from this kitchen's own item names. */
  foodTags: string[];
  menu: MenuSectionLite[];
  menuId: string;
  /** menus.slug — the tracking link needs it whether or not ordering is on. */
  menuSlug: string;
  whatsappPhone: string;
};

type CategoryKey = "restaurant" | "grocery" | "pharmacy" | "liquor";

const CATEGORIES: {
  key: CategoryKey;
  label: string;
  icon: typeof UtensilsCrossed;
  tone: string;
  live: boolean;
}[] = [
  { key: "restaurant", label: "Restaurant", icon: UtensilsCrossed, tone: "bg-amber text-dark", live: true },
  { key: "grocery", label: "Grocery", icon: ShoppingBasket, tone: "bg-green text-white", live: false },
  { key: "pharmacy", label: "Pharmacy", icon: Pill, tone: "bg-teal text-white", live: false },
  { key: "liquor", label: "Liquor", icon: Wine, tone: "bg-purple2 text-white", live: false },
];

/** `town` is a slug for filtering; it needs a label when shown to a reader. */
function titleCase(slug?: string): string {
  if (!slug) return "";
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Full class strings — Tailwind cannot see classes built from template
 *  literals, so a computed `border-${tone}` would ship unstyled. */
const TOWN_PALETTE = [
  { border: "border-amber", bar: "bg-amber", label: "text-dark" },
  { border: "border-teal", bar: "bg-teal", label: "text-white" },
  { border: "border-purple2", bar: "bg-purple2", label: "text-white" },
  { border: "border-amber2", bar: "bg-amber2", label: "text-dark" },
  { border: "border-green", bar: "bg-green", label: "text-white" },
];

const PRICE_GLYPH: Record<string, string> = {
  budget: "$",
  "mid-range": "$$",
  "fine-dining": "$$$",
};

/**
 * Three steps on one screen: town → category → browse.
 *
 * Steps are all mounted and toggled with opacity/transform rather than
 * unmounted, so returning to a previous step is instant and the browser keeps
 * its scroll position. `hidden` on the inactive panels keeps them out of the
 * accessibility tree and out of tab order.
 */
export function EatKlickFlow({ towns, places }: { towns: Town[]; places: Place[] }) {
  const [town, setTown] = useState<Town | null>(null);
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [foodTag, setFoodTag] = useState<string | null>(null);
  const [open, setOpen] = useState<Place | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { cart, add, setQty, clear, total, count } = useEatCart();

  const step = category ? 3 : town ? 2 : 1;

  const inScope = useMemo(() => {
    if (!town || !category) return [];
    return places.filter((p) => p.town === town.slug && p.category === category);
  }, [places, town, category]);

  /** Dish tags actually present in this town, so a chip never returns nothing. */
  const foodTags = useMemo(
    () => [...new Set(inScope.flatMap((p) => p.foodTags))].sort(),
    [inScope],
  );

  const results = useMemo(
    () => (foodTag ? inScope.filter((p) => p.foodTags.includes(foodTag)) : inScope),
    [inScope, foodTag],
  );

  const activeCategory = CATEGORIES.find((c) => c.key === category);

  // Per-town availability, so a category can say how many it has before it is picked.
  const countFor = (key: CategoryKey) =>
    town ? places.filter((p) => p.town === town.slug && p.category === key).length : 0;

  return (
    <main className="min-h-[100dvh] bg-purple-dark text-white flex flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(110%_80%_at_50%_0%,rgba(232,160,32,0.20),transparent_60%)]"
      />

      {/* ── Top bar ─────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 py-5">
        <Link href="/eat" className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
          klick<span className="text-amber">.</span>
        </Link>

        <ol className="flex items-center gap-2" aria-label="Progress">
          {[1, 2, 3].map((n) => (
            <li
              key={n}
              aria-current={step === n ? "step" : undefined}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === n ? "w-7 bg-amber" : step > n ? "w-3 bg-amber/50" : "w-3 bg-white/15"
              }`}
            />
          ))}
        </ol>
      </header>

      <div className="relative z-10 flex-1 flex flex-col justify-center px-5 md:px-8 pb-24 md:pb-10">
        <div className="w-full max-w-[1040px] mx-auto">
          {/* Back */}
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                if (category) {
                  setCategory(null);
                  setFoodTag(null);
                } else {
                  setTown(null);
                }
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-white/55 hover:text-white transition-colors mb-5"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
          )}

          {/* ── Step 1 · Town ────────────────────────────── */}
          <section hidden={step !== 1} aria-label="Choose your town">
            <Panel active={step === 1}>
              <div className="text-center">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-7">
                  <UtensilsCrossed className="size-3.5 text-amber" />
                  <span className="text-[13px] font-semibold text-white/85">
                    Watamu · Kilifi · the Kenyan coast
                  </span>
                </div>

                <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.045em] leading-[0.92] text-[clamp(34px,7vw,72px)] mb-4">
                  Crave it.
                  <br />
                  Tap it. Eat it.
                </h1>
                <p className="text-white/55 text-[15.5px] md:text-[16px] max-w-[460px] mx-auto mb-9">
                  Start with your town — we&apos;ll show what&apos;s open near you.
                </p>
              </div>

              {/* Same colour-blocked tile language as /eat's cuisine slider. */}
              <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 md:mx-0 md:px-0 md:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {towns.map((t, i) => {
                  const tone = TOWN_PALETTE[i % TOWN_PALETTE.length];
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setTown(t)}
                      className={`group relative shrink-0 snap-start w-[150px] sm:w-[190px] rounded-[16px] overflow-hidden border-[3px] ${tone.border} transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-dark`}
                    >
                      <div className="relative aspect-square sm:aspect-[3/4] bg-purple-dark">
                        {t.photo ? (
                          <Image
                            src={t.photo}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 150px, 190px"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <span className={`absolute inset-0 ${tone.bar}`} />
                        )}
                      </div>
                      <div className={`${tone.bar} ${tone.label} px-3 py-2.5 text-left`}>
                        <span className="block font-display font-extrabold uppercase leading-none tracking-[-0.01em] text-[14px] sm:text-[15px] truncate">
                          {t.label}
                        </span>
                        <span className="block text-[10.5px] font-bold opacity-70 tabular-nums mt-0.5">
                          {t.count} {t.count === 1 ? "place" : "places"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </section>

          {/* ── Step 2 · Category ────────────────────────── */}
          <section hidden={step !== 2} aria-label="Choose a category">
            <Panel active={step === 2}>
              <Eyebrow>Step two · {town?.label}</Eyebrow>
              <Heading>What do you need?</Heading>
              <Sub>Restaurants are live. The rest are on the way.</Sub>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
                {CATEGORIES.map((c) => {
                  const n = countFor(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCategory(c.key)}
                      className="group relative rounded-[18px] border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-amber p-5 text-left transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <span
                        className={`inline-flex size-10 rounded-full items-center justify-center ${c.tone} mb-3`}
                      >
                        <c.icon className="size-5" />
                      </span>
                      <p className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
                        {c.label}
                      </p>
                      <p className="text-[12px] font-semibold text-white/45 mt-0.5">
                        {!c.live
                          ? "Coming soon"
                          : town
                            ? `${n} in ${town.label}`
                            : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </section>

          {/* ── Step 3 · Browse ──────────────────────────── */}
          <section hidden={step !== 3} aria-label="Browse results">
            <Panel active={step === 3}>
              <Eyebrow>
                {town?.label} · {activeCategory?.label}
              </Eyebrow>
              <Heading>
                {results.length > 0
                  ? `${results.length} to choose from`
                  : `No ${activeCategory?.label.toLowerCase()} yet`}
              </Heading>

              {foodTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {foodTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFoodTag((v) => (v === t ? null : t))}
                      aria-pressed={foodTag === t}
                      className={`px-3.5 py-2 rounded-full text-[13px] font-bold border transition-colors ${
                        foodTag === t
                          ? "border-amber bg-amber text-dark"
                          : "border-white/20 text-white/70 hover:border-amber hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {foodTag && (
                    <button
                      type="button"
                      onClick={() => setFoodTag(null)}
                      className="px-2 text-[13px] font-bold text-white/45 hover:text-white underline underline-offset-4"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {results.length > 0 ? (
                <div className="mt-6 max-h-[42vh] overflow-y-auto pr-1 -mr-1 flex flex-col gap-2.5">
                  {results.map((p) => (
                    <ResultCard key={p.id} place={p} onOpen={() => setOpen(p)} />
                  ))}
                </div>
              ) : (
                <div className="mt-7 rounded-[20px] border border-white/15 bg-white/[0.06] px-6 py-10 max-w-[560px]">
                  <p className="text-white/70 text-[15px] leading-[1.6]">
                    {activeCategory?.label} isn&apos;t live in {town?.label} yet. Restaurants
                    are — try those, or tell us what you want here.
                  </p>
                  <div className="flex flex-wrap gap-2.5 mt-5">
                    <button
                      type="button"
                      onClick={() => setCategory("restaurant")}
                      className="px-5 py-2.5 rounded-full bg-amber text-dark text-[13px] font-extrabold hover:bg-amber2 transition-colors"
                    >
                      Show restaurants
                    </button>
                    <Link
                      href="/contact"
                      className="px-5 py-2.5 rounded-full border border-white/25 text-white text-[13px] font-bold hover:bg-white/10 transition-colors"
                    >
                      Request it
                    </Link>
                  </div>
                </div>
              )}
            </Panel>
          </section>
        </div>
      </div>

      <MenuSheet
        place={open}
        focusTag={foodTag}
        onClose={() => setOpen(null)}
        onAdd={add}
        cartCount={count}
        cartTotal={total}
        onOpenCart={() => setCartOpen(true)}
      />

      <CartPanel
        cart={cart}
        total={total}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onSetQty={setQty}
        onCleared={clear}
        whatsappPhone={cart?.whatsappPhone ?? ""}
      />

      {/* Basket bar — visible across the flow, not just inside a menu, so a
          part-filled basket is never forgotten behind a closed panel. */}
      {count > 0 && !open && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-3 pl-5 pr-4 py-3 rounded-full bg-amber text-dark shadow-lg hover:bg-amber2 transition-colors"
        >
          <ShoppingBag className="size-4" />
          <span className="text-[14px] font-extrabold">
            {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="text-[14px] font-extrabold tabular-nums opacity-80">
            KSh {total.toLocaleString()}
          </span>
        </button>
      )}
    </main>
  );
}

/* ── Pieces ──────────────────────────────────────────── */

/** Fade-and-lift on entry. Purely decorative, so reduced motion just gets the
 *  end state via the media query in globals rather than a JS branch. */
function Panel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`transition-all duration-500 ease-out ${
        active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      } motion-reduce:transition-none motion-reduce:translate-y-0`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber block mb-2">
      {children}
    </span>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display font-extrabold uppercase tracking-[-0.04em] leading-[0.95] text-[clamp(32px,6vw,60px)]">
      {children}
    </h1>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <p className="text-white/50 text-[15px] mt-3 max-w-[460px]">{children}</p>;
}

function ResultCard({ place, onOpen }: { place: Place; onOpen: () => void }) {
  const open = isOpenNow(place.openingHours);
  const price = place.priceRange ? PRICE_GLYPH[place.priceRange] : undefined;
  const dishes = place.menu.reduce((n, s) => n + s.items.length, 0);

  return (
    <article className="w-full max-w-[560px]">
      <button
        type="button"
        onClick={onOpen}
        className="group w-full text-left rounded-[16px] border border-white/12 bg-white/[0.06] hover:bg-white/[0.11] hover:border-amber/60 transition-colors p-2.5 flex gap-3"
      >
        {/* Image left, info right — the same shape the marketplace card uses
            on mobile. A wide card fits the name, cuisine and state on one
            line each, which a portrait tile could not. */}
        <span className="relative size-[86px] shrink-0 rounded-[12px] overflow-hidden bg-white/10">
          {place.photo ? (
            <Image
              src={place.photo}
              alt=""
              fill
              sizes="86px"
              className={`object-cover transition-transform duration-300 group-hover:scale-[1.05] ${
                open === false ? "grayscale opacity-70" : ""
              }`}
            />
          ) : null}
        </span>

        <span className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
          <span className="block">
            <span className="flex items-center gap-1">
              <span className="font-display text-[15px] font-extrabold tracking-[-0.015em] text-white truncate">
                {place.name}
              </span>
              {place.isVerified && <Check className="size-3.5 text-amber shrink-0" />}
            </span>

            <span className="block text-[12px] text-white/45 truncate mt-0.5">
              {[place.cuisine.slice(0, 2).join(", "), price].filter(Boolean).join(" · ")}
            </span>

            {open !== null && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold mt-1 ${
                  open ? "text-green" : "text-white/40"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${open ? "bg-green" : "bg-white/35"}`}
                />
                {open ? "Open now" : "Closed"}
              </span>
            )}
          </span>

          <span className="flex items-center gap-1.5 mt-2 flex-wrap">
            {dishes > 0 && (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber">
                {dishes} {dishes === 1 ? "dish" : "dishes"}
                <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
            {place.canBook && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/20 text-white/70 text-[10.5px] font-bold">
                <CalendarCheck className="size-2.5" />
                Bookings
              </span>
            )}
          </span>
        </span>
      </button>
    </article>
  );
}

/**
 * The menu, revealed in place.
 *
 * Stays mounted and animates on the `place` prop so the panel can slide out
 * as well as in — unmounting would make it vanish. `pointer-events-none` while
 * closed keeps the invisible layer from swallowing clicks, and `inert` keeps
 * its contents out of tab order.
 *
 * Photos: most kitchens have not uploaded any, so an item without one falls
 * back to a warm field rather than a grey hole. 160 of 162 items are in that
 * position today.
 */
function MenuSheet({
  place,
  focusTag,
  onClose,
  onAdd,
  cartCount,
  cartTotal,
  onOpenCart,
}: {
  place: Place | null;
  /** Dish tag the guest filtered by, so the menu opens at that section. */
  focusTag: string | null;
  onClose: () => void;
  onAdd: (
    menu: { menuId: string; menuSlug: string; restaurant: string; whatsappPhone: string },
    item: { id: string; name: string; priceKes: number },
    qty: number,
    note: string,
  ) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
}) {
  const [shown, setShown] = useState<Place | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>("");

  // Keep the last place while animating out, so the panel has content to show
  // on its way off screen.
  useEffect(() => {
    if (place) setShown(place);
  }, [place]);

  useEffect(() => {
    if (!place) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place, onClose]);

  // Open where the guest was looking. Filtering by Pizza and then opening a
  // menu should land on the pizzas, not at the top of a menu that starts with
  // burgers.
  //
  // Keyed on `shown`, not `place`: the sections only exist in the DOM once the
  // sheet has rendered its content, and `shown` is what puts them there. Keying
  // on `place` scrolled a panel that was still empty.
  useEffect(() => {
    if (!place || !shown) return;

    // An exact title wins over a pattern match. "Pizza" matches the Calzone
    // section too — calzone is a pizza — and sections sort alphabetically, so
    // a plain find() would land on Calzone and skip the pizzas entirely.
    const exact = focusTag
      ? shown.menu.find(
          (sec) => sec.title.trim().toLowerCase() === focusTag.toLowerCase(),
        )
      : undefined;

    const target =
      exact ??
      (focusTag
        ? (shown.menu.find((sec) => matchesFoodTag(sec.title, focusTag)) ??
          shown.menu.find((sec) =>
            sec.items.some((it) => matchesFoodTag(it.name, focusTag)),
          ))
        : undefined);

    const section = target ?? shown.menu[0];
    setActiveSection(section?.title ?? "");

    // After paint, so the section has a real offsetTop to measure.
    const id = window.requestAnimationFrame(() => {
      const root = scrollRef.current;
      if (!root) return;
      if (!target) {
        root.scrollTo({ top: 0 });
        return;
      }
      const el = root.querySelector<HTMLElement>(
        `[data-section="${CSS.escape(target.title)}"]`,
      );
      root.scrollTo({ top: el ? Math.max(el.offsetTop - 12, 0) : 0 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [place, shown, focusTag]);

  // Scroll spy. Root is the panel's own scroller, not the viewport, and the
  // top margin biases towards the section under the nav rather than the one
  // just leaving it.
  useEffect(() => {
    const root = scrollRef.current;
    if (!place || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) {
          setActiveSection(visible.target.getAttribute("data-section") ?? "");
        }
      },
      { root, rootMargin: "-8px 0px -70% 0px", threshold: 0 },
    );

    root.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [place, shown]);

  const goToSection = (title: string) => {
    const root = scrollRef.current;
    const target = root?.querySelector<HTMLElement>(
      `[data-section="${CSS.escape(title)}"]`,
    );
    if (!root || !target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollTo({
      top: target.offsetTop - 12,
      behavior: reduced ? "auto" : "smooth",
    });
    setActiveSection(title);
  };

  const isOpen = Boolean(place);
  const data = shown;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-purple-dark/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={data ? `${data.name} menu` : "Menu"}
        className={`absolute inset-x-0 bottom-0 top-[8%] md:top-[10%] rounded-t-[26px] bg-canvas text-text overflow-hidden flex flex-col transition-transform duration-400 ease-out motion-reduce:transition-none ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <header className="flex items-start justify-between gap-4 px-5 md:px-8 pt-5 pb-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.025em] truncate">
              {data?.name}
            </h2>
            <p className="text-text2 text-[13px] truncate">
              {[data?.cuisine.slice(0, 2).join(", "), titleCase(data?.town)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-10 rounded-full bg-surface hover:bg-surface2 flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="size-5" />
          </button>
        </header>

        {data && data.menu.length > 1 && (
          <nav
            aria-label="Menu sections"
            className="border-b border-border bg-canvas/95 backdrop-blur px-5 md:px-8"
          >
            <div className="flex gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {data.menu.map((section) => (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => goToSection(section.title)}
                  aria-current={activeSection === section.title ? "true" : undefined}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                    activeSection === section.title
                      ? "bg-amber text-dark"
                      : "text-text2 hover:bg-surface hover:text-text"
                  }`}
                >
                  {section.title}
                  <span className="ml-1.5 opacity-55 tabular-nums">
                    {section.items.length}
                  </span>
                </button>
              ))}
            </div>
          </nav>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 md:px-8 py-6">
          {data && data.menu.length > 0 ? (
            data.menu.map((section) => (
              <section
                key={section.title}
                data-section={section.title}
                className="mb-8 last:mb-0 scroll-mt-4"
              >
                <h3 className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-3">
                  {section.title}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.items.map((item, i) => (
                    <MenuItemRow
                      key={`${item.id}-${i}`}
                      item={item}
                      onAdd={(qty, note) =>
                        data &&
                        onAdd(
                          {
                            menuId: data.menuId,
                            menuSlug: data.menuSlug,
                            restaurant: data.name,
                            whatsappPhone: data.whatsappPhone,
                          },
                          { id: item.id, name: item.name, priceKes: item.priceKes },
                          qty,
                          note,
                        )
                      }
                    />
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p className="text-text2 text-[15px]">
              This kitchen hasn&apos;t published a menu yet.
            </p>
          )}
        </div>

        <footer className="border-t border-border px-5 md:px-8 py-3.5 flex flex-wrap items-center gap-2.5">
          {cartCount > 0 ? (
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-amber text-dark text-[14px] font-extrabold hover:bg-amber2 transition-colors"
            >
              <ShoppingBag className="size-4" />
              View basket · {cartCount}
              <span className="tabular-nums opacity-80">
                KSh {cartTotal.toLocaleString()}
              </span>
            </button>
          ) : (
            <p className="text-text3 text-[13px]">
              Add something to start a basket.
            </p>
          )}

          <Link
            href={data?.href ?? "#"}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border text-text text-[13.5px] font-bold hover:border-amber transition-colors ml-auto"
          >
            {data?.canBook ? (
              <>
                <CalendarCheck className="size-4" />
                Book a table
              </>
            ) : (
              "View restaurant"
            )}
          </Link>
        </footer>
      </div>
    </div>
  );
}


/**
 * One dish. Tapping it opens the note-and-quantity step inline rather than in
 * another modal — a modal on top of a modal is where these flows usually start
 * to feel heavy, and the note is short enough to take here.
 */
function MenuItemRow({
  item,
  onAdd,
}: {
  item: MenuItemLite;
  onAdd: (qty: number, note: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const commit = () => {
    onAdd(qty, note.trim());
    setExpanded(false);
    setQty(1);
    setNote("");
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <li className="rounded-[16px] border border-border bg-white overflow-hidden">
      <div className="flex">
        <span className="relative w-[86px] shrink-0 bg-amber-dim">
          {item.photo ? (
            <Image src={item.photo} alt="" fill sizes="86px" className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <UtensilsCrossed className="size-5 text-amber-700/35" />
            </span>
          )}
        </span>

        <div className="p-3 min-w-0 flex-1">
          <p className="font-display text-[14px] font-extrabold leading-[1.25] tracking-[-0.01em]">
            {item.name}
          </p>
          {item.description && (
            <p className="text-text2 text-[12px] leading-[1.45] mt-0.5 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <p className="font-display text-[13.5px] font-extrabold text-amber-700 tabular-nums">
              KSh {item.priceKes.toLocaleString()}
            </p>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={`Add ${item.name}`}
              className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                justAdded
                  ? "bg-green text-white"
                  : expanded
                    ? "bg-surface2 text-text"
                    : "bg-amber text-dark hover:bg-amber2"
              }`}
            >
              {justAdded ? <Check className="size-4" /> : <Plus className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Grid-rows trick: animates height without measuring the content. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-1 border-t border-border">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note — no onions, extra spicy…"
              maxLength={200}
              className="w-full rounded-[10px] border border-border bg-canvas px-3 py-2.5 text-[16px] outline-none focus:border-amber"
            />
            <div className="flex items-center gap-2 mt-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Fewer"
                  className="size-8 rounded-full border border-border flex items-center justify-center hover:border-amber transition-colors"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-5 text-center text-[14px] font-extrabold tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(20, q + 1))}
                  aria-label="More"
                  className="size-8 rounded-full border border-border flex items-center justify-center hover:border-amber transition-colors"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={commit}
                className="flex-1 px-4 py-2.5 rounded-full bg-amber text-dark text-[13.5px] font-extrabold hover:bg-amber2 transition-colors tabular-nums"
              >
                Add · KSh {(item.priceKes * qty).toLocaleString()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
