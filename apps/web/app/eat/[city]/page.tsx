import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, UtensilsCrossed } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { EAT_RESTAURANTS_QUERY, CITY_GUIDES_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { EatCityFilters, type EatCityCard } from "./_components/EatCityFilters";

/**
 * /eat/[city] — where to eat in a given coastal town.
 *
 * Deliberately NOT a duplicate of /restaurants/[city]. That page is the
 * marketplace listing grid; this one is an editorial hub with client-side
 * filtering (open now, cuisine, price) over the same set, plus links into the
 * journal guides for the town. The filtering is the substantive difference —
 * a statically cached grid cannot answer "what's open right now".
 *
 * Cards link to /restaurants/[city]/[slug]. This route never gets its own
 * restaurant detail pages: one canonical page per restaurant, always.
 */

export const dynamic = "force-static";
export const revalidate = 3600;

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

type Guide = {
  _id: string;
  title?: string;
  slug?: { current?: string };
  excerpt?: string;
  readingTime?: number;
};

const toSlug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function getRestaurants(): Promise<EatListing[]> {
  try {
    const { data } = await sanityFetch<EatListing[]>({ query: EAT_RESTAURANTS_QUERY });
    return data ?? [];
  } catch (err) {
    console.error("[/eat/[city]] Sanity fetch error:", err);
    return [];
  }
}

/** Only towns that actually have restaurants get a hub — no empty pages. */
export async function generateStaticParams() {
  const restaurants = await getRestaurants();
  const cities = new Set(
    restaurants.map((r) => (r.city ?? "").trim()).filter(Boolean).map(toSlug),
  );
  return [...cities].map((city) => ({ city }));
}

function toCard(listing: EatListing): EatCityCard {
  const citySlug = toSlug(listing.city ?? "");
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
    cuisine: listing.cuisine ?? [],
    priceRangeKey: listing.priceRange,
  };
}

type PageProps = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const cityName = titleCase(city);

  // Distinct from /restaurants/[city] ("Restaurants in Watamu"), which targets
  // browsing intent. This page targets the "where should I eat" question.
  const title = `Where to Eat in ${cityName}`;
  const description = `Every restaurant in ${cityName}, Kenya — filter by cuisine, price and what's open right now, with menus and opening hours.`;

  return {
    title,
    description,
    alternates: { canonical: `/eat/${city}` },
    openGraph: { title, description, url: `https://klickenya.com/eat/${city}` },
  };
}

export default async function EatCityPage({ params }: PageProps) {
  const { city } = await params;
  const cityName = titleCase(city);

  const all = await getRestaurants();
  const inCity = all.filter((r) => toSlug(r.city ?? "") === city);

  // A town with no restaurants has no hub. generateStaticParams already
  // excludes these; this covers a hand-typed URL.
  if (inCity.length === 0) notFound();

  let guides: Guide[] = [];
  try {
    const { data } = await sanityFetch<Guide[]>({
      query: CITY_GUIDES_QUERY,
      params: { city: cityName, limit: 4 },
    });
    guides = data ?? [];
  } catch (err) {
    console.error("[/eat/[city]] guides fetch error:", err);
  }

  const cards = inCity.map(toCard);
  const cuisines = [...new Set(cards.flatMap((c) => c.cuisine).filter(Boolean))].sort();
  const priceRanges = ["budget", "mid-range", "fine-dining"].filter((p) =>
    cards.some((c) => c.priceRangeKey === p),
  );

  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `Where to eat in ${cityName}`,
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

      <header className="relative overflow-hidden bg-dark">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(232,160,32,0.20),transparent_62%)]"
        />
        <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-10 pt-[120px] pb-12 md:pb-14">
          <nav aria-label="Breadcrumb" className="mb-5">
            <Link
              href="/eat"
              className="text-[13px] font-semibold text-white/50 hover:text-white transition-colors"
            >
              Eat
            </Link>
            <span className="text-white/30 mx-2">/</span>
            <span className="text-[13px] font-semibold text-white">{cityName}</span>
          </nav>

          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed className="size-4 text-amber" />
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber">
              {cards.length} {cards.length === 1 ? "restaurant" : "restaurants"}
            </span>
          </div>

          <h1 className="font-display text-[clamp(38px,7vw,72px)] font-extrabold text-white uppercase tracking-[-0.045em] leading-[0.94] mb-5">
            Where to eat
            <br />
            in {cityName}
          </h1>
          <p className="text-white/55 text-[16px] leading-[1.65] max-w-[620px]">
            {cuisines.length > 0
              ? `${cuisines.slice(0, 4).join(", ")} and more — filter by what you feel like, what you want to spend, or what's open right now.`
              : `Every restaurant we know in ${cityName}, with menus and opening hours.`}
          </p>
        </div>
      </header>

      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-10 md:py-14">
        <EatCityFilters cards={cards} cuisines={cuisines} priceRanges={priceRanges} />
      </section>

      {guides.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-14 md:pb-20">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
            Read first
          </span>
          <h2 className="font-display text-[clamp(22px,3vw,30px)] font-extrabold text-text tracking-[-0.03em] mb-6">
            More on {cityName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {guides.map((g) => (
              <Link
                key={g._id}
                href={`/journal/${g.slug?.current ?? ""}`}
                className="group rounded-[22px] border border-border bg-white p-5 hover:border-amber transition-colors"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <BookOpen className="size-3.5 text-text3" />
                  <span className="text-[12px] font-semibold text-text3">
                    {g.readingTime ? `${g.readingTime} min read` : "Guide"}
                  </span>
                </div>
                <h3 className="font-display text-[18px] font-bold text-text tracking-[-0.02em] leading-[1.25] mb-1.5 group-hover:text-amber-700 transition-colors">
                  {g.title}
                </h3>
                {g.excerpt && (
                  <p className="text-text2 text-[14px] leading-[1.6] line-clamp-2">
                    {g.excerpt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-16 md:pb-24">
        <div className="rounded-[22px] border border-border bg-surface px-6 py-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-text2 text-[15px]">
            Looking for somewhere to stay or something to do in {cityName}?
          </p>
          <Link
            href={`/restaurants/${city}`}
            className="inline-flex items-center gap-1.5 text-[14px] font-bold text-text hover:text-amber-600 transition-colors"
          >
            Browse all {cityName} listings
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
