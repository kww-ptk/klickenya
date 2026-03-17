import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  DESTINATION_BY_SLUG_QUERY,
  DESTINATIONS_QUERY,
  HOMEPAGE_DESTINATIONS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import { DestinationBentoGrid } from "@/components/destinations/DestinationBentoGrid";

export const dynamic = 'force-static';
export const revalidate = 3600;

/* ── Type mapping for related listings ───────────── */

const SANITY_TYPE_TO_URL: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
};

/* ── Static params ───────────────────────────────── */

export async function generateStaticParams() {
  const destinations: { slug: { current: string } }[] =
    await sanityClient.fetch(DESTINATIONS_QUERY);

  return (destinations ?? [])
    .filter((d) => d.slug)
    .map((d) => ({
      slug: typeof d.slug === "string" ? d.slug : d.slug.current,
    }));
}

/* ── Metadata ────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const destination = await sanityClient.fetch(DESTINATION_BY_SLUG_QUERY, {
    slug,
  });

  if (!destination) return {};

  const title =
    destination.seoTitle ?? `${destination.name} | Klickenya Destinations`;
  const description =
    destination.seoDescription ??
    destination.tagline ??
    `Explore ${destination.name}, Kenya on Klickenya.`;

  const ogImage = destination.heroImage
    ? urlForImage(destination.heroImage).width(1200).height(630).url()
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `https://klickenya.com/destinations/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://klickenya.com/destinations/${slug}`,
      images: ogImage ? [ogImage] : [],
      type: "website",
    },
  };
}

/* ── Page ────────────────────────────────────────── */

export default async function DestinationPage({ params }: PageProps) {
  const { slug } = await params;

  const [{ data: destination }, { data: allDestinations }] = await Promise.all([
    sanityFetch({
      query: DESTINATION_BY_SLUG_QUERY,
      params: { slug },
    }),
    sanityFetch({ query: HOMEPAGE_DESTINATIONS_QUERY }).catch(() => ({
      data: [],
    })),
  ]);

  if (!destination) notFound();

  const heroUrl = destination.heroImage
    ? urlForImage(destination.heroImage).width(1920).url()
    : "";

  const highlights: { title: string; description: string }[] =
    destination.highlights ?? [];

  // Related listings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const relatedCards: ListingCardProps[] = (destination.relatedListings ?? []).map((l: any) => {
    const lSlug = l.slug?.current ?? l.slug ?? "";
    const lCity = (l.city ?? "").toLowerCase().replace(/\s+/g, "-");
    const urlType = SANITY_TYPE_TO_URL[l.type] ?? "stays";
    const photoUrl = l.coverPhoto
      ? urlForImage(l.coverPhoto).width(800).url()
      : "";

    return {
      id: l._id,
      title: l.title ?? "Untitled",
      city: l.city ?? "",
      price: l.price ?? 0,
      priceUnit: l.priceUnit ?? "night",
      type: l.type as ListingCardProps["type"],
      photos: photoUrl ? [photoUrl] : [],
      href: `/${urlType}/${lCity}/${lSlug}`,
    };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: destination.name,
    description:
      destination.seoDescription ??
      destination.tagline ??
      `Explore ${destination.name}`,
    image: heroUrl,
    address: {
      "@type": "PostalAddress",
      addressRegion: destination.county,
      addressCountry: "KE",
    },
  };

  return (
    <>
      <Nav transparent />
      <JsonLd schema={jsonLd} />

      {/* ── Hero ────────────────────────────── */}
      <section className="relative h-[65vh] min-h-[420px] max-h-[680px] overflow-hidden">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt={destination.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-5">
          <h1 className="font-display text-[clamp(36px,5vw,64px)] font-extrabold tracking-[-0.03em] text-white leading-[1.05] mb-4 animate-fade-up">
            {destination.name}
          </h1>
          {destination.tagline && (
            <p className="text-[clamp(16px,2vw,20px)] text-white/80 max-w-[560px] animate-fade-up [animation-delay:0.1s]">
              {destination.tagline}
            </p>
          )}
          {destination.county && (
            <span className="mt-5 inline-block rounded-full bg-white/15 backdrop-blur-[8px] px-4 py-1.5 text-[13px] font-semibold text-white/90 animate-fade-up [animation-delay:0.2s]">
              {destination.county}, Kenya
            </span>
          )}
        </div>
      </section>

      {/* ── Breadcrumb ──────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-5 md:px-10 pt-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
            <li>
              <Link href="/" className="hover:text-text transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-text3">
              /
            </li>
            <li>
              <Link
                href="/destinations"
                className="hover:text-text transition-colors"
              >
                Destinations
              </Link>
            </li>
            <li aria-hidden="true" className="text-text3">
              /
            </li>
            <li className="font-semibold text-text">{destination.name}</li>
          </ol>
        </nav>
      </div>

      {/* ── Description ─────────────────────── */}
      {destination.description && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-12">
          <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold tracking-[-0.03em] text-dark mb-6">
            About {destination.name}
          </h2>
          <PortableTextRenderer
            value={destination.description}
            className="max-w-[760px]"
          />
        </section>
      )}

      {/* ── Highlights ──────────────────────── */}
      {highlights.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-12">
          <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
            Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {highlights.map((h, i) => (
              <div
                key={i}
                className="border border-border rounded-[var(--radius-lg)] p-6 bg-white hover:shadow-sm transition-shadow"
              >
                <h3 className="text-[16px] font-semibold text-text mb-2">
                  {h.title}
                </h3>
                <p className="text-[14px] text-text2 leading-[1.65]">
                  {h.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Related listings ────────────────── */}
      {relatedCards.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-16">
          <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
            Things to do in {destination.name}
          </h2>
          <ListingGrid listings={relatedCards} columns={4} />
        </section>
      )}

      {/* ── Explore more destinations ────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold tracking-[-0.03em] text-dark">
                Explore more destinations
              </h2>
              <p className="text-text2 text-[15px] mt-1.5">
                Discover other amazing places across Kenya
              </p>
            </div>
            <Link
              href="/destinations"
              className="hidden md:flex text-[14px] font-semibold text-amber hover:underline shrink-0"
            >
              View all
            </Link>
          </div>

          <DestinationBentoGrid
            destinations={((allDestinations ?? []) as any[]).map((d: any) => ({
              name: d.name,
              slug: d.slug?.current ?? d.slug ?? "",
              tagline: d.tagline ?? "",
              color: "",
              imageUrl: d.heroImage?.asset?.url,
            }))}
            currentSlug={slug}
          />
        </div>
      </section>

      <Footer />
    </>
  );
}
