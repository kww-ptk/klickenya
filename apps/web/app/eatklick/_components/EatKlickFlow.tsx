"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UtensilsCrossed,
  X,
  ChevronRight,
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
import type { MenuSectionLite } from "@/lib/eat/menus";

export type Town = { slug: string; label: string; count: number };

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
              <Eyebrow>Step one</Eyebrow>
              <Heading>Where are you?</Heading>
              <Sub>Pick a town and we&apos;ll show what&apos;s open near you.</Sub>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
                {towns.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => setTown(t)}
                    className="group rounded-[18px] border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-amber px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <MapPin className="size-4 text-amber mb-2.5" />
                    <p className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                      {t.label}
                    </p>
                    <p className="text-[12px] font-semibold text-white/45 tabular-nums mt-0.5">
                      {t.count} {t.count === 1 ? "place" : "places"}
                    </p>
                  </button>
                ))}
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
                        {c.live ? `${n} in ${town?.label}` : "Coming soon"}
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
                <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-3 mt-7 -mx-5 px-5 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      <MenuSheet place={open} onClose={() => setOpen(null)} />
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
    <article className="shrink-0 snap-start w-[210px] sm:w-[238px]">
      <button type="button" onClick={onOpen} className="block w-full text-left group">
        <div className="relative aspect-[4/3] rounded-[16px] overflow-hidden bg-white/10">
          {place.photo ? (
            <Image
              src={place.photo}
              alt=""
              fill
              sizes="238px"
              className={`object-cover transition-transform duration-300 group-hover:scale-[1.04] ${
                open === false ? "grayscale opacity-70" : ""
              }`}
            />
          ) : null}
          {open !== null && (
            <span
              className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                open ? "bg-white text-green" : "bg-purple-dark/85 text-white"
              }`}
            >
              <span className={`size-1.5 rounded-full ${open ? "bg-green" : "bg-white/60"}`} />
              {open ? "Open" : "Closed"}
            </span>
          )}
        </div>

        <p className="font-display text-[15px] font-extrabold tracking-[-0.015em] mt-2.5 flex items-center gap-1">
          <span className="truncate">{place.name}</span>
          {place.isVerified && <Check className="size-3.5 text-amber shrink-0" />}
        </p>
        <p className="text-[12px] text-white/45 truncate">
          {[place.cuisine.slice(0, 2).join(", "), price].filter(Boolean).join(" · ")}
        </p>
        {dishes > 0 && (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-amber mt-1">
            See {dishes} {dishes === 1 ? "dish" : "dishes"}
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </button>

      {(place.orderHref || place.canBook) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {place.orderHref && (
            <Link
              href={place.orderHref}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber text-dark text-[11px] font-extrabold"
            >
              <ShoppingBag className="size-3" />
              Order
            </Link>
          )}
          {place.canBook && (
            <Link
              href={place.href}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/25 text-white text-[11px] font-bold hover:bg-white/10 transition-colors"
            >
              <CalendarCheck className="size-3" />
              Book
            </Link>
          )}
        </div>
      )}
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
function MenuSheet({ place, onClose }: { place: Place | null; onClose: () => void }) {
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

  // A reopened sheet must start at the top on its first section, not wherever
  // the previous restaurant was left.
  useEffect(() => {
    if (!place) return;
    scrollRef.current?.scrollTo({ top: 0 });
    setActiveSection(place.menu[0]?.title ?? "");
  }, [place]);

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
                    <li
                      key={`${item.name}-${i}`}
                      className="rounded-[16px] border border-border bg-white overflow-hidden flex"
                    >
                      <span className="relative w-[86px] shrink-0 bg-amber-dim">
                        {item.photo ? (
                          <Image
                            src={item.photo}
                            alt=""
                            fill
                            sizes="86px"
                            className="object-cover"
                          />
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
                        <p className="font-display text-[13.5px] font-extrabold text-amber-700 mt-1.5 tabular-nums">
                          KSh {item.priceKes.toLocaleString()}
                        </p>
                      </div>
                    </li>
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

        <footer className="border-t border-border px-5 md:px-8 py-4 flex flex-wrap gap-2.5">
          {data?.orderHref && (
            <Link
              href={data.orderHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber text-dark text-[14px] font-extrabold hover:bg-amber2 transition-colors"
            >
              <ShoppingBag className="size-4" />
              Order online
            </Link>
          )}
          <Link
            href={data?.href ?? "#"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-text text-[14px] font-bold hover:border-amber transition-colors"
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
