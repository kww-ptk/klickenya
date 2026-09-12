"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UtensilsCrossed,
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

  const step = category ? 3 : town ? 2 : 1;

  const results = useMemo(() => {
    if (!town || !category) return [];
    return places.filter((p) => p.town === town.slug && p.category === category);
  }, [places, town, category]);

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
              onClick={() => (category ? setCategory(null) : setTown(null))}
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

              {results.length > 0 ? (
                <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-3 mt-7 -mx-5 px-5 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {results.map((p) => (
                    <ResultCard key={p.id} place={p} />
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

function ResultCard({ place }: { place: Place }) {
  const open = isOpenNow(place.openingHours);
  const price = place.priceRange ? PRICE_GLYPH[place.priceRange] : undefined;
  const href = place.orderHref ?? place.href;

  return (
    <article className="shrink-0 snap-start w-[210px] sm:w-[238px]">
      <Link href={href} className="block group">
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
      </Link>

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
