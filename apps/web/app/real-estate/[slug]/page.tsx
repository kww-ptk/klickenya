import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Calendar,
  Check,
  Phone,
} from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import {
  PROPERTIES_BY_CATEGORY_QUERY,
  PROPERTY_BY_SLUG_QUERY,
  PROPERTY_SLUGS_QUERY,
  SIMILAR_PROPERTIES_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PropertyCategoryNav } from "@/components/real-estate/PropertyCategoryNav";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyEnquiryForm } from "@/components/real-estate/PropertyEnquiryForm";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 3600;

/* ── Category constants ────────────────────────────── */

const VALID_CATEGORIES = ["for-sale", "for-rent", "land", "commercial"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  "for-sale": "For Sale",
  "for-rent": "For Rent",
  land: "Land",
  commercial: "Commercial",
};

function isValidCategory(value: string): value is Category {
  return VALID_CATEGORIES.includes(value as Category);
}

/* ── Helpers ───────────────────────────────────────── */

function capitalize(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `KSh ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `KSh ${price.toLocaleString()}`;
}

function getReductionPercent(previous: number, current: number): number | null {
  if (previous <= current) return null;
  return Math.round(((previous - current) / previous) * 100);
}

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

const STATUS_COLORS: Record<string, string> = {
  "for-sale": "bg-purple2/15 text-purple2",
  "for-rent": "bg-green/15 text-green",
  land: "bg-amber/15 text-amber",
  commercial: "bg-blue-500/15 text-blue-500",
  "under-offer": "bg-dark/10 text-dark",
};

/* ── Static params ─────────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { slug: string; listingCategory: string }[] = await sanityClient
    .fetch(PROPERTY_SLUGS_QUERY)
    .catch(() => []);

  // Include both category routes and property slug routes
  const params: { slug: string }[] = VALID_CATEGORIES.map((c) => ({ slug: c }));

  for (const item of slugs ?? []) {
    if (item.slug) {
      params.push({ slug: item.slug });
    }
  }

  return params;
}

/* ── Metadata ──────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  // Category page metadata
  if (isValidCategory(slug)) {
    const label = CATEGORY_LABELS[slug];
    const title = `Properties ${label} in Kenya | Klickenya`;
    const description = `Browse properties ${label.toLowerCase()} across Kenya. Verified listings with transparent pricing on Klickenya.`;
    return {
      title,
      description,
      alternates: { canonical: `https://klickenya.com/real-estate/${slug}` },
      openGraph: { title, description, url: `https://klickenya.com/real-estate/${slug}` },
    };
  }

  // Property detail metadata
  const property = await sanityClient
    .fetch(PROPERTY_BY_SLUG_QUERY, { slug })
    .catch(() => null);

  if (!property) return {};

  const title = property.seoTitle ?? `${property.title} | Klickenya Property`;
  const description =
    property.seoDescription ??
    `${property.propertyType ?? "Property"} ${property.listingCategory === "for-rent" ? "for rent" : "for sale"} in ${property.neighbourhood ?? ""}, ${property.city ?? "Kenya"}.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ogImages = (property.photos ?? []).slice(0, 3).map((p: any) =>
    urlForImage(p).width(1200).height(630).url()
  );

  return {
    title,
    description,
    alternates: { canonical: `https://klickenya.com/real-estate/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://klickenya.com/real-estate/${slug}`,
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}

/* ── Category Page Component ───────────────────────── */

async function CategoryPageView({ category }: { category: Category }) {
  const label = CATEGORY_LABELS[category];

  const properties = await sanityClient
    .fetch(PROPERTIES_BY_CATEGORY_QUERY, { category })
    .catch(() => []);

  const cards = ((properties ?? []) as unknown[]).map(mapPropertyToCard);

  return (
    <>
      <Nav />

      <div className="pt-[68px]">
        <PropertyCategoryNav activeCategory={category} />

        <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
              <li>
                <Link href="/" className="hover:text-text transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li>
                <Link
                  href="/real-estate"
                  className="hover:text-text transition-colors"
                >
                  Real Estate
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li className="font-semibold text-text">{label}</li>
            </ol>
          </nav>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark">
              Properties {label}
            </h1>
            <p className="mt-2 text-[15px] text-text2">
              {cards.length > 0
                ? `${cards.length} propert${cards.length !== 1 ? "ies" : "y"} found`
                : "No properties found yet"}
            </p>
          </div>

          {/* Grid or empty state */}
          {cards.length > 0 ? (
            <PropertyGrid variant="standard">
              {cards.map((card) => (
                <PropertyCard key={card.id} {...card} />
              ))}
            </PropertyGrid>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-[48px] mb-4">🏠</span>
              <p className="text-[18px] font-semibold text-text mb-2">
                No properties {label.toLowerCase()} yet
              </p>
              <p className="text-[15px] text-text2 max-w-[380px]">
                We&apos;re adding new properties all the time. Check back soon
                or explore another category.
              </p>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </>
  );
}

/* ── Property Detail Component ─────────────────────── */

async function PropertyDetailView({ slug }: { slug: string }) {
  const property = await sanityClient
    .fetch(PROPERTY_BY_SLUG_QUERY, { slug })
    .catch(() => null);

  if (!property) notFound();

  const categoryLabel =
    CATEGORY_LABELS[property.listingCategory as Category] ??
    capitalize(property.listingCategory ?? "for-sale");

  // Photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photos: string[] = (property.photos ?? []).map((p: any) =>
    urlForImage(p).width(1000).url()
  );

  // Similar properties
  const similar = await sanityClient
    .fetch(SIMILAR_PROPERTIES_QUERY, {
      category: property.listingCategory,
      neighbourhood: property.neighbourhood ?? "",
      slug,
    })
    .catch(() => []);

  const similarCards = ((similar ?? []) as unknown[]).map(mapPropertyToCard);

  const features: string[] = property.features ?? [];
  const agent = property.agent;

  const reduction =
    property.previousPrice != null
      ? getReductionPercent(property.previousPrice, property.price ?? 0)
      : null;

  const statusColor =
    STATUS_COLORS[property.listingCategory] ?? "bg-purple2/15 text-purple2";

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description:
      property.seoDescription ?? `${property.title} in ${property.city}`,
    image: photos[0],
    url: `https://klickenya.com/real-estate/${slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      addressRegion: property.county,
      addressCountry: "KE",
    },
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "KES",
    },
  };

  return (
    <>
      <JsonLd schema={jsonLd} />
      <Nav />

      <article className="max-w-[1280px] mx-auto px-5 md:px-10 py-8 pt-[88px]">
        {/* ── Breadcrumb ────────────────────── */}
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
            <li>
              <Link href="/" className="hover:text-text transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3 text-text3" />
            </li>
            <li>
              <Link
                href="/real-estate"
                className="hover:text-text transition-colors"
              >
                Real Estate
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3 text-text3" />
            </li>
            <li>
              <Link
                href={`/real-estate/${property.listingCategory ?? "for-sale"}`}
                className="hover:text-text transition-colors"
              >
                {categoryLabel}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3 text-text3" />
            </li>
            <li className="font-semibold text-text line-clamp-1">
              {property.title}
            </li>
          </ol>
        </nav>

        {/* ── Photo gallery ────────────────── */}
        <div className="rounded-[32px] overflow-hidden mb-10">
          {photos.length >= 5 ? (
            <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[420px] md:h-[480px]">
              {/* Main image */}
              <div className="col-span-2 row-span-2 relative">
                <Image
                  src={photos[0]}
                  alt={property.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              {photos.slice(1, 5).map((photo, i) => (
                <div key={i} className="relative">
                  <Image
                    src={photo}
                    alt={`${property.title} photo ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                </div>
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="relative aspect-[16/9] md:aspect-[2.2/1]">
              <Image
                src={photos[0]}
                alt={property.title}
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
            </div>
          ) : (
            <div className="aspect-[16/9] bg-surface2 flex items-center justify-center">
              <span className="text-[48px]">🏠</span>
            </div>
          )}
        </div>

        {/* ── Two-column layout ────────────── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {/* Status badge */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={cn(
                  "inline-block rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wide",
                  statusColor
                )}
              >
                {categoryLabel}
              </span>
              {property.isNewDevelopment && (
                <span className="inline-block rounded-full bg-blue-500/15 text-blue-500 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">
                  New Development
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display text-[clamp(28px,3.5vw,42px)] font-extrabold tracking-[-0.03em] text-dark leading-[1.1] mb-4">
              {property.title}
            </h1>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-[14.5px] text-text2 mb-6">
              <MapPin className="size-4 text-text3" />
              <span>
                {property.neighbourhood
                  ? `${property.neighbourhood}, `
                  : ""}
                {property.city ?? ""}
                {property.county ? `, ${property.county}` : ""}
              </span>
            </div>

            {/* Key specs row */}
            {(property.bedrooms ||
              property.bathrooms ||
              property.sizeSqm ||
              property.yearBuilt) && (
              <div className="flex flex-wrap gap-2 mb-7">
                {property.bedrooms != null && property.bedrooms > 0 && (
                  <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface border border-border text-[13px] font-semibold text-text2">
                    <Bed className="size-4" />
                    {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
                  </span>
                )}
                {property.bathrooms != null && property.bathrooms > 0 && (
                  <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface border border-border text-[13px] font-semibold text-text2">
                    <Bath className="size-4" />
                    {property.bathrooms} bath
                    {property.bathrooms !== 1 ? "s" : ""}
                  </span>
                )}
                {property.sizeSqm != null && property.sizeSqm > 0 && (
                  <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface border border-border text-[13px] font-semibold text-text2">
                    <Maximize className="size-4" />
                    {property.sizeSqm.toLocaleString()} m&sup2;
                  </span>
                )}
                {property.yearBuilt != null && (
                  <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface border border-border text-[13px] font-semibold text-text2">
                    <Calendar className="size-4" />
                    Built {property.yearBuilt}
                  </span>
                )}
              </div>
            )}

            <hr className="border-border mb-7" />

            {/* Description */}
            {property.description && (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-4">
                    About this property
                  </h2>
                  <PortableTextRenderer
                    value={property.description}
                    className="max-w-none"
                  />
                </div>
                <hr className="border-border mb-7" />
              </>
            )}

            {/* Features grid */}
            {features.length > 0 && (
              <div className="mb-7">
                <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-5">
                  Features
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                  {features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 text-[14.5px] text-text2"
                    >
                      <Check className="size-4 text-purple2 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: sticky sidebar */}
          <aside className="hidden lg:block w-[380px] shrink-0">
            <div className="sticky top-[88px] flex flex-col gap-5">
              {/* Price card */}
              <div className="border border-border rounded-[32px] shadow-lg p-7 bg-white">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display text-[32px] font-extrabold tracking-[-0.03em] text-dark">
                    {formatPrice(property.price ?? 0)}
                  </span>
                  {property.listingCategory === "for-rent" && (
                    <span className="text-[14px] text-text2">/month</span>
                  )}
                </div>
                {reduction != null && reduction > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="line-through text-[14px] text-text3">
                      {formatPrice(property.previousPrice)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green/12 text-[11px] font-bold text-green">
                      &darr;{reduction}% reduced
                    </span>
                  </div>
                )}

                <hr className="border-border my-5" />

                {/* Agent card */}
                {agent && (
                  <div className="mb-5">
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="size-14 rounded-full overflow-hidden bg-surface2 border-2 border-white shadow-sm shrink-0">
                        {agent.photo ? (
                          <Image
                            src={urlForImage(agent.photo).width(120).url()}
                            alt={agent.displayName}
                            width={56}
                            height={56}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-[20px] font-bold text-text3">
                            {(agent.displayName ?? "A").charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[15px] font-bold text-text truncate">
                            {agent.displayName}
                          </p>
                          {agent.isVerified && (
                            <span className="size-[18px] rounded-full bg-purple2 flex items-center justify-center shrink-0">
                              <Check
                                className="size-[10px] text-white"
                                strokeWidth={3}
                              />
                            </span>
                          )}
                        </div>
                        {agent.agencyName && (
                          <p className="text-[12.5px] text-text3 truncate">
                            {agent.agencyName}
                          </p>
                        )}
                      </div>
                    </div>

                    {agent.phone && (
                      <a
                        href={`tel:${agent.phone}`}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full py-3 rounded-[16px] text-[14px] font-bold mb-2",
                          "bg-gradient-to-r from-amber to-amber2 text-dark",
                          "shadow-[0_4px_14px_rgba(232,160,32,0.35)]",
                          "hover:-translate-y-0.5 transition-all"
                        )}
                      >
                        <Phone className="size-4" />
                        {agent.phone}
                      </a>
                    )}

                    <Link
                      href={`/real-estate/agent/${agent.slug?.current ?? agent.slug ?? ""}`}
                      className="text-[13px] font-semibold text-purple2 hover:underline block text-center"
                    >
                      View all by agent &rarr;
                    </Link>

                    <hr className="border-border my-5" />
                  </div>
                )}

                {/* Enquiry form */}
                <PropertyEnquiryForm
                  propertyId={property._id}
                  propertyTitle={property.title}
                  agentName={agent?.displayName}
                />
              </div>
            </div>
          </aside>
        </div>

        {/* ── Similar properties ────────────── */}
        {similarCards.length > 0 && (
          <section className="mt-16 mb-8">
            <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
              Similar properties nearby
            </h2>
            <PropertyGrid variant="standard">
              {similarCards.map((card) => (
                <PropertyCard key={card.id} {...card} />
              ))}
            </PropertyGrid>
          </section>
        )}
      </article>

      {/* ── Mobile bottom bar ──────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-border px-5 py-3.5 flex items-center justify-between lg:hidden">
        <div>
          <span className="font-display text-[20px] font-extrabold tracking-[-0.02em] text-dark">
            {formatPrice(property.price ?? 0)}
          </span>
          {property.listingCategory === "for-rent" && (
            <span className="text-[14px] text-text2"> /month</span>
          )}
        </div>
        <a
          href="#mobile-enquiry"
          className={cn(
            "px-6 py-3 rounded-[18px] text-[14px] font-bold",
            "bg-gradient-to-r from-amber to-amber2 text-dark",
            "shadow-[0_4px_14px_rgba(232,160,32,0.35)]"
          )}
        >
          Enquire
        </a>
      </div>

      {/* ── Mobile enquiry form ────────────── */}
      <div
        id="mobile-enquiry"
        className="lg:hidden max-w-[560px] mx-auto px-5 pb-24"
      >
        <div className="border border-border rounded-[32px] shadow-lg p-7 bg-white">
          <PropertyEnquiryForm
            propertyId={property._id}
            propertyTitle={property.title}
            agentName={agent?.displayName}
          />
        </div>
      </div>

      <Footer />
    </>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default async function DynamicSlugPage({ params }: PageProps) {
  const { slug } = await params;

  // If slug matches a known category, render the category page
  if (isValidCategory(slug)) {
    return <CategoryPageView category={slug} />;
  }

  // Otherwise, render the property detail page
  return <PropertyDetailView slug={slug} />;
}
