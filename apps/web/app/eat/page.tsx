import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  UtensilsCrossed,
  Sparkles,
  Search,
  ShoppingBag,
  Bike,
} from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { EAT_RESTAURANTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { getMenuCapabilities, getSampleDishes, isEatEligible } from "@/lib/eat/menus";
import { EatHeader } from "@/components/eat/EatHeader";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  EatExplorer,
  type EatCard,
  type CuisineTile,
} from "./_components/EatExplorer";
import { BestSellers, type BestSeller } from "@/components/eat/BestSellers";

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
  title: "Food Delivery & Restaurant Ordering in Watamu & Kilifi",
  description:
    "Order food online or book a table in Watamu, Kilifi and across the Kenyan coast. Browse menus, see what's open now, and order direct from the restaurant. Food delivery coming to the coast.",
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

function toCard(
  listing: EatListing,
  caps: Map<string, { menuSlug: string; canOrder: boolean; canBook: boolean; canDeliver: boolean }>,
): EatCard {
  const slug =
    typeof listing.slug === "string" ? listing.slug : (listing.slug?.current ?? "");
  const cap = caps.get(slug);

  return {
    id: listing._id,
    name: listing.title ?? "Untitled",
    city: listing.city ?? "",
    cuisine: listing.cuisine ?? [],
    priceRange: listing.priceRange,
    rating: listing.avgRating,
    reviewCount: listing.reviewCount,
    photo: photoOf(listing, 800),
    openingHours: listing.openingHours,
    href: `/restaurants/${toSlug(listing.city ?? "")}/${slug}`,
    orderHref: cap?.canOrder && cap.menuSlug ? `/m/${cap.menuSlug}` : undefined,
    canOrder: Boolean(cap?.canOrder && cap.menuSlug),
    canBook: Boolean(cap?.canBook),
    canDeliver: Boolean(cap?.canDeliver),
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

  const [caps, dishes] = await Promise.all([
    getMenuCapabilities(),
    getSampleDishes(12),
  ]);
  // Only kitchens a guest can act on. Everything below — cuisine tiles, town
  // counts, structured data — derives from this filtered set so nothing
  // promises a count the grid cannot show.
  restaurants = restaurants.filter((r) => {
    const slug = typeof r.slug === "string" ? r.slug : (r.slug?.current ?? "");
    return isEatEligible(caps.get(slug));
  });

  const cards = restaurants.map((r) => toCard(r, caps));
  const orderableCount = cards.filter((c) => c.canOrder).length;

  // Cuisine tiles. The photo is background texture only (the tile renders it
  // desaturated behind a colour field), but two tiles showing the same image
  // still reads as a bug, so prefer one no other tile has taken.
  const cuisineMap = new Map<string, { count: number; photo: string }>();
  const takenPhotos = new Set<string>();
  for (const r of restaurants) {
    const photo = photoOf(r, 400);
    for (const c of r.cuisine ?? []) {
      if (!c) continue;
      const existing = cuisineMap.get(c);
      if (existing) {
        existing.count += 1;
        if ((!existing.photo || takenPhotos.has(existing.photo)) && photo && !takenPhotos.has(photo)) {
          existing.photo = photo;
          takenPhotos.add(photo);
        }
      } else {
        cuisineMap.set(c, { count: 1, photo });
        if (photo) takenPhotos.add(photo);
      }
    }
  }
  const cuisines: CuisineTile[] = [...cuisineMap.entries()]
    .map(([name, v]) => ({ name, count: v.count, photo: v.photo }))
    .sort((a, b) => b.count - a.count);

  // Attach each dish to its restaurant so the card can carry real trust
  // signals — the kitchen's photo, whether it is open, whether it is verified.
  const listingBySlug = new Map<string, EatListing>();
  for (const r of restaurants) {
    const slug =
      typeof r.slug === "string" ? r.slug : (r.slug?.current ?? "");
    if (slug) listingBySlug.set(slug, r);
  }
  const bestSellers: BestSeller[] = dishes.map((d) => {
    const listing = listingBySlug.get(d.listingSlug);
    const cap = caps.get(d.listingSlug);
    return {
      name: d.name,
      priceKes: d.priceKes,
      restaurant: listing?.title ?? d.restaurant,
      menuSlug: d.menuSlug,
      // Restaurant photo only. menu_items.photo_url exists but the values in
      // the data are HOTLINKED from third-party sites (e.g. a food blogger's
      // grilled-octopus shot), which breaks next/image's host allowlist and is
      // not ours to display. Revisit once dish photos are uploaded assets.
      photo: listing ? photoOf(listing, 600) : "",
      photoIsDish: false,
      openingHours: listing?.openingHours,
      isVerified: Boolean(listing?.isVerified),
      canBook: Boolean(cap?.canBook),
      city: listing?.city ?? "",
    };
  });

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
            name: c.name,
            url: `https://klickenya.com${c.href}`,
          })),
        }}
      />

      <EatHeader />

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-purple-dark">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(232,160,32,0.22),transparent_62%)]"
        />

        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[900px] mx-auto pt-[132px] pb-14 md:pb-16">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-8">
            <UtensilsCrossed className="size-3.5 text-amber" />
            <span className="text-[13px] font-semibold text-white/85">
              {orderableCount > 0
                ? `${orderableCount} taking orders online`
                : "Watamu · Kilifi · the Kenyan coast"}
            </span>
          </div>

          <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.045em] leading-[0.92] text-[clamp(44px,9vw,88px)] mb-6">
            Crave it.
            <br />
            Tap it. Eat it.
          </h1>

          <p className="max-w-[520px] leading-[1.6] mb-9 text-white/55 text-[16px] md:text-[17px]">
            Order food online straight from the kitchen, or book a table. Watamu,
            Kilifi and across the coast — delivery landing soon.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="#browse"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-amber text-dark text-[15px] font-extrabold hover:bg-amber2 transition-colors"
            >
              Order food now
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

      {/* ── Explorer — slider stays attached to the hero; best sellers sit
             between it and the results ─────────────────────────────────── */}
      <section id="browse" className="pb-14 md:pb-20 scroll-mt-16">
        {cards.length > 0 ? (
          <EatExplorer
            cards={cards}
            cuisines={cuisines}
            middle={
              bestSellers.length > 0 ? (
                <section className="max-w-[1280px] mx-auto px-5 md:px-10 pt-12 md:pt-16">
                  <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
                    Best sellers
                  </span>
                  <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-extrabold text-text tracking-[-0.03em]">
                    What people are eating
                  </h2>
                  <p className="text-text2 text-[15px] mt-1.5 mb-7">
                    Straight off menus published by the kitchens themselves.
                  </p>
                  <BestSellers items={bestSellers} />
                </section>
              ) : null
            }
          />
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

      {/* ── How it works ────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
          How it works
        </span>
        <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-extrabold text-text tracking-[-0.03em] mb-8">
          Three taps to dinner
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Search,
              title: "Find a kitchen",
              body: "Filter by craving, price, or what's open right now in Watamu, Kilifi and across the coast.",
            },
            {
              icon: ShoppingBag,
              title: "Order or book",
              body: "Order online straight from the restaurant's own menu, or reserve a table for later.",
            },
            {
              icon: UtensilsCrossed,
              title: "Eat",
              body: "The kitchen confirms with a time. Track it live, then collect — no phone calls, no queue.",
            },
          ].map((step, i) => (
            <div
              key={step.title}
              className="rounded-[22px] border border-border bg-white p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="size-9 rounded-full bg-amber-dim flex items-center justify-center">
                  <step.icon className="size-4 text-amber-700" />
                </span>
                <span className="text-[12px] font-extrabold text-text3 tabular-nums">
                  0{i + 1}
                </span>
              </div>
              <h3 className="font-display text-[18px] font-extrabold text-text tracking-[-0.02em] mb-1.5">
                {step.title}
              </h3>
              <p className="text-text2 text-[14px] leading-[1.6]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Delivery ────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-14 md:pb-20">
        <div className="rounded-[22px] border border-amber bg-amber-dim px-6 py-7 md:px-9 md:py-8 flex flex-wrap items-center gap-5 justify-between">
          <div className="flex items-start gap-4 max-w-[640px]">
            <span className="size-10 rounded-full bg-amber flex items-center justify-center shrink-0">
              <Bike className="size-5 text-dark" />
            </span>
            <div>
              <h2 className="font-display text-[19px] font-extrabold text-text tracking-[-0.02em] mb-1">
                Food delivery is coming to the coast
              </h2>
              <p className="text-text2 text-[14px] leading-[1.6]">
                Right now you can order ahead and collect, or book a table.
                Delivery to your door is next — restaurants in Watamu and Kilifi
                can register their interest today.
              </p>
            </div>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-dark text-white text-[14px] font-extrabold hover:bg-text2 transition-colors shrink-0"
          >
            Tell us your town
            <ArrowRight className="size-4" />
          </Link>
        </div>
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
        <div className="relative overflow-hidden rounded-[30px] bg-purple-dark px-7 py-12 md:px-14 md:py-16">
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
