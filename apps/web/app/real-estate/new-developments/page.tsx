import { type Metadata } from "next";
import { Suspense } from "react";
import { sanityFetch } from "@/lib/sanity/client";
import { NEW_DEVELOPMENTS_QUERY } from "@/lib/sanity/queries";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { PropertyCategoryNav } from "@/components/real-estate/PropertyCategoryNav";
import { PropertyBrowser } from "@/components/real-estate/PropertyBrowser";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyFaq } from "@/components/real-estate/PropertyFaq";
import { InternalLinkRail } from "@/components/real-estate/InternalLinkRail";
import { mapPropertiesToCards } from "@/lib/real-estate/mappers";
import {
  PROPERTY_CATEGORIES,
  categoryCityPath,
  categoryPath,
  isPropertyCategory,
} from "@/lib/real-estate/constants";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl, itemListSchema } from "@/lib/real-estate/schema";

/**
 * Off-plan and new-build landing page.
 *
 * The hub's development cards pointed at /real-estate/new-developments/<slug>,
 * a route that never existed. New developments are ordinary `property`
 * documents with isNewDevelopment set, so their detail pages already live at
 * /real-estate/<slug>; giving them a second URL would have been duplicate
 * content. This is the index those cards should have been linking through.
 */

export const revalidate = 3600;

const PATH = "/real-estate/new-developments";

export const metadata: Metadata = {
  title: "New Developments and Off-Plan Property in Kenya",
  description:
    "Off-plan apartments, new-build houses and launch phase developments across Kenya. See the developer, completion stage and units still available on every project.",
  alternates: { canonical: absoluteUrl(PATH) },
  openGraph: {
    title: "New Developments and Off-Plan Property in Kenya | Klickenya",
    description:
      "Off-plan apartments, new-build houses and launch phase developments across Kenya.",
    url: absoluteUrl(PATH),
    type: "website",
  },
};

const FAQS = [
  {
    question: "What does buying off-plan mean in Kenya?",
    answer:
      "Buying off-plan means committing to a unit before the building is finished, often before construction starts. You pay in instalments tied to construction milestones and take possession on completion. Prices at launch are usually below the finished market value, which is the main reason buyers take the risk.",
  },
  {
    question: "What are the risks of buying off-plan?",
    answer:
      "The main risks are delay and non completion. Reduce them by checking the developer's track record on previous projects, confirming the land title is clean and in the developer's name, and insisting that your payments are tied to verified construction milestones rather than to dates.",
  },
  {
    question: "How much deposit do developers ask for?",
    answer:
      "Most Kenyan developers ask for 10 to 30 percent on booking, with the balance spread across construction stages. Terms vary by project, so ask the developer for the full payment schedule in writing before you commit anything.",
  },
  {
    question: "What does the completion percentage on a listing mean?",
    answer:
      "It is the share of construction the developer reports as finished. A project at 80 percent is close to handover and carries less delay risk than one at 20 percent, though the price usually reflects that.",
  },
];

export default async function NewDevelopmentsPage() {
  const { data: properties } = await sanityFetch({
    query: NEW_DEVELOPMENTS_QUERY,
  }).catch(() => ({ data: [] }));

  const cards = mapPropertiesToCards(properties);

  // Key the rail on the pair the card actually belongs to. Every card here is a
  // live listing, so each pair is guaranteed to have a city page with something
  // on it.
  const cityPairs = new Map<string, { city: string; href: string; count: number }>();
  for (const card of cards) {
    if (!card.city || !isPropertyCategory(card.listingCategory)) continue;
    const href = categoryCityPath(card.listingCategory, card.city);
    const existing = cityPairs.get(href);
    if (existing) existing.count += 1;
    else cityPairs.set(href, { city: card.city, href, count: 1 });
  }

  const developers = Array.from(
    new Set(cards.map((c) => c.developerName).filter(Boolean))
  ) as string[];

  return (
    <>
      <JsonLd
        schema={itemListSchema(cards, {
          name: "New developments in Kenya",
          url: PATH,
        })}
      />
      <Nav />

      <div className="pt-[68px]">
        <PropertyCategoryNav />

        <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-10">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Real Estate", path: "/real-estate" },
              { name: "New Developments" },
            ]}
          />

          <header className="mb-8 max-w-[760px]">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
              Off-plan and new builds
            </span>
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
              New developments in Kenya
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.7] text-text2">
              Projects still under construction or newly completed, across Kenya.
              Every listing shows the developer, how far along the build is and
              how many units are still available, so you can judge a launch price
              against the stage it is at.
            </p>
          </header>

          {cards.length > 0 ? (
            <Suspense
              fallback={
                <PropertyGrid variant="standard">
                  {cards.map((card, i) => (
                    <PropertyCard key={card.id} {...card} priority={i === 0} />
                  ))}
                </PropertyGrid>
              }
            >
              <PropertyBrowser cards={cards} emptyLabel="new developments" />
            </Suspense>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border py-20 text-center">
              <span className="mb-4 block text-[44px]" aria-hidden="true">
                🏗️
              </span>
              <p className="mb-2 text-[18px] font-semibold text-text">
                No developments listed right now
              </p>
              <p className="text-[15px] text-text2">
                New projects are added as they launch. Browse everything else on
                the market below.
              </p>
            </div>
          )}

          {developers.length > 0 && (
            <section className="mt-14 border-t border-border pt-10">
              <h2 className="font-display mb-4 text-[20px] font-bold tracking-[-0.02em] text-dark">
                Developers building in Kenya
              </h2>
              <p className="flex flex-wrap gap-2">
                {developers.map((developer) => (
                  <span
                    key={developer}
                    className="rounded-full border border-border bg-surface px-4 py-2 text-[14px] font-semibold text-text2"
                  >
                    {developer}
                  </span>
                ))}
              </p>
            </section>
          )}

          <div className="max-w-[860px]">
            <PropertyFaq items={FAQS} title="Buying off-plan in Kenya" />
          </div>

          <InternalLinkRail
            title="New developments by city"
            links={Array.from(cityPairs.values())
              .sort((a, b) => b.count - a.count)
              .map((pair) => ({
                label: pair.city,
                href: pair.href,
                count: pair.count,
              }))}
          />

          <InternalLinkRail
            title="Browse the rest of the market"
            links={PROPERTY_CATEGORIES.map((c) => ({
              label: categoryHeading(c),
              href: categoryPath(c),
            }))}
          />
        </section>
      </div>

      <Footer />
    </>
  );
}
