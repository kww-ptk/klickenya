import { type Metadata } from "next";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import {
  FEATURED_PROPERTIES_QUERY,
  PROPERTIES_QUERY,
  NEW_DEVELOPMENTS_QUERY,
  NEIGHBOURHOODS_QUERY,
  AGENTS_QUERY,
} from "@/lib/sanity/queries";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { PropertyHero } from "@/components/real-estate/PropertyHero";
import { PropertyCategoryNav } from "@/components/real-estate/PropertyCategoryNav";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { NeighbourhoodCard } from "@/components/real-estate/NeighbourhoodCard";
import { AgentCard } from "@/components/real-estate/AgentCard";
import { MarketDataStrip } from "@/components/real-estate/MarketDataStrip";
import { MapTeaser } from "@/components/real-estate/MapTeaser";
import { ValuationCTA } from "@/components/real-estate/ValuationCTA";
import { WhoCanList } from "@/components/real-estate/WhoCanList";
import { NewDevelopments } from "@/components/real-estate/NewDevelopments";
import { ROICalculator } from "@/components/real-estate/ROICalculator";
import { PropertyFaq } from "@/components/real-estate/PropertyFaq";
import { InternalLinkRail } from "@/components/real-estate/InternalLinkRail";
import {
  mapAgent,
  mapNeighbourhood,
  mapPropertiesToCards,
} from "@/lib/real-estate/mappers";
import {
  CATEGORY_LABELS,
  PROPERTY_CATEGORIES,
  categoryCityPath,
  categoryPath,
  isPropertyCategory,
  neighbourhoodPath,
} from "@/lib/real-estate/constants";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl, itemListSchema } from "@/lib/real-estate/schema";

export const revalidate = 3600;

/* eslint-disable @typescript-eslint/no-explicit-any */

const PATH = "/real-estate";

export const metadata: Metadata = {
  title: "Property in Kenya | Houses, Apartments and Land",
  description:
    "Buy, rent or sell property across Kenya. Browse houses, apartments, land and commercial space with asking prices in shillings, verified agents and free enquiries.",
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    title: "Property in Kenya | Houses, Apartments and Land | Klickenya",
    description:
      "Buy, rent or sell property across Kenya. Verified listings with transparent pricing.",
    url: absoluteUrl(PATH),
    type: "website",
  },
};

const FAQS = [
  {
    question: "How do I search for property on Klickenya?",
    answer:
      "Use the search box at the top of this page to pick whether you are buying, renting or looking for land, then set a location and a budget. On the results page you can narrow further by property type, bedrooms, size and features such as parking, backup power or a borehole.",
  },
  {
    question: "Does it cost anything to enquire about a property?",
    answer:
      "No. Enquiries are free and go directly to the listing agent or owner along with your phone number, so a viewing can be arranged the same day.",
  },
  {
    question: "Can I list my own property?",
    answer:
      "Yes. Owners, agents and developers can all list on Klickenya, and listing is free during the launch phase. Submit your property through the listing form and it goes live once it has been reviewed.",
  },
  {
    question: "Are the prices on Klickenya negotiable?",
    answer:
      "Prices shown are asking prices set by the seller or landlord. Negotiation is normal in the Kenyan market, particularly on properties that have been listed for a while. Where a seller has reduced their price we show the previous figure on the listing.",
  },
];

export default async function RealEstateHomePage() {
  const [featuredResult, propertiesResult, developmentsResult, neighbourhoodsResult, agentsResult] =
    await Promise.all([
      sanityFetch({ query: FEATURED_PROPERTIES_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: PROPERTIES_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: NEW_DEVELOPMENTS_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: NEIGHBOURHOODS_QUERY }).catch(() => ({ data: [] })),
      sanityFetch({ query: AGENTS_QUERY }).catch(() => ({ data: [] })),
    ]);

  // PROPERTIES_QUERY was already being fetched here and the result thrown away.
  // It now feeds the market snapshot and the city rails.
  const allProperties = mapPropertiesToCards(propertiesResult.data);
  const featuredCards = mapPropertiesToCards(featuredResult.data);
  const devs = mapPropertiesToCards(developmentsResult.data);

  const heroFeatured = featuredCards.slice(0, 3);
  const moreFeatured = featuredCards.slice(3, 8);

  const neighbourhoodCards = ((neighbourhoodsResult.data ?? []) as any[])
    .map(mapNeighbourhood)
    // An area page with nothing on it is not worth sending anyone to.
    .filter((n) => n.slug && (n.propertyCount ?? 0) > 0)
    .slice(0, 8);

  const agentCards = ((agentsResult.data ?? []) as any[])
    .map(mapAgent)
    .filter((a) => a.slug)
    .sort((a, b) => (b.propertyCount ?? 0) - (a.propertyCount ?? 0))
    .slice(0, 8);

  const neighbourhoodSlugs = Object.fromEntries(
    ((neighbourhoodsResult.data ?? []) as any[])
      .map(mapNeighbourhood)
      .filter((n) => n.slug)
      .map((n) => [n.name, n.slug])
  );

  // City rails, built from live listings so every link lands on a real page.
  const cityPairs = new Map<string, { label: string; href: string; count: number }>();
  for (const card of allProperties) {
    if (!card.city || !isPropertyCategory(card.listingCategory)) continue;
    const href = categoryCityPath(card.listingCategory, card.city);
    const existing = cityPairs.get(href);
    if (existing) existing.count += 1;
    else
      cityPairs.set(href, {
        label: `${CATEGORY_LABELS[card.listingCategory]} in ${card.city}`,
        href,
        count: 1,
      });
  }

  const cityLinks = Array.from(cityPairs.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <>
      <JsonLd
        schema={itemListSchema(featuredCards, {
          name: "Featured property in Kenya",
          url: PATH,
        })}
      />
      <Nav transparent />

      <PropertyHero />

      <PropertyCategoryNav activeCategory="all" />

      {/* ── Featured ───────────────────────── */}
      {featuredCards.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
                Editor&apos;s picks
              </span>
              <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
                Featured properties
              </h2>
              <p className="mt-1.5 text-[15px] text-text2">
                Hand picked listings curated by the Klickenya team.
              </p>
            </div>
            <Link
              href={categoryPath("for-sale")}
              className="hidden whitespace-nowrap text-[14px] font-semibold text-purple2 hover:underline sm:block"
            >
              View all &rarr;
            </Link>
          </div>

          {heroFeatured.length > 0 && (
            <PropertyGrid variant="featured">
              {heroFeatured.map((card, i) => (
                <PropertyCard key={card.id} {...card} large={i === 0} priority={i === 0} />
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
      )}

      <WhoCanList />

      {/* ── Neighbourhoods ─────────────────── */}
      {neighbourhoodCards.length > 0 && (
        <section className="bg-surface px-5 py-14 md:px-10">
          <div className="mx-auto max-w-[1320px]">
            <div className="mb-8">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
                Explore areas
              </span>
              <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
                Popular neighbourhoods
              </h2>
              <p className="mt-1.5 text-[15px] text-text2">
                Average prices, what each area is like, and everything currently
                listed there.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {neighbourhoodCards.map((n) => (
                <NeighbourhoodCard key={n.slug} {...n} />
              ))}
            </div>
          </div>
        </section>
      )}

      <MarketDataStrip
        properties={allProperties}
        neighbourhoodSlugs={neighbourhoodSlugs}
      />

      <MapTeaser />

      {/* ── Agents ─────────────────────────── */}
      {agentCards.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
          <div className="mb-8">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
              Verified professionals
            </span>
            <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
              Agents listing on Klickenya
            </h2>
            <p className="mt-1.5 text-[15px] text-text2">
              Every agent below has live property on the site.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {agentCards.map((a) => (
              <AgentCard key={a.slug} {...a} />
            ))}
          </div>
        </section>
      )}

      <ValuationCTA />

      {/* ── New developments ───────────────── */}
      {devs.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
                Off-plan and new builds
              </span>
              <h2 className="text-[clamp(26px,3vw,40px)] font-bold tracking-[-0.03em] text-text">
                New developments
              </h2>
              <p className="mt-1.5 text-[15px] text-text2">
                Get in early on Kenya&apos;s newest residential and commercial
                projects.
              </p>
            </div>
            <Link
              href="/real-estate/new-developments"
              className="hidden whitespace-nowrap text-[14px] font-semibold text-purple2 hover:underline sm:block"
            >
              View all &rarr;
            </Link>
          </div>

          <NewDevelopments
            developments={devs.map((d) => ({
              title: d.title,
              slug: d.slug,
              developerName: d.developerName,
              city: d.city,
              neighbourhood: d.neighbourhood,
              price: d.price,
              completionPercentage: d.completionPercentage,
              unitsAvailable: d.unitsAvailable,
              coverPhoto: d.coverPhoto,
              isNewDevelopment: d.isNewDevelopment,
            }))}
          />
        </section>
      )}

      <ROICalculator />

      {/* ── FAQ + internal links ───────────── */}
      <section className="mx-auto max-w-[1320px] px-5 pb-4 pt-14 md:px-10">
        <div className="max-w-[860px]">
          <PropertyFaq items={FAQS} title="Buying and renting in Kenya" />
        </div>

        <InternalLinkRail
          title="Browse by category"
          links={PROPERTY_CATEGORIES.map((c) => ({
            label: categoryHeading(c),
            href: categoryPath(c),
          }))}
        />

        <InternalLinkRail
          title="Browse by city"
          description="Every town and city with live listings on Klickenya."
          links={cityLinks}
        />

        {neighbourhoodCards.length > 0 && (
          <InternalLinkRail
            title="Browse by neighbourhood"
            links={neighbourhoodCards.map((n) => ({
              label: n.name,
              href: neighbourhoodPath(n.slug),
              count: n.propertyCount,
            }))}
          />
        )}
      </section>

      {/* ── List CTA ───────────────────────── */}
      <section className="bg-[#111008] py-16 md:py-20">
        <div className="mx-auto max-w-[1320px] px-5 text-center md:px-10">
          <h2 className="font-display mb-4 text-[clamp(28px,4vw,44px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
            Want to list your property?
          </h2>
          <p className="mx-auto mb-8 max-w-[560px] text-[16px] leading-[1.7] text-white/50">
            Get your property in front of buyers and renters across Kenya.
            Listing is free during our launch phase.
          </p>
          {/* This used to point at /how-it-works, which is not the listing form. */}
          <Link
            href="/real-estate/list"
            className="inline-flex items-center justify-center rounded-full bg-amber px-8 py-4 text-[15px] font-semibold text-dark shadow-[0_4px_14px_rgba(232,160,32,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] active:translate-y-0"
          >
            List your property &rarr;
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
