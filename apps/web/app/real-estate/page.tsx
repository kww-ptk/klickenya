import { type Metadata } from "next";
import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import {
  FEATURED_PROPERTIES_QUERY,
  PROPERTIES_QUERY,
  NEW_DEVELOPMENTS_QUERY,
  NEIGHBOURHOODS_QUERY,
  AGENTS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PropertyHero } from "@/components/real-estate/PropertyHero";
import { PropertyCategoryNav } from "@/components/real-estate/PropertyCategoryNav";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { NeighbourhoodCard } from "@/components/real-estate/NeighbourhoodCard";
import { AgentCard } from "@/components/real-estate/AgentCard";
import { MarketDataStrip } from "@/components/real-estate/MarketDataStrip";
import { MapTeaser } from "@/components/real-estate/MapTeaser";
import { ValuationCTA } from "@/components/real-estate/ValuationCTA";
import { NewDevelopments } from "@/components/real-estate/NewDevelopments";
import { MortgageCalculator } from "@/components/real-estate/MortgageCalculator";

export const revalidate = 3600;

/* ── Metadata ──────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Real Estate in Kenya | Klickenya Property",
  description:
    "Buy, sell, or rent property across Kenya. Browse thousands of verified listings — apartments, houses, land, and commercial spaces — with transparent pricing and AI-powered valuations.",
  alternates: { canonical: "https://klickenya.com/real-estate" },
  openGraph: {
    title: "Real Estate in Kenya | Klickenya Property",
    description:
      "Buy, sell, or rent property across Kenya. Browse thousands of verified listings with transparent pricing.",
    url: "https://klickenya.com/real-estate",
    type: "website",
  },
};

/* ── Mapper helpers ────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPropertyToCard(p: any) {
  return {
    id: p._id,
    title: p.title ?? "Untitled",
    slug: p.slug?.current ?? p.slug ?? "",
    listingCategory: p.listingCategory ?? "for-sale",
    propertyType: p.propertyType,
    status: p.status ?? "available",
    price: p.price ?? 0,
    priceType: p.priceType ?? "total",
    previousPrice: p.previousPrice,
    isFeatured: p.isFeatured,
    isNewDevelopment: p.isNewDevelopment,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sizeSqm: p.sizeSqm,
    neighbourhood: p.neighbourhood ?? "",
    city: p.city ?? "",
    coverPhoto: p.coverPhoto ? urlForImage(p.coverPhoto).width(800).url() : "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNeighbourhood(n: any) {
  return {
    name: n.name ?? "Unnamed",
    slug: n.slug?.current ?? n.slug ?? "",
    city: n.city ?? "",
    avgPrice: n.avgPriceForSale,
    imageUrl: n.heroImage ? urlForImage(n.heroImage).width(600).url() : "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAgent(a: any) {
  return {
    name: a.displayName ?? "Agent",
    slug: a.slug?.current ?? a.slug ?? "",
    agency: a.agencyName,
    isVerified: a.isVerified,
    photoUrl: a.photo ? urlForImage(a.photo).width(200).url() : "",
    specialisations: a.specialisations,
  };
}

/* ── Page ──────────────────────────────────────────── */

export default async function RealEstateHomePage() {
  const [featured, properties, developments, neighbourhoods, agents] =
    await Promise.all([
      sanityClient.fetch(FEATURED_PROPERTIES_QUERY).catch(() => []),
      sanityClient.fetch(PROPERTIES_QUERY).catch(() => []),
      sanityClient.fetch(NEW_DEVELOPMENTS_QUERY).catch(() => []),
      sanityClient.fetch(NEIGHBOURHOODS_QUERY).catch(() => []),
      sanityClient.fetch(AGENTS_QUERY).catch(() => []),
    ]);

  const featuredCards = ((featured ?? []) as unknown[]).map(mapPropertyToCard);
  const heroFeatured = featuredCards.slice(0, 3);
  const moreFeatured = featuredCards.slice(3, 8);
  const neighbourhoodCards = ((neighbourhoods ?? []) as unknown[]).map(mapNeighbourhood);
  const agentCards = ((agents ?? []) as unknown[]).map(mapAgent);

  const devs = ((developments ?? []) as unknown[]).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d: any) => ({
      title: d.title ?? "Untitled",
      slug: d.slug?.current ?? d.slug ?? "",
      developerName: d.developerName ?? "",
      city: d.city ?? "",
      neighbourhood: d.neighbourhood ?? "",
      price: d.price ?? 0,
      completionPercentage: d.completionPercentage ?? 0,
      unitsAvailable: d.unitsAvailable ?? 0,
      coverPhoto: d.coverPhoto
        ? urlForImage(d.coverPhoto).width(640).url()
        : "",
      isNewDevelopment: d.isNewDevelopment ?? true,
    })
  );

  return (
    <>
      <Nav transparent />

      {/* ── Hero ──────────────────────────── */}
      <PropertyHero />

      {/* ── Category Nav ──────────────────── */}
      <PropertyCategoryNav />

      {/* ── Featured Properties ────────────── */}
      <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-14">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-1.5 block">
              Editor&apos;s picks
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              Featured properties
            </h2>
            <p className="text-[15px] text-text2 mt-1.5">
              Hand-picked listings curated by the Klickenya team.
            </p>
          </div>
          <Link
            href="/real-estate/for-sale"
            className="text-[14px] font-semibold text-purple2 hover:underline whitespace-nowrap hidden sm:block"
          >
            View all &rarr;
          </Link>
        </div>

        {heroFeatured.length > 0 && (
          <PropertyGrid variant="featured">
            {heroFeatured.map((card, i) => (
              <PropertyCard key={card.id} {...card} large={i === 0} />
            ))}
          </PropertyGrid>
        )}

        {moreFeatured.length > 0 && (
          <div className="mt-6">
            <PropertyGrid variant="standard">
              {moreFeatured.map((card) => (
                <PropertyCard key={card.id} {...card} />
              ))}
            </PropertyGrid>
          </div>
        )}
      </section>

      {/* ── Neighbourhoods ─────────────────── */}
      <section className="bg-surface py-14 px-5 md:px-10">
        <div className="max-w-[1320px] mx-auto">
          <div className="mb-8">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-1.5 block">
              Explore areas
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              Popular neighbourhoods
            </h2>
            <p className="text-[15px] text-text2 mt-1.5">
              Discover the best areas to buy and rent in Kenya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {neighbourhoodCards.map((n) => (
              <NeighbourhoodCard key={n.slug} {...n} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Market Data ────────────────────── */}
      <MarketDataStrip />

      {/* ── Map Teaser ─────────────────────── */}
      <MapTeaser />

      {/* ── Agents ─────────────────────────── */}
      <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-14">
        <div className="mb-8">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-1.5 block">
            Verified professionals
          </span>
          <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
            Top agents in Kenya
          </h2>
          <p className="text-[15px] text-text2 mt-1.5">
            Work with trusted, verified property agents across the country.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {agentCards.map((a) => (
            <AgentCard key={a.slug} {...a} />
          ))}
        </div>
      </section>

      {/* ── Valuation CTA ──────────────────── */}
      <ValuationCTA />

      {/* ── New Developments ───────────────── */}
      {devs.length > 0 && (
        <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-14">
          <div className="mb-8">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-1.5 block">
              Off-plan &amp; new builds
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              New developments
            </h2>
            <p className="text-[15px] text-text2 mt-1.5">
              Get in early on Kenya&apos;s newest residential and commercial
              projects.
            </p>
          </div>

          <NewDevelopments developments={devs} />
        </section>
      )}

      {/* ── Mortgage Calculator ────────────── */}
      <MortgageCalculator />

      {/* ── Footer ─────────────────────────── */}
      <Footer />
    </>
  );
}
