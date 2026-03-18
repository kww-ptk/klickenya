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

      {/* ── Main content + Sidebar ─────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left: Description */}
          <div className="flex-1 min-w-0">
            {destination.description && (
              <div className="mb-10">
                <h2 className="font-display text-[clamp(24px,3vw,34px)] font-bold tracking-[-0.03em] text-dark mb-6">
                  About {destination.name}
                </h2>
                <PortableTextRenderer
                  value={destination.description}
                  className=""
                />
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="mb-10">
                <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
                  Why visit {destination.name}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {highlights.map((h: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-[var(--radius-lg)] bg-surface"
                    >
                      <span className="text-[22px] leading-none shrink-0 mt-0.5">{h.icon}</span>
                      <p className="text-[14.5px] text-text leading-[1.6]">{h.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <aside className="w-full lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-[90px] space-y-6">
              {/* Quick stats card */}
              <div className="rounded-[var(--radius-xl)] border border-border bg-white p-6">
                <h3 className="text-[15px] font-bold text-dark mb-4 flex items-center gap-2">
                  <span className="text-amber">📍</span> {destination.name} at a Glance
                </h3>
                <div className="space-y-3">
                  {destination.county && (
                    <div className="flex justify-between text-[13.5px]">
                      <span className="text-text2">County</span>
                      <span className="font-semibold text-text">{destination.county}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13.5px]">
                    <span className="text-text2">Country</span>
                    <span className="font-semibold text-text">Kenya 🇰🇪</span>
                  </div>
                  {relatedCards.length > 0 && (
                    <div className="flex justify-between text-[13.5px]">
                      <span className="text-text2">Listings</span>
                      <span className="font-semibold text-text">{relatedCards.length} on Klickenya</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[13.5px]">
                    <span className="text-text2">Currency</span>
                    <span className="font-semibold text-text">KES (Kenyan Shilling)</span>
                  </div>
                  <div className="flex justify-between text-[13.5px]">
                    <span className="text-text2">Language</span>
                    <span className="font-semibold text-text">Swahili, English</span>
                  </div>
                </div>
              </div>

              {/* Ambassador CTA card */}
              <div className="rounded-[var(--radius-xl)] bg-gradient-to-br from-[#6b2d8b] to-[#4a1a6b] p-6 text-white">
                <div className="text-[28px] mb-3">🤝</div>
                <h3 className="text-[16px] font-bold mb-2">
                  Know {destination.name} well?
                </h3>
                <p className="text-[13.5px] text-white/75 leading-[1.6] mb-4">
                  Become a Klickenya Ambassador for {destination.name}. Help travelers discover the best local spots and earn while sharing what you love.
                </p>
                <Link
                  href="/how-it-works"
                  className="inline-block w-full text-center rounded-[var(--radius-md)] bg-white text-[#6b2d8b] text-[13.5px] font-bold py-2.5 hover:bg-white/90 transition-colors"
                >
                  Become an Ambassador
                </Link>
              </div>

              {/* List your space CTA */}
              <div className="rounded-[var(--radius-xl)] border border-amber/25 bg-amber/5 p-6">
                <div className="text-[28px] mb-3">🏠</div>
                <h3 className="text-[15px] font-bold text-dark mb-2">
                  Have a listing in {destination.name}?
                </h3>
                <p className="text-[13.5px] text-text2 leading-[1.6] mb-4">
                  Get discovered by thousands of travelers looking for stays, experiences, and services in {destination.name}.
                </p>
                <Link
                  href="/how-it-works"
                  className="inline-block w-full text-center rounded-[var(--radius-md)] bg-amber text-white text-[13.5px] font-bold py-2.5 hover:bg-amber/90 transition-colors"
                >
                  List Your Space
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Related listings ────────────────── */}
      {relatedCards.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-16">
          <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
            Things to do in {destination.name}
          </h2>
          <ListingGrid listings={relatedCards} columns={4} />
        </section>
      )}

      {/* ── Ambassador Banner ────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-16">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-r from-[#6b2d8b] via-[#5a2378] to-[#4a1a6b] px-8 md:px-14 py-12 md:py-16">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-[-50%] right-[-20%] w-[60%] h-[200%] rounded-full bg-amber/30 blur-[80px]" />
            <div className="absolute bottom-[-30%] left-[-10%] w-[40%] h-[160%] rounded-full bg-white/20 blur-[60px]" />
          </div>
          <div className="relative z-10 max-w-[600px]">
            <span className="inline-block rounded-full bg-white/15 backdrop-blur-[8px] px-3.5 py-1 text-[12px] font-bold text-white/90 mb-5">
              📣 Ambassador Program
            </span>
            <h2 className="font-display text-[clamp(24px,3vw,36px)] font-bold tracking-[-0.03em] text-white leading-[1.12] mb-4">
              Share your love for {destination.name}
            </h2>
            <p className="text-[15px] text-white/70 leading-[1.65] mb-6">
              We are looking for passionate locals and frequent visitors to represent {destination.name} on Klickenya. Help travelers discover hidden gems, earn commissions, and be part of Kenya&apos;s fastest growing travel platform.
            </p>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#6b2d8b] px-7 py-3 text-[14px] font-bold hover:bg-white/90 transition-colors"
            >
              Learn More
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

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
