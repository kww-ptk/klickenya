import { Suspense } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PropertyCategoryNav } from "@/components/real-estate/PropertyCategoryNav";
import { PropertyBrowser } from "@/components/real-estate/PropertyBrowser";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { PropertyFaq } from "@/components/real-estate/PropertyFaq";
import { InternalLinkRail, type RailLink } from "@/components/real-estate/InternalLinkRail";
import type { PropertyCardData } from "@/lib/real-estate/mappers";
import type { PropertyCategory } from "@/lib/real-estate/constants";
import {
  categoryBody,
  categoryFaqs,
  categoryIntro,
  categoryPhrase,
} from "@/lib/real-estate/content";
import { itemListSchema, type Crumb } from "@/lib/real-estate/schema";

/**
 * One shell for every property results page. /real-estate/[category] and
 * /real-estate/[category]/[city] were two near-identical 220 line files that
 * drifted apart; both now render this.
 */

interface CategoryPageShellProps {
  category: PropertyCategory;
  /** "Kenya", "Nairobi", "Kilimani" — used in the copy and the H1. */
  place: string;
  heading: string;
  crumbs: Crumb[];
  canonicalPath: string;
  cards: PropertyCardData[];
  rails?: { title: string; description?: string; links: RailLink[] }[];
  showCityFilter?: boolean;
  showNeighbourhoodFilter?: boolean;
}

function CategoryPageShell({
  category,
  place,
  heading,
  crumbs,
  canonicalPath,
  cards,
  rails = [],
  showCityFilter = true,
  showNeighbourhoodFilter = true,
}: CategoryPageShellProps) {
  const body = categoryBody(category, place);
  const faqs = categoryFaqs(category, place);

  return (
    <>
      <JsonLd schema={itemListSchema(cards, { name: heading, url: canonicalPath })} />
      <Nav />

      <div className="pt-[68px]">
        <PropertyCategoryNav activeCategory={category} />

        <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-10">
          <Breadcrumbs crumbs={crumbs} />

          <header className="mb-8 max-w-[760px]">
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
              {heading}
            </h1>
            <p className="mt-3 text-[15.5px] leading-[1.7] text-text2">
              {categoryIntro(category, place)}
            </p>
          </header>

          {/*
            Suspense is required because PropertyBrowser reads useSearchParams,
            which is only populated on the client for a statically rendered page.
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
              showCityFilter={showCityFilter}
              showNeighbourhoodFilter={showNeighbourhoodFilter}
              emptyLabel={categoryPhrase(category, place)}
            />
          </Suspense>

          {/* Long-form copy sits below the results so it never pushes the grid down. */}
          {body.length > 0 && (
            <section className="mt-16 max-w-[760px]">
              <h2 className="font-display mb-4 text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark">
                {heading}: what to know
              </h2>
              <div className="flex flex-col gap-4">
                {body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-[15.5px] leading-[1.8] text-text2">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          )}

          <div className="max-w-[860px]">
            <PropertyFaq items={faqs} />
          </div>

          {rails.map((rail) => (
            <InternalLinkRail
              key={rail.title}
              title={rail.title}
              description={rail.description}
              links={rail.links}
            />
          ))}
        </section>
      </div>

      <Footer />
    </>
  );
}

export { CategoryPageShell };
