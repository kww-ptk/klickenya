import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Suspense } from "react";
import { Check, TrendingUp } from "lucide-react";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  NEIGHBOURHOODS_QUERY,
  NEIGHBOURHOOD_BY_SLUG_QUERY,
  PROPERTIES_BY_CITY_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { PropertyBrowser } from "@/components/real-estate/PropertyBrowser";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { InternalLinkRail } from "@/components/real-estate/InternalLinkRail";
import { mapPropertiesToCards } from "@/lib/real-estate/mappers";
import { formatPrice, formatPriceFull } from "@/lib/real-estate/format";
import {
  PROPERTY_CATEGORIES,
  categoryCityPath,
  categoryPath,
  neighbourhoodPath,
} from "@/lib/real-estate/constants";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl, itemListSchema } from "@/lib/real-estate/schema";

/**
 * Neighbourhood landing pages.
 *
 * The hub has always rendered neighbourhood cards linking to
 * /real-estate/neighbourhood/<slug>, and the route did not exist: every one of
 * those links fell through to /real-estate/[slug]/[city], failed the category
 * check and 404ed. NEIGHBOURHOOD_BY_SLUG_QUERY was written and never called.
 */

export const revalidate = 3600;

/* eslint-disable @typescript-eslint/no-explicit-any */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const neighbourhoods: any[] = await sanityClient
    .fetch(NEIGHBOURHOODS_QUERY)
    .catch(() => []);

  return (neighbourhoods ?? [])
    .map((n) => n.slug?.current ?? n.slug)
    .filter(Boolean)
    .map((slug: string) => ({ slug }));
}

async function fetchNeighbourhood(slug: string) {
  return sanityClient
    .fetch(NEIGHBOURHOOD_BY_SLUG_QUERY, { slug })
    .catch(() => null);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const n = await fetchNeighbourhood(slug);
  if (!n) {
    return {
      title: "Neighbourhood not found",
      robots: { index: false, follow: false },
    };
  }

  const title = n.seoTitle ?? `Property in ${n.name}, ${n.city}`;
  const description =
    n.seoDescription ??
    `Houses, apartments and land in ${n.name}, ${n.city}. Live listings, average prices and what it is like to live there.`;
  const canonical = absoluteUrl(neighbourhoodPath(slug));

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: n.heroImage?.asset
        ? [urlForImage(n.heroImage).width(1200).height(630).url()]
        : undefined,
    },
  };
}

export default async function NeighbourhoodPage({ params }: PageProps) {
  const { slug } = await params;
  const n = await fetchNeighbourhood(slug);
  if (!n) notFound();

  // Live properties whose `neighbourhood` string matches this document, with
  // the hand-picked relatedProperties as a fallback for brand new areas.
  const live = mapPropertiesToCards(n.properties);
  const cards = live.length > 0 ? live : mapPropertiesToCards(n.relatedProperties);

  const [{ data: allNeighbourhoods }, { data: cityProperties }] = await Promise.all([
    sanityFetch({ query: NEIGHBOURHOODS_QUERY }).catch(() => ({ data: [] })),
    sanityFetch({
      query: PROPERTIES_BY_CITY_QUERY,
      params: { city: n.city ?? "" },
    }).catch(() => ({ data: [] })),
  ]);

  // Only link the city pages that actually exist. /real-estate/[category]/[city]
  // now 404s when a combination has no listings, so linking every category
  // blindly would put dead links back on the page.
  const cityCategories = new Set(
    mapPropertiesToCards(cityProperties).map((c) => c.listingCategory)
  );
  const cityCategoryLinks = PROPERTY_CATEGORIES.filter((c) =>
    cityCategories.has(c)
  ).map((c) => ({
    label: categoryHeading(c, n.city),
    href: categoryCityPath(c, n.city),
  }));

  const nearby = ((allNeighbourhoods ?? []) as any[])
    .filter(
      (other) =>
        (other.slug?.current ?? other.slug) !== slug &&
        other.city === n.city &&
        (other.propertyCount ?? 0) > 0
    )
    .slice(0, 12)
    .map((other) => ({
      label: other.name,
      href: neighbourhoodPath(other.slug?.current ?? other.slug),
      count: other.propertyCount,
    }));

  const stats = [
    n.avgPriceForSale
      ? { label: "Average sale price", value: formatPrice(n.avgPriceForSale) }
      : null,
    n.avgPriceForRent
      ? { label: "Average monthly rent", value: formatPrice(n.avgPriceForRent) }
      : null,
    n.avgPriceSqm
      ? { label: "Average price per m²", value: formatPriceFull(n.avgPriceSqm) }
      : null,
    n.avgRentalYield
      ? { label: "Average rental yield", value: `${n.avgRentalYield}%` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const heroUrl = n.heroImage?.asset
    ? urlForImage(n.heroImage).width(1600).height(700).url()
    : null;

  return (
    <>
      <JsonLd
        schema={itemListSchema(cards, {
          name: `Property in ${n.name}, ${n.city}`,
          url: neighbourhoodPath(slug),
        })}
      />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "Place",
          "@id": absoluteUrl(neighbourhoodPath(slug)),
          name: n.name,
          url: absoluteUrl(neighbourhoodPath(slug)),
          ...(heroUrl ? { image: heroUrl } : {}),
          address: {
            "@type": "PostalAddress",
            addressLocality: n.city,
            addressCountry: "KE",
          },
        }}
      />
      <Nav />

      <div className="pt-[68px]">
        {/* ── Hero ─────────────────────────── */}
        <header className="relative overflow-hidden bg-dark">
          {heroUrl && (
            <Image
              src={heroUrl}
              alt={n.heroImage?.alt || `${n.name}, ${n.city}`}
              fill
              className="object-cover opacity-55"
              sizes="100vw"
              priority
            />
          )}
          <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-20">
            <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.09em] text-amber">
              {n.city}
            </p>
            <h1 className="font-display text-[clamp(32px,4.5vw,54px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
              Property in {n.name}
            </h1>
            {n.tagline && (
              <p className="mt-3 max-w-[620px] text-[16px] leading-[1.7] text-white/65">
                {n.tagline}
              </p>
            )}
          </div>
        </header>

        <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-10">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Real Estate", path: "/real-estate" },
              { name: n.city, path: cityCategoryLinks[0]?.href },
              { name: n.name },
            ]}
          />

          {/* ── Market stats ───────────────── */}
          {stats.length > 0 && (
            <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[20px] border border-border bg-surface p-5"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-text3">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 font-display text-[22px] font-extrabold tracking-[-0.02em] text-dark">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Description ────────────────── */}
          {n.description && (
            <section className="mb-10 max-w-[760px]">
              <h2 className="font-display mb-4 text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark">
                Living in {n.name}
              </h2>
              <PortableTextRenderer value={n.description} className="max-w-none" />
            </section>
          )}

          {/* ── Highlights + commute ───────── */}
          <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.isArray(n.highlights) && n.highlights.length > 0 && (
              <div className="rounded-[24px] border border-border p-6">
                <h2 className="mb-4 text-[16px] font-bold text-text">
                  What {n.name} is known for
                </h2>
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {n.highlights.map((h: string) => (
                    <li key={h} className="flex items-center gap-2.5 text-[14.5px] text-text2">
                      <Check className="size-4 shrink-0 text-purple2" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {n.commuteInfo && (
              <div className="rounded-[24px] border border-border p-6">
                <h2 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-text">
                  <TrendingUp className="size-4 text-purple2" />
                  Getting around
                </h2>
                <p className="whitespace-pre-line text-[14.5px] leading-[1.75] text-text2">
                  {n.commuteInfo}
                </p>
              </div>
            )}
          </div>

          {/* ── Live properties ────────────── */}
          <h2 className="font-display mb-6 text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark">
            {cards.length} {cards.length === 1 ? "property" : "properties"} in {n.name}
          </h2>

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
              <PropertyBrowser
                cards={cards}
                showCityFilter={false}
                showNeighbourhoodFilter={false}
                emptyLabel={`properties in ${n.name}`}
              />
            </Suspense>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border py-16 text-center">
              <p className="mb-2 text-[17px] font-semibold text-text">
                No live listings in {n.name} right now
              </p>
              <p className="text-[15px] text-text2">
                New properties are added every week. Browse nearby areas below.
              </p>
            </div>
          )}

          <InternalLinkRail
            title={`Other neighbourhoods in ${n.city}`}
            links={nearby}
          />

          <InternalLinkRail
            title={`Browse all property in ${n.city}`}
            links={cityCategoryLinks}
          />

          <InternalLinkRail
            title="Browse all of Kenya"
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
