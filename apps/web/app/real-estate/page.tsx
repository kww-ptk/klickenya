import { type Metadata } from "next";
import Link from "next/link";
import { Shield, BadgeCheck, Clock, Users, TrendingUp, Building2 } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
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
import { ROICalculator } from "@/components/real-estate/ROICalculator";

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
  const [featuredResult, propertiesResult, developmentsResult, neighbourhoodsResult, agentsResult] =
    await Promise.all([
      sanityFetch({ query: FEATURED_PROPERTIES_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: PROPERTIES_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: NEW_DEVELOPMENTS_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: NEIGHBOURHOODS_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: AGENTS_QUERY }).catch(() => ({ data: [] })),
    ]);

  const featured = featuredResult.data;
  const properties = propertiesResult.data;
  const developments = developmentsResult.data;
  const neighbourhoods = neighbourhoodsResult.data;
  const agents = agentsResult.data;

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

      {/* ── Trust Strip ──────────────────── */}
      <div className="border-b border-border bg-white">
        <div className="max-w-[1320px] mx-auto px-5 md:px-10 py-5 flex items-center justify-center gap-6 md:gap-10 flex-wrap">
          {[
            { icon: Shield, text: "Verified listings only" },
            { icon: BadgeCheck, text: "Licensed agents" },
            { icon: Clock, text: "Avg. 24hr response" },
            { icon: TrendingUp, text: "Real-time pricing" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-text2">
              <item.icon className="size-[15px] text-purple2 shrink-0" />
              <span className="text-[12.5px] font-semibold whitespace-nowrap">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Properties ────────────── */}
      <section className="max-w-[1320px] mx-auto px-5 md:px-10 pt-20 md:pt-28 pb-20 md:pb-24">
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-2 block">
              Editor&apos;s picks
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              Featured properties
            </h2>
            <p className="text-[15px] text-text2 mt-2 max-w-[440px]">
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
          <div className="mt-8">
            <PropertyGrid variant="standard">
              {moreFeatured.map((card) => (
                <PropertyCard key={card.id} {...card} />
              ))}
            </PropertyGrid>
          </div>
        )}
      </section>

      {/* ── Neighbourhoods ─────────────────── */}
      <section className="bg-surface py-20 md:py-28 px-5 md:px-10">
        <div className="max-w-[1320px] mx-auto">
          <div className="mb-10 md:mb-14">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-2 block">
              Explore areas
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              Popular neighbourhoods
            </h2>
            <p className="text-[15px] text-text2 mt-2 max-w-[460px]">
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
      <section className="py-20 md:py-28 px-5 md:px-10">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex items-end justify-between mb-10 md:mb-14">
            <div>
              <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-2 block">
                Verified professionals
              </span>
              <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
                Top agents in Kenya
              </h2>
              <p className="text-[15px] text-text2 mt-2 max-w-[480px]">
                Every agent is ID-verified and vetted. Work with trusted professionals who know the local market.
              </p>
            </div>
            <Link
              href="/real-estate/agents"
              className="text-[14px] font-semibold text-purple2 hover:underline whitespace-nowrap hidden sm:block"
            >
              All agents &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {agentCards.map((a) => (
              <AgentCard key={a.slug} {...a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Valuation CTA ──────────────────── */}
      <ValuationCTA />

      {/* ── New Developments ───────────────── */}
      {devs.length > 0 && (
        <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-20 md:py-28">
          <div className="mb-10 md:mb-14">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-2 block">
              Off-plan &amp; new builds
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              New developments
            </h2>
            <p className="text-[15px] text-text2 mt-2 max-w-[480px]">
              Get in early on Kenya&apos;s newest residential and commercial
              projects.
            </p>
          </div>

          <NewDevelopments developments={devs} />
        </section>
      )}

      {/* ── ROI Calculator ───────────────── */}
      <ROICalculator />

      {/* ── Want to list CTA ────────────────── */}
      <section className="relative overflow-hidden bg-[#0C0A06]">
        {/* Decorative gradient orbs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 600,
            height: 600,
            top: -200,
            right: -150,
            background: "radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 400,
            height: 400,
            bottom: -100,
            left: -100,
            background: "radial-gradient(circle, rgba(107,45,139,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-[1320px] mx-auto px-5 md:px-10 py-24 md:py-32">
          <div className="max-w-[680px] mx-auto text-center">
            <span className="inline-flex items-center gap-2 bg-amber/10 border border-amber/20 rounded-full px-4 py-1.5 text-[12px] font-bold text-amber tracking-[0.04em] uppercase mb-7">
              <Building2 className="size-3.5" />
              Free during launch
            </span>

            <h2 className="font-display text-[clamp(30px,4.5vw,52px)] font-bold text-white tracking-[-0.04em] leading-[1.05] mb-5">
              List your property
              <span className="block bg-gradient-to-r from-amber to-[#F5C842] bg-clip-text text-transparent">
                reach millions
              </span>
            </h2>
            <p className="text-white/45 text-[16px] leading-[1.75] max-w-[520px] mx-auto mb-10">
              Get your property in front of qualified buyers and renters across Kenya. No hidden fees, no commissions during our launch phase.
            </p>

            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-9 py-4 rounded-full bg-amber text-dark font-bold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_8px_24px_rgba(232,160,32,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Get started &rarr;
            </Link>

            {/* Trust row */}
            <div className="flex items-center justify-center gap-6 md:gap-8 mt-10 flex-wrap">
              {[
                { icon: Shield, label: "Secure & private" },
                { icon: Users, label: "850+ verified agents" },
                { icon: Clock, label: "List in under 5 min" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <item.icon className="size-[14px] text-white/25" />
                  <span className="text-[12.5px] text-white/35 font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────── */}
      <Footer />
    </>
  );
}
