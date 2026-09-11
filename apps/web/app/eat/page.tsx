import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, UtensilsCrossed, Sparkles } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { EAT_RESTAURANTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  EatExplorer,
  type EatCard,
  type CuisineTile,
} from "./_components/EatExplorer";

/**
 * /eat — public food discovery for the Kenyan coast.
 *
 * A DISCOVERY surface, not an ordering one. Delivery is not built yet (P0–P2
 * in docs/food-delivery-program-plan.md), so every call to action here does
 * something that works today: browse, filter by what's open, book a table.
 * The verbs become "order" when P0 ships — not before.
 *
 * Visual register is deliberately louder than the rest of the marketplace
 * (dark ground, heavy caps, colour-blocked tiles) but uses only house tokens,
 * so arriving from a listing page still feels like the same product.
 *
 * Restaurant tiles link to the canonical /restaurants/[city]/[slug] page. This
 * route never gets detail pages of its own — one page per restaurant, always.
 *
 * Until 2026-09-11 /eat was the host command center; that now lives at /manage.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Eat — Restaurants on the Kenya Coast",
  description:
    "Find where to eat in Watamu, Kilifi and along the Kenyan coast. Filter by cuisine and what's open right now, then book a table.",
  alternates: { canonical: "/eat" },
};

type EatListing = {
  _id: string;
  title?: string;
  slug?: { current?: string } | string;
  subcategory?: string;
  city?: string;
  price?: number | null;
  priceUnit?: string;
  priceRange?: string;
  openingHours?: string;
  avgRating?: number;
  reviewCount?: number;
  isVerified?: boolean;
  hostName?: string;
  cuisine?: string[];
  coverPhoto?: unknown;
  hostRef?: { name?: string; slug?: string; photo?: { asset?: { url?: string } } };
};

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

function photoOf(listing: EatListing, width: number): string {
  return listing.coverPhoto ? urlForImage(listing.coverPhoto).width(width).url() : "";
}

function toCard(listing: EatListing): EatCard {
  const slug =
    typeof listing.slug === "string" ? listing.slug : (listing.slug?.current ?? "");
  return {
    id: listing._id,
    title: listing.title ?? "Untitled",
    city: listing.city ?? "",
    price: listing.price ?? null,
    priceUnit: listing.priceUnit ?? "person",
    priceRange: listing.priceRange,
    rating: listing.avgRating,
    reviewCount: listing.reviewCount,
    type: "restaurant",
    subcategory: listing.subcategory,
    openingHours: listing.openingHours,
    isVerified: listing.isVerified ?? false,
    hostName: listing.hostRef?.name ?? listing.hostName,
    hostPhotoUrl: listing.hostRef?.photo?.asset?.url,
    hostSlug: listing.hostRef?.slug,
    photos: [photoOf(listing, 800)].filter(Boolean),
    href: `/restaurants/${toSlug(listing.city ?? "")}/${slug}`,
    cuisine: listing.cuisine ?? [],
  };
}

export default async function EatPage() {
  let restaurants: EatListing[] = [];
  try {
    const { data } = await sanityFetch<EatListing[]>({ query: EAT_RESTAURANTS_QUERY });
    restaurants = data ?? [];
  } catch (err) {
    // A Sanity outage degrades to the hero and the owner CTA rather than 500ing.
    console.error("[/eat] Sanity fetch error:", err);
  }

  const cards = restaurants.map(toCard);

  // Cuisine tiles, each borrowing a photo from a restaurant that serves it.
  const cuisineMap = new Map<string, { count: number; photo: string }>();
  for (const r of restaurants) {
    for (const c of r.cuisine ?? []) {
      if (!c) continue;
      const existing = cuisineMap.get(c);
      if (existing) {
        existing.count += 1;
        if (!existing.photo) existing.photo = photoOf(r, 400);
      } else {
        cuisineMap.set(c, { count: 1, photo: photoOf(r, 400) });
      }
    }
  }
  const cuisines: CuisineTile[] = [...cuisineMap.entries()]
    .map(([name, v]) => ({ name, count: v.count, photo: v.photo }))
    .sort((a, b) => b.count - a.count);

  const cityCounts = new Map<string, number>();
  for (const r of restaurants) {
    const city = (r.city ?? "").trim();
    if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, href: `/eat/${toSlug(name)}` }));

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Restaurants on the Kenya Coast",
          numberOfItems: cards.length,
          itemListElement: cards.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.title,
            url: `https://klickenya.com${c.href}`,
          })),
        }}
      />

      <Nav transparent />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-dark">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(232,160,32,0.22),transparent_62%)]"
        />

        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[900px] mx-auto pt-[132px] pb-14 md:pb-16">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-8">
            <UtensilsCrossed className="size-3.5 text-amber" />
            <span className="text-[13px] font-semibold text-white/85">
              {restaurants.length > 0
                ? `${restaurants.length} places across the coast`
                : "Watamu · Kilifi · the Kenyan coast"}
            </span>
          </div>

          <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.045em] leading-[0.92] text-[clamp(44px,9vw,88px)] mb-6">
            Find it.
            <br />
            Book it. Eat it.
          </h1>

          <p className="max-w-[520px] leading-[1.6] mb-9 text-white/55 text-[16px] md:text-[17px]">
            Every restaurant worth knowing in Watamu and Kilifi — menus, opening
            hours, and a table when you want one.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#browse"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-amber text-dark text-[15px] font-extrabold hover:bg-amber2 transition-colors"
            >
              Browse restaurants
              <ArrowRight className="size-4" />
            </a>
            {cities[0] && (
              <Link
                href={cities[0].href}
                className="inline-flex items-center px-7 py-3.5 rounded-full border border-white/25 text-white text-[15px] font-bold hover:bg-white/10 transition-colors"
              >
                Eat in {cities[0].name}
              </Link>
            )}
          </div>
        </div>

      </section>

      {/* ── Explorer — rail continues the dark hero, grid sits on canvas ── */}
      <section id="browse" className="pb-14 md:pb-20 scroll-mt-16">
        {cards.length > 0 ? (
          <EatExplorer cards={cards} cuisines={cuisines} />
        ) : (
          <div className="max-w-[1280px] mx-auto px-5 md:px-10">
            <div className="rounded-[22px] border border-border bg-surface px-6 py-14 text-center">
              <p className="text-text2 text-[15px]">
                No restaurants listed yet. If you run one,{" "}
                <Link href="/list" className="text-amber-600 font-bold hover:underline">
                  add it here
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Cities ─────────────────────────────────────────── */}
      {cities.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-14 md:pb-20">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
            By town
          </span>
          <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-extrabold text-text tracking-[-0.03em] mb-6">
            Where are you eating?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cities.map((c) => (
              <Link
                key={c.name}
                href={c.href}
                className="group rounded-[22px] border border-border bg-white px-6 py-6 flex items-center justify-between gap-4 hover:border-amber transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="size-3.5 text-text3" />
                    <span className="text-[12px] font-bold text-text3 tabular-nums">
                      {c.count} {c.count === 1 ? "place" : "places"}
                    </span>
                  </div>
                  <h3 className="font-display text-[22px] font-extrabold text-text tracking-[-0.02em] group-hover:text-amber-700 transition-colors">
                    {c.name}
                  </h3>
                </div>
                <ArrowRight className="size-5 text-text3 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Restaurant owner CTA ───────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-16 md:pb-24">
        <div className="relative overflow-hidden rounded-[30px] bg-dark px-7 py-12 md:px-14 md:py-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(232,160,32,0.22),transparent_55%)]"
          />
          <div className="relative z-10 max-w-[620px]">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="size-4 text-amber" />
              <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber">
                For restaurants
              </span>
            </div>
            <h2 className="font-display text-[clamp(26px,4vw,40px)] font-extrabold text-white uppercase tracking-[-0.03em] leading-[1.05] mb-4">
              Run a restaurant
              <br />
              on the coast?
            </h2>
            <p className="text-white/55 text-[16px] leading-[1.65] mb-8">
              Put your menu online, take table bookings, and run your floor and
              kitchen from one place. Free to list.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/list"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-amber text-dark text-[15px] font-extrabold hover:bg-amber2 transition-colors"
              >
                List your restaurant
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center px-7 py-3.5 rounded-full border border-white/25 text-white text-[15px] font-bold hover:bg-white/10 transition-colors"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
