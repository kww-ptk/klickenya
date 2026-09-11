import type { Metadata } from "next";
import Link from "next/link";
import { UtensilsCrossed, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { EAT_RESTAURANTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { ListingGrid } from "@/components/listings/ListingGrid";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import { JsonLd } from "@/components/seo/JsonLd";

/**
 * /eat — public food discovery for the Kenyan coast.
 *
 * Deliberately a DISCOVERY surface, not an ordering one. Delivery is not built
 * yet (see docs/food-delivery-program-plan.md, P0–P2), so nothing here promises
 * it. The page earns ranking authority on "restaurants in Watamu/Kilifi" now;
 * delivery messaging switches on when P0 ships.
 *
 * Every restaurant card links to the canonical listing page at
 * /restaurants/[city]/[slug] — this page never gets its own detail routes, so
 * there is exactly one page per restaurant for Google to rank.
 *
 * Until 2026-09-11 /eat was the host command center; that now lives at /manage.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Eat — Restaurants on the Kenya Coast",
  description:
    "Find where to eat in Watamu, Kilifi and along the Kenyan coast. Browse restaurants, menus and opening hours, and book a table.",
  alternates: { canonical: "/eat" },
};

type EatListing = {
  _id: string;
  title?: string;
  slug?: { current?: string } | string;
  type?: string;
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
  hostRef?: {
    name?: string;
    slug?: string;
    photo?: { asset?: { url?: string } };
  };
};

function toCard(listing: EatListing): ListingCardProps {
  const citySlug = (listing.city ?? "").toLowerCase().trim().replace(/\s+/g, "-");
  const slug =
    typeof listing.slug === "string" ? listing.slug : (listing.slug?.current ?? "");
  const photoUrl = listing.coverPhoto
    ? urlForImage(listing.coverPhoto).width(800).url()
    : "";

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
    photos: photoUrl ? [photoUrl] : [],
    href: `/restaurants/${citySlug}/${slug}`,
  };
}

export default async function EatPage() {
  let restaurants: EatListing[] = [];
  try {
    const { data } = await sanityFetch<EatListing[]>({ query: EAT_RESTAURANTS_QUERY });
    restaurants = data ?? [];
  } catch (err) {
    // A Sanity outage must not take the page down — it degrades to the hero
    // and the owner CTA, both of which are static.
    console.error("[/eat] Sanity fetch error:", err);
  }

  // Cities, ordered by how much we actually have there. Empty cities never
  // render, so a town with no restaurants can't produce a dead link.
  const cityCounts = new Map<string, number>();
  for (const r of restaurants) {
    const city = (r.city ?? "").trim();
    if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      href: `/eat/${name.toLowerCase().replace(/\s+/g, "-")}`,
    }));

  const cuisines = [
    ...new Set(restaurants.flatMap((r) => r.cuisine ?? []).filter(Boolean)),
  ].slice(0, 12);

  const cards = restaurants.map(toCard);
  const featured = cards.slice(0, 12);

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Restaurants on the Kenya Coast",
          numberOfItems: featured.length,
          itemListElement: featured.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.title,
            url: `https://klickenya.com${c.href}`,
          })),
        }}
      />

      <Nav transparent />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-[440px] md:min-h-[520px] flex items-center justify-center overflow-hidden bg-zinc-950">
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(232,160,32,0.18),transparent_60%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-0 opacity-[0.05] bg-[repeating-linear-gradient(45deg,#fff_0_1px,transparent_1px_10px)]"
        />

        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[820px] mx-auto pt-[130px] pb-16">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-8">
            <UtensilsCrossed className="size-3.5 text-amber-500" />
            <span className="text-[13px] font-semibold text-white/85 tracking-[0.01em]">
              Watamu · Kilifi · the Kenyan coast
            </span>
          </div>

          <h1 className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-5 text-[clamp(36px,7vw,64px)]">
            Find where to <span className="text-amber-500">eat</span>
            <br className="hidden sm:block" /> on the coast
          </h1>

          <p className="max-w-[540px] leading-[1.65] mb-10 text-white/60 text-[16px] md:text-[17px]">
            Every restaurant worth knowing in Watamu and Kilifi — menus, opening
            hours, and a table when you want one.
          </p>

          {cities.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {cities.slice(0, 6).map((c) => (
                <Link
                  key={c.name}
                  href={c.href}
                  className="group flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full bg-white/[0.08] backdrop-blur-[12px] border border-white/[0.12] text-white hover:bg-white/[0.14] transition-colors"
                >
                  <MapPin className="size-3.5 text-white/40" />
                  <span className="text-[14px] font-semibold">{c.name}</span>
                  <span className="text-[12px] text-white/45 tabular-nums">
                    {c.count}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Restaurants ────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
              Where to eat
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Restaurants on the coast
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              {restaurants.length > 0
                ? `${restaurants.length} places, from beach shacks to the proper kitchens.`
                : "New places are being added — check back shortly."}
            </p>
          </div>
          {cities[0] && (
            <Link
              href={cities[0].href}
              className="hidden md:flex items-center gap-1.5 text-[14px] font-semibold text-text hover:text-amber-600 transition-colors shrink-0"
            >
              All in {cities[0].name}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        {featured.length > 0 ? (
          <ListingGrid listings={featured} columns={4} />
        ) : (
          <div className="rounded-[22px] border border-border bg-surface px-6 py-14 text-center">
            <p className="text-text2 text-[15px]">
              No restaurants listed yet. If you run one,{" "}
              <Link href="/list" className="text-amber-600 font-semibold hover:underline">
                add it here
              </Link>
              .
            </p>
          </div>
        )}
      </section>

      {/* ── Cuisines ───────────────────────────────────────── */}
      {cuisines.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-14 md:pb-20">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
            By cuisine
          </span>
          <h2 className="font-display text-[clamp(22px,3vw,30px)] font-bold text-text tracking-[-0.03em] mb-6">
            What are you in the mood for?
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {cuisines.map((cuisine) => (
              <Link
                key={cuisine}
                href={`/search?type=restaurants&q=${encodeURIComponent(cuisine)}`}
                className="px-4 py-2.5 rounded-full border border-border bg-white text-[14px] font-semibold text-text hover:border-amber hover:text-amber-600 transition-colors"
              >
                {cuisine}
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
            className="absolute inset-0 bg-[radial-gradient(90%_120%_at_100%_0%,rgba(232,160,32,0.20),transparent_55%)]"
          />
          <div className="relative z-10 max-w-[620px]">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="size-4 text-amber-500" />
              <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-500">
                For restaurants
              </span>
            </div>
            <h2 className="font-display text-[clamp(24px,3.5vw,36px)] font-bold text-white tracking-[-0.03em] leading-[1.15] mb-4">
              Run a restaurant on the coast?
            </h2>
            <p className="text-white/60 text-[16px] leading-[1.65] mb-8">
              Put your menu online, take table bookings, and run your floor and
              kitchen from one place. Free to list.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/list"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-amber text-dark text-[15px] font-bold hover:bg-amber2 transition-colors"
              >
                List your restaurant
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center px-6 py-3.5 rounded-full border border-white/20 text-white text-[15px] font-semibold hover:bg-white/10 transition-colors"
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
