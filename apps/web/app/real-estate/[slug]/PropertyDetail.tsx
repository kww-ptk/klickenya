import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Bath,
  Bed,
  Building2,
  Calendar,
  Check,
  Maximize,
  MapPin,
  Trees,
} from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import { PROPERTY_BY_SLUG_QUERY, SIMILAR_PROPERTIES_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyGallery, type GalleryPhoto } from "@/components/real-estate/PropertyGallery";
import { PropertyMap } from "@/components/real-estate/PropertyMap";
import { PropertyEnquiryForm } from "@/components/real-estate/PropertyEnquiryForm";
import { AgentContactCard } from "@/components/real-estate/AgentContactCard";
import { SavePropertyButton } from "@/components/real-estate/SavePropertyButton";
import { PropertyPrice } from "@/components/real-estate/PropertyPrice";
import {
  CATEGORY_BADGE_STYLES,
  CATEGORY_LABELS,
  LISTED_BY_DESCRIPTIONS,
  STATUS_LABELS,
  isListedBy,
  type ListedBy,
  categoryPath,
  categoryCityPath,
  isClosedStatus,
  isPropertyCategory,
  propertyPath,
  type PropertyCategory,
  type PropertyStatus,
} from "@/lib/real-estate/constants";
import {
  formatAcres,
  formatPrice,
  formatPriceFull,
  getReductionPercent,
  pluralize,
  priceSuffix,
  pricePerSqm,
} from "@/lib/real-estate/format";
import { mapPropertiesToCards } from "@/lib/real-estate/mappers";
import { toCurrency } from "@/lib/real-estate/currency";
import { absoluteUrl, propertyListingSchema } from "@/lib/real-estate/schema";

/* eslint-disable @typescript-eslint/no-explicit-any */



export async function fetchProperty(slug: string) {
  return sanityClient.fetch(PROPERTY_BY_SLUG_QUERY, { slug }).catch(() => null);
}

async function PropertyDetail({ slug }: { slug: string }) {
  const property = await fetchProperty(slug);

  if (!property) notFound();
  // Drafts are not public. Sold and let listings stay reachable so inbound
  // links and indexed results land on a real page that says so.
  if (property.status === "draft") notFound();

  const category = property.listingCategory as PropertyCategory;
  const categoryLabel = isPropertyCategory(category)
    ? CATEGORY_LABELS[category]
    : "For Sale";
  const categoryStyle = isPropertyCategory(category)
    ? CATEGORY_BADGE_STYLES[category]
    : CATEGORY_BADGE_STYLES["for-sale"];

  const photos: GalleryPhoto[] = (property.photos ?? [])
    .filter((p: any) => p?.asset)
    .map((p: any) => ({
      url: urlForImage(p).width(1600).url(),
      alt: p.alt || property.title,
    }));

  const similar = await sanityClient
    .fetch(SIMILAR_PROPERTIES_QUERY, {
      category: property.listingCategory,
      neighbourhood: property.neighbourhood ?? "",
      city: property.city ?? "",
      slug,
    })
    .catch(() => []);
  const similarCards = mapPropertiesToCards(similar);

  // /real-estate/[category]/[city] 404s when that combination has no live
  // listings, which can happen once this property sells. Only link the city
  // page when a sibling listing proves it has something on it.
  const cityPageExists =
    Boolean(property.city) &&
    similarCards.some(
      (c) => c.city === property.city && c.listingCategory === property.listingCategory
    );
  const cityHref = cityPageExists
    ? categoryCityPath(category, property.city)
    : categoryPath(category);

  const features: string[] = property.features ?? [];
  const agent = property.agent;
  const closed = isClosedStatus(property.status);
  const reduction = getReductionPercent(property.previousPrice, property.price);
  const suffix = priceSuffix(property.listingCategory, property.priceType);
  const currency = toCurrency(property.currency);
  // `property` is any (Sanity), so the guard narrows nothing on its own.
  const listedBy: ListedBy | null = isListedBy(property.listedBy)
    ? (property.listedBy as ListedBy)
    : null;
  const perSqm = pricePerSqm(property.price, property.sizeSqm);
  const acres = formatAcres(property.landSizeAcres);
  const url = absoluteUrl(propertyPath(slug));
  const location = [property.neighbourhood, property.city, property.county]
    .filter(Boolean)
    .join(", ");

  const specs: { icon: React.ReactNode; label: string }[] = [];
  if (property.bedrooms > 0)
    specs.push({ icon: <Bed className="size-4" />, label: pluralize(property.bedrooms, "bed") });
  if (property.bathrooms > 0)
    specs.push({ icon: <Bath className="size-4" />, label: pluralize(property.bathrooms, "bath") });
  if (property.sizeSqm > 0)
    specs.push({
      icon: <Maximize className="size-4" />,
      label: `${property.sizeSqm.toLocaleString("en-KE")} m²`,
    });
  if (acres) specs.push({ icon: <Trees className="size-4" />, label: acres });
  if (property.propertyType)
    specs.push({
      icon: <Building2 className="size-4" />,
      label: property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1),
    });
  if (property.yearBuilt)
    specs.push({ icon: <Calendar className="size-4" />, label: `Built ${property.yearBuilt}` });

  const priceBlock = (
    <>
      <PropertyPrice
        price={property.price ?? 0}
        currency={currency}
        listingCategory={property.listingCategory}
        priceType={property.priceType}
        size="detail"
      />
      {/* formatPrice abbreviates anything over a million, so show the exact
          quoted figure underneath where it was abbreviated. */}
      {property.price >= 1_000_000 && (
        <p className="mt-0.5 text-[13px] text-text3">
          {formatPriceFull(property.price, currency)}
        </p>
      )}
      {reduction != null && reduction > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[14px] text-text3 line-through">
            {formatPrice(property.previousPrice, currency)}
          </span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-green/12 px-2 py-0.5 text-[11px] font-bold text-green">
            &darr;{reduction}% reduced
          </span>
        </div>
      )}
      {perSqm && (
        <p className="mt-2 text-[13.5px] text-text2">
          {formatPriceFull(perSqm, currency)} per m&sup2;
        </p>
      )}
    </>
  );

  return (
    <>
      <JsonLd schema={propertyListingSchema(property, photos.map((p) => p.url))} />
      <Nav />

      <article className="mx-auto max-w-[1280px] px-5 pb-8 pt-[88px] md:px-10">
        <Breadcrumbs
          className="mb-5"
          crumbs={[
            { name: "Home", path: "/" },
            { name: "Real Estate", path: "/real-estate" },
            { name: categoryLabel, path: categoryPath(category) },
            ...(cityPageExists
              ? [{ name: property.city, path: cityHref }]
              : []),
            { name: property.title },
          ]}
        />

        {/* Sold / let / under offer notice, above everything else */}
        {(closed || property.status === "under-offer") && (
          <div
            className={cn(
              "mb-6 flex flex-wrap items-center gap-3 rounded-[18px] border px-5 py-4",
              closed
                ? "border-blue-500/25 bg-blue-500/8"
                : "border-amber/30 bg-amber/8"
            )}
          >
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide",
                closed ? "bg-blue-500 text-white" : "bg-amber text-dark"
              )}
            >
              {STATUS_LABELS[property.status as PropertyStatus] ?? property.status}
            </span>
            <p className="text-[14.5px] text-text2">
              {closed
                ? "This property is no longer on the market. Browse similar properties below or enquire and we will let you know when something comparable is listed."
                : "An offer has been accepted on this property. It may still fall through, so enquiries are welcome."}
            </p>
          </div>
        )}

        <div className="mb-10">
          <PropertyGallery photos={photos} title={property.title} />
        </div>

        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          {/* ── Left column ──────────────────── */}
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-block rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide",
                  categoryStyle
                )}
              >
                {categoryLabel}
              </span>
              {property.isNewDevelopment && (
                <span className="inline-block rounded-full bg-blue-500/15 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-blue-500">
                  New development
                </span>
              )}
              {property.isFeatured && (
                <span className="inline-block rounded-full bg-amber/15 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-amber">
                  Featured
                </span>
              )}
              {listedBy && (
                <span className="inline-block rounded-full border border-border px-3 py-1 text-[12px] font-semibold text-text2">
                  {LISTED_BY_DESCRIPTIONS[listedBy]}
                </span>
              )}
            </div>

            <h1 className="font-display mb-4 text-[clamp(28px,3.5vw,42px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-dark">
              {property.title}
            </h1>

            <p className="mb-6 flex items-center gap-1.5 text-[14.5px] text-text2">
              <MapPin className="size-4 text-text3" />
              {location || "Kenya"}
            </p>

            {/* Price repeats here on mobile, where the sidebar is not visible */}
            <div className="mb-7 rounded-[24px] border border-border bg-surface p-5 lg:hidden">
              {priceBlock}
            </div>

            {specs.length > 0 && (
              <div className="mb-7 flex flex-wrap gap-2">
                {specs.map((spec) => (
                  <span
                    key={spec.label}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-text2"
                  >
                    {spec.icon}
                    {spec.label}
                  </span>
                ))}
              </div>
            )}

            <hr className="mb-7 border-border" />

            {property.description && (
              <>
                <section className="mb-7">
                  <h2 className="font-display mb-4 text-[22px] font-bold tracking-[-0.02em] text-dark">
                    About this property
                  </h2>
                  <PortableTextRenderer value={property.description} className="max-w-none" />
                </section>
                <hr className="mb-7 border-border" />
              </>
            )}

            {features.length > 0 && (
              <>
                <section className="mb-7">
                  <h2 className="font-display mb-5 text-[22px] font-bold tracking-[-0.02em] text-dark">
                    Features
                  </h2>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
                    {features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-[14.5px] text-text2">
                        <Check className="size-4 shrink-0 text-purple2" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <hr className="mb-7 border-border" />
              </>
            )}

            {property.isNewDevelopment &&
              (property.developerName ||
                property.completionPercentage != null ||
                property.unitsAvailable != null) && (
                <>
                  <section className="mb-7">
                    <h2 className="font-display mb-5 text-[22px] font-bold tracking-[-0.02em] text-dark">
                      Development details
                    </h2>
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      {property.developerName && (
                        <div className="rounded-[18px] border border-border bg-surface p-4">
                          <dt className="text-[12px] font-bold uppercase tracking-wide text-text3">
                            Developer
                          </dt>
                          <dd className="mt-1 text-[15px] font-semibold text-text">
                            {property.developerName}
                          </dd>
                        </div>
                      )}
                      {property.completionPercentage != null && (
                        <div className="rounded-[18px] border border-border bg-surface p-4">
                          <dt className="text-[12px] font-bold uppercase tracking-wide text-text3">
                            Completion
                          </dt>
                          <dd className="mt-1 text-[15px] font-semibold text-text">
                            {property.completionPercentage}%
                          </dd>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-purple2"
                              style={{ width: `${Math.min(100, property.completionPercentage)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {property.unitsAvailable != null && (
                        <div className="rounded-[18px] border border-border bg-surface p-4">
                          <dt className="text-[12px] font-bold uppercase tracking-wide text-text3">
                            Units available
                          </dt>
                          <dd className="mt-1 text-[15px] font-semibold text-text">
                            {property.unitsAvailable}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </section>
                  <hr className="mb-7 border-border" />
                </>
              )}

            {property.lat != null && property.lng != null && (
              <PropertyMap
                lat={property.lat}
                lng={property.lng}
                title={property.title}
                neighbourhood={property.neighbourhood}
                city={property.city}
              />
            )}
          </div>

          {/* ── Sticky sidebar ───────────────── */}
          <aside className="hidden w-[380px] shrink-0 lg:block">
            <div className="sticky top-[88px] flex flex-col gap-5">
              <div className="rounded-[32px] border border-border bg-white p-7 shadow-lg">
                {priceBlock}

                <div className="mt-4">
                  <SavePropertyButton
                    propertyId={property._id}
                    propertyTitle={property.title}
                    variant="inline"
                    className="w-full"
                  />
                </div>

                <hr className="my-5 border-border" />

                {agent && (
                  <>
                    <AgentContactCard
                      agent={agent}
                      propertyTitle={property.title}
                      propertyUrl={url}
                    />
                    <hr className="my-5 border-border" />
                  </>
                )}

                <PropertyEnquiryForm
                  propertyId={property._id}
                  propertyTitle={property.title}
                  agentName={agent?.displayName}
                  listingCategory={property.listingCategory}
                />
              </div>
            </div>
          </aside>
        </div>

        {similarCards.length > 0 && (
          <section className="mb-8 mt-16">
            <h2 className="font-display mb-6 text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark">
              Similar properties nearby
            </h2>
            <PropertyGrid variant="standard">
              {similarCards.map((card) => (
                <PropertyCard key={card.id} {...card} />
              ))}
            </PropertyGrid>
            <Link
              href={cityHref}
              className="mt-6 inline-block text-[14px] font-semibold text-purple2 hover:underline"
            >
              See all {CATEGORY_LABELS[category]?.toLowerCase() ?? "properties"} in{" "}
              {cityPageExists ? property.city : "Kenya"} &rarr;
            </Link>
          </section>
        )}
      </article>

      {/* ── Mobile enquiry ─────────────────── */}
      <div id="enquire" className="mx-auto max-w-[560px] px-5 pb-[160px] md:pb-28 lg:hidden">
        <div className="rounded-[32px] border border-border bg-white p-7 shadow-lg">
          {agent && (
            <>
              <AgentContactCard
                agent={agent}
                propertyTitle={property.title}
                propertyUrl={url}
              />
              <hr className="my-5 border-border" />
            </>
          )}
          <PropertyEnquiryForm
            propertyId={property._id}
            propertyTitle={property.title}
            agentName={agent?.displayName}
            listingCategory={property.listingCategory}
          />
        </div>
      </div>

      {/* ── Mobile bottom bar ──────────────────
          MobileBottomNav in the root layout is fixed at bottom-0, 62px tall,
          z-200 and md:hidden. Sitting this bar at bottom-0 too put the price
          and the Enquire button underneath it. Below md it stacks above the
          nav; from md up the nav is gone and this returns to the bottom. */}
      <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[150] flex items-center justify-between gap-3 border-t border-border bg-white px-5 py-3.5 md:bottom-0 lg:hidden">
        <div className="min-w-0">
          <PropertyPrice
            price={property.price ?? 0}
            currency={currency}
            listingCategory={property.listingCategory}
            priceType={property.priceType}
            size="bar"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SavePropertyButton
            propertyId={property._id}
            propertyTitle={property.title}
            className="size-11 rounded-full border border-border bg-white hover:bg-surface"
          />
          <a
            href="#enquire"
            className="rounded-[18px] bg-gradient-to-r from-amber to-amber2 px-6 py-3 text-[14px] font-bold text-dark shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
          >
            Enquire
          </a>
        </div>
      </div>

      <Footer />
    </>
  );
}

export { PropertyDetail };
