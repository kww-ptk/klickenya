import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import {
  AGENTS_BY_CITY_QUERY,
  NEIGHBOURHOODS_QUERY,
  PLACE_GUIDES_QUERY,
  PROPERTIES_BY_CITY_QUERY,
  PROPERTY_PLACES_QUERY,
} from "@/lib/sanity/queries";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { PropertyBrowser } from "@/components/real-estate/PropertyBrowser";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyFaq } from "@/components/real-estate/PropertyFaq";
import { AgentCard } from "@/components/real-estate/AgentCard";
import { AreaStats } from "@/components/real-estate/AreaStats";
import { ValuationCTA } from "@/components/real-estate/ValuationCTA";
import { InternalLinkRail } from "@/components/real-estate/InternalLinkRail";
import {
  WhyKlickenya,
  JoinKlickenya,
  BrowsePrompt,
} from "@/components/real-estate/AboutKlickenya";
import { mapAgent, mapPropertiesToCards, mapNeighbourhood } from "@/lib/real-estate/mappers";
import {
  CATEGORY_LABELS,
  PROPERTY_CATEGORIES,
  areaPath,
  categoryCityPath,
  categoryPath,
  citySlug,
  neighbourhoodPath,
  type PropertyCategory,
} from "@/lib/real-estate/constants";
import { categoryHeading } from "@/lib/real-estate/content";
import { getPlace, isKnownPlace, type PlaceContent } from "@/lib/real-estate/places";
import { areaHubSchema, itemListSchema } from "@/lib/real-estate/schema";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Town hub, e.g. /real-estate/watamu.
 *
 * "real estate watamu" is an AREA query, not a category query: the searcher
 * wants the whole town on one page, not four category pages to choose between.
 * Before this route the closest match on the site was
 * /real-estate/for-sale/watamu, which answers a narrower question and buries
 * land, rentals and commercial behind another click.
 *
 * The page is built to be terminal. Everything a visitor arriving cold from
 * search needs is here: the full filterable inventory for the town, the market
 * numbers, the sub-areas, what buying here actually involves, the agents, the
 * local guides, the FAQs, and an explanation of what Klickenya is for the
 * majority of that traffic that has never heard of us.
 */

const CATEGORY_BLURBS: Record<PropertyCategory, string> = {
  "for-sale": "Houses, villas and apartments",
  "for-rent": "Long term and furnished rentals",
  land: "Plots and parcels",
  commercial: "Shops, offices and hospitality",
};

export async function fetchAreaData(place: PlaceContent) {
  const [
    propertiesResult,
    neighbourhoodsResult,
    agentsResult,
    placesResult,
    guidesResult,
  ] = await Promise.all([
    sanityFetch({
      query: PROPERTIES_BY_CITY_QUERY,
      params: { city: place.name },
    }).catch(() => ({ data: [] })),
    sanityFetch({ query: NEIGHBOURHOODS_QUERY }).catch(() => ({ data: [] })),
    sanityFetch({
      query: AGENTS_BY_CITY_QUERY,
      params: { city: place.name },
    }).catch(() => ({ data: [] })),
    sanityFetch({ query: PROPERTY_PLACES_QUERY }).catch(() => ({ data: [] })),
    sanityFetch({
      query: PLACE_GUIDES_QUERY,
      params: { location: place.blogLocation, tag: place.guideTag },
    }).catch(() => ({ data: [] })),
  ]);

  // Which /[category]/[city] pages actually exist. That route refuses to build
  // an empty one, so linking a combination with no stock is a 404.
  const liveCombos = new Set<string>();
  const liveCities = new Set<string>();
  for (const row of (placesResult.data ?? []) as any[]) {
    if (!row?.city) continue;
    liveCities.add(citySlug(row.city));
    if (row.listingCategory) {
      liveCombos.add(`${row.listingCategory}/${citySlug(row.city)}`);
    }
  }

  /**
   * Journal posts for this town, real-estate tagged ones first.
   *
   * These used to be a hardcoded list per place, which meant a new Watamu
   * article never reached the hub unless somebody remembered to edit
   * places.ts. Posts are matched on the `location` enum, so every existing
   * guide qualifies with no retagging, and a `realestate-<town>` keyword on a
   * post promotes it to the top of the list.
   */
  const posts = ((guidesResult.data ?? []) as any[])
    .filter((post) => post?.slug && post?.title)
    .sort((a, b) => Number(Boolean(b.isRealEstate)) - Number(Boolean(a.isRealEstate)));

  const MAX_GUIDES = 6;

  // Curated links are reserved a slot rather than appended, because a town
  // with six published articles would otherwise push its destination page out
  // of the list entirely, and that is a link worth keeping.
  const postLinks = posts.map((post) => ({
    label: post.title as string,
    href: `/journal/${post.slug}`,
    blurb: (post.excerpt as string) ?? "",
  }));

  const seenHrefs = new Set<string>();
  const guides = [
    ...postLinks.slice(0, Math.max(0, MAX_GUIDES - place.guides.length)),
    ...place.guides,
  ].filter((guide) => {
    if (seenHrefs.has(guide.href)) return false;
    seenHrefs.add(guide.href);
    return true;
  });

  return {
    cards: mapPropertiesToCards(propertiesResult.data),
    neighbourhoods: ((neighbourhoodsResult.data ?? []) as any[]).map(mapNeighbourhood),
    agents: ((agentsResult.data ?? []) as any[])
      .map(mapAgent)
      .filter((a) => a.slug && (a.propertyCount ?? 0) > 0),
    guides,
    liveCombos,
    liveCities,
  };
}

async function AreaHub({ slug }: { slug: string }) {
  const place = getPlace(slug);
  if (!place) notFound();

  const { cards, neighbourhoods, agents, guides, liveCombos, liveCities } =
    await fetchAreaData(place);

  const path = areaPath(place.slug);

  // Counts drive which links render. A category with nothing in it would send
  // somebody to a page that 404s, since /[category]/[city] refuses to build an
  // empty one.
  const categoryCounts = PROPERTY_CATEGORIES.map((category) => ({
    category,
    count: cards.filter((c) => c.listingCategory === category).length,
  }));

  const liveCategories = categoryCounts.filter((row) => row.count > 0);

  // Sub-areas come from the registry so the section reads well before anyone
  // has created a neighbourhood document. Where a document does exist and has
  // stock, the card becomes a link.
  const areaCounts = new Map<string, number>();
  for (const card of cards) {
    if (card.neighbourhood)
      areaCounts.set(card.neighbourhood, (areaCounts.get(card.neighbourhood) ?? 0) + 1);
  }

  /**
   * `neighbourhood` is a free text field and hosts fill it in as an address:
   * "New Road, Watamu", "Turtle Bay Road". An exact match against a registry
   * sub-area therefore almost never hits, which left every sub-area card
   * showing no stock while the properties sat right there in the grid. Match
   * on containment instead.
   */
  const countInArea = (areaName: string) => {
    const needle = areaName.toLowerCase();
    return cards.filter((c) => c.neighbourhood.toLowerCase().includes(needle)).length;
  };
  const neighbourhoodSlugs = new Map(
    neighbourhoods.filter((n) => n.slug).map((n) => [n.name.toLowerCase(), n.slug])
  );

  const subAreas = place.subAreas.map((area) => ({
    ...area,
    count: countInArea(area.name),
    href: neighbourhoodSlugs.get(area.name.toLowerCase())
      ? neighbourhoodPath(neighbourhoodSlugs.get(area.name.toLowerCase()) as string)
      : null,
  }));

  // Any area with listings that the registry does not mention. Better to link
  // it than to leave the stock stranded behind a filter.
  const extraAreas = Array.from(areaCounts.entries())
    .filter(([name]) => !place.subAreas.some((a) => a.name.toLowerCase() === name.toLowerCase()))
    .filter(([name]) => neighbourhoodSlugs.has(name.toLowerCase()))
    .map(([name, count]) => ({
      label: name,
      href: neighbourhoodPath(neighbourhoodSlugs.get(name.toLowerCase()) as string),
      count,
    }));

  /**
   * A nearby town gets its hub if it has one, otherwise its for-sale city
   * page, and only when that page has something on it. Anything else is
   * dropped rather than shipped as a dead link.
   */
  const nearbyLinks = place.nearby
    .map((town) => {
      const slug = citySlug(town);
      if (isKnownPlace(slug) && liveCities.has(slug)) {
        return { label: `Real estate in ${town}`, href: areaPath(slug) };
      }
      if (liveCombos.has(`for-sale/${slug}`)) {
        return { label: `Property for sale in ${town}`, href: categoryCityPath("for-sale", slug) };
      }
      return null;
    })
    .filter(Boolean) as { label: string; href: string }[];

  const heroImage = cards.find((c) => c.coverPhoto)?.coverPhoto;

  return (
    <>
      <JsonLd schema={areaHubSchema(place, { propertyCount: cards.length })} />
      {cards.length > 0 && (
        <JsonLd
          schema={itemListSchema(cards, {
            name: `Property in ${place.name}`,
            url: path,
          })}
        />
      )}

      <Nav transparent />

      {/* ── Hero ───────────────────────────── */}
      <header className="relative isolate overflow-hidden bg-dark pb-14 pt-[132px] md:pb-20">
        {heroImage && (
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover opacity-[0.28]"
          />
        )}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(115deg, rgba(17,16,8,0.94) 0%, rgba(17,16,8,0.72) 55%, rgba(107,45,139,0.55) 100%)",
          }}
        />

        <div className="mx-auto max-w-[1320px] px-5 md:px-10">
          <div className="mb-5 flex items-center gap-1.5 text-[13px] font-semibold text-white/50">
            <MapPin className="size-3.5" aria-hidden="true" />
            {place.county}, {place.region}
          </div>

          <h1 className="font-display max-w-[900px] text-[clamp(32px,5vw,58px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-white">
            Real estate in {place.name}
          </h1>
          <p className="mt-3 max-w-[640px] text-[clamp(16px,1.7vw,19px)] font-medium leading-[1.5] text-amber">
            {place.tagline}
          </p>
          <p className="mt-5 max-w-[720px] text-[15.5px] leading-[1.75] text-white/60">
            {place.intro}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#browse"
              className="inline-flex items-center gap-2 rounded-full bg-amber px-7 py-3.5 text-[15px] font-bold text-dark shadow-[0_4px_16px_rgba(232,160,32,0.34)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,160,32,0.45)]"
            >
              Browse {cards.length > 0 ? cards.length : ""} {cards.length === 1 ? "property" : "properties"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
            <Link
              href="/real-estate/list"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
            >
              List your property
            </Link>
          </div>

          {place.quickFacts.length > 0 && (
            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-7 sm:gap-x-10 lg:grid-cols-4">
              {place.quickFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.09em] text-white/35">
                    {fact.label}
                  </dt>
                  <dd className="mt-1.5 text-[15px] font-semibold text-white">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1320px] px-5 pt-8 md:px-10">
        <Breadcrumbs
          crumbs={[
            { name: "Home", path: "/" },
            { name: "Real Estate", path: "/real-estate" },
            { name: place.name },
          ]}
          className="mb-8"
        />

        {/* ── Category shortcuts ───────────── */}
        {liveCategories.length > 0 && (
          <section aria-label={`Property categories in ${place.name}`} className="mb-12">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {liveCategories.map(({ category, count }) => (
                <Link
                  key={category}
                  href={categoryCityPath(category, place.slug)}
                  className="group rounded-[20px] border border-border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-purple2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-[15.5px] font-bold tracking-[-0.01em] text-dark">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-[13px] font-semibold text-purple2">{count}</span>
                  </div>
                  <p className="text-[13.5px] leading-[1.5] text-text2">
                    {CATEGORY_BLURBS[category]}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Everything in town, filterable ─ */}
        <section id="browse" className="scroll-mt-24">
          <h2 className="font-display mb-2 text-[clamp(24px,2.8vw,34px)] font-bold tracking-[-0.03em] text-dark">
            Property for sale and rent in {place.name}
          </h2>
          <p className="mb-6 max-w-[720px] text-[15.5px] leading-[1.7] text-text2">
            Every live listing in {place.name}, across all categories. Filter by
            price, property type, bedrooms, size and features, or sort by newest
            and lowest price.
          </p>

          {cards.length > 0 && (
            <div className="mb-6">
              <BrowsePrompt placeName={place.name} count={cards.length} />
            </div>
          )}

          {/*
            Suspense is required because PropertyBrowser reads useSearchParams,
            which on a statically rendered page is only populated on the client.
            The fallback renders the same properties in the same order, so the
            prerendered HTML already carries every listing link.
          */}
          <Suspense
            fallback={
              cards.length > 0 ? (
                <PropertyGrid variant="standard">
                  {cards.map((card, i) => (
                    <PropertyCard key={card.id} {...card} priority={i === 0} />
                  ))}
                </PropertyGrid>
              ) : null
            }
          >
            <PropertyBrowser
              cards={cards}
              showCityFilter={false}
              emptyLabel={`property in ${place.name}`}
            />
          </Suspense>
        </section>
      </div>

      {/* ── Market snapshot ────────────────── */}
      <div className="mt-16">
        <AreaStats placeName={place.name} cards={cards} />
      </div>

      {/* ── Sub-areas ──────────────────────── */}
      {subAreas.length > 0 && (
        <section className="bg-surface px-5 py-16 md:px-10 md:py-20">
          <div className="mx-auto max-w-[1320px]">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
              Explore areas
            </span>
            <h2 className="font-display text-[clamp(26px,3vw,38px)] font-bold tracking-[-0.03em] text-dark">
              Where to look in {place.name}
            </h2>
            <p className="mt-2 max-w-[680px] text-[15.5px] leading-[1.7] text-text2">
              {place.name} is several markets sitting next to each other. What you
              pay depends as much on which part of town a property sits in as on
              the property itself.
            </p>

            <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subAreas.map((area) => {
                const body = (
                  <>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-[16.5px] font-bold tracking-[-0.015em] text-dark">
                        {area.name}
                      </h3>
                      {area.count > 0 && (
                        <span className="shrink-0 rounded-full bg-purple2/10 px-2.5 py-1 text-[12px] font-bold text-purple2">
                          {area.count} listed
                        </span>
                      )}
                    </div>
                    <p className="text-[14.5px] leading-[1.7] text-text2">{area.blurb}</p>
                  </>
                );

                return area.href ? (
                  <Link
                    key={area.name}
                    href={area.href}
                    className="rounded-[20px] border border-border bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-purple2 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    key={area.name}
                    className="rounded-[20px] border border-border bg-white p-6"
                  >
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Long-form guidance ─────────────── */}
      <section className="mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,760px)_1fr] lg:gap-16">
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
              Before you buy
            </span>
            <h2 className="font-display mb-8 text-[clamp(26px,3vw,38px)] font-bold tracking-[-0.03em] text-dark">
              Buying and renting in {place.name}
            </h2>

            <div className="flex flex-col gap-10">
              {place.sections.map((section) => (
                <div key={section.heading}>
                  <h3 className="font-display mb-3 text-[clamp(19px,2vw,23px)] font-bold tracking-[-0.02em] text-dark">
                    {section.heading}
                  </h3>
                  <div className="flex flex-col gap-3.5">
                    {section.paragraphs.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 40)}
                        className="text-[15.5px] leading-[1.8] text-text2"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Local guides ───────────────── */}
          {guides.length > 0 && (
            <aside className="lg:pt-[52px]">
              <div className="rounded-[24px] border border-border bg-surface p-6 lg:sticky lg:top-[88px]">
                <h3 className="mb-1.5 text-[16px] font-bold tracking-[-0.015em] text-dark">
                  Guides to {place.name}
                </h3>
                <p className="mb-5 text-[14px] leading-[1.6] text-text2">
                  Written by the Klickenya team, for people moving here rather
                  than passing through.
                </p>
                <ul className="flex flex-col gap-3.5">
                  {guides.map((guide) => (
                    <li key={guide.href}>
                      <Link
                        href={guide.href}
                        className="group block rounded-[14px] border border-border bg-white px-4 py-3.5 transition-colors hover:border-purple2"
                      >
                        <span className="block text-[14.5px] font-semibold leading-[1.4] text-dark group-hover:text-purple2">
                          {guide.label}
                        </span>
                        {guide.blurb && (
                          <span className="mt-1 line-clamp-2 block text-[13.5px] leading-[1.55] text-text2">
                            {guide.blurb}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* ── Agents ─────────────────────────── */}
      {agents.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-5 pb-16 md:px-10 md:pb-20">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
            Local expertise
          </span>
          <h2 className="font-display text-[clamp(26px,3vw,38px)] font-bold tracking-[-0.03em] text-dark">
            Agents listing in {place.name}
          </h2>
          <p className="mt-2 max-w-[640px] text-[15.5px] leading-[1.7] text-text2">
            Every agent below has live property in {place.name} right now. The
            count is their {place.name} stock, not their whole portfolio.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {agents.slice(0, 8).map((agent) => (
              <AgentCard key={agent.slug} {...agent} />
            ))}
          </div>
        </section>
      )}

      {/* ── FAQ ────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-5 md:px-10">
        <div className="max-w-[860px]">
          <PropertyFaq
            items={place.faqs}
            title={`Buying property in ${place.name}: common questions`}
          />
        </div>
      </section>

      <div className="mt-16">
        <WhyKlickenya placeName={place.name} />
      </div>

      <ValuationCTA />

      <JoinKlickenya placeName={place.name} />

      {/* ── Internal links ─────────────────── */}
      <section className="mx-auto max-w-[1320px] px-5 pb-8 md:px-10">
        <InternalLinkRail
          title={`Browse ${place.name} by category`}
          description={`Each category page covers ${place.name} only.`}
          links={liveCategories.map(({ category, count }) => ({
            label: categoryHeading(category, place.name),
            href: categoryCityPath(category, place.slug),
            count,
          }))}
        />

        {extraAreas.length > 0 && (
          <InternalLinkRail
            title={`Neighbourhoods in and around ${place.name}`}
            links={extraAreas}
          />
        )}

        {nearbyLinks.length > 0 && (
          <InternalLinkRail
            title="Nearby towns"
            description="Other markets on this stretch of coast with live listings."
            links={nearbyLinks}
          />
        )}

        <InternalLinkRail
          title="Browse all of Kenya"
          links={PROPERTY_CATEGORIES.map((category) => ({
            label: categoryHeading(category),
            href: categoryPath(category),
          }))}
        />
      </section>

      <Footer />
    </>
  );
}

export { AreaHub };
