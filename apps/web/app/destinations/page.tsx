import type { Metadata } from "next";
import Link from "next/link";
import { DestinationsHeroGlow } from "@/components/destinations/DestinationsHeroGlow";
import { sanityFetch } from "@/lib/sanity/client";
import {
  ALL_DESTINATIONS_QUERY,
  HOMEPAGE_DESTINATIONS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { DestinationBentoGrid } from "@/components/destinations/DestinationBentoGrid";
import type { DestinationDisplay } from "@/components/destinations/DestinationBentoGrid";

export const revalidate = 3600;

/* ── Metadata ──────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Destinations in Kenya | Klickenya",
  description:
    "From the stunning Coast to the wild Mara, discover the places that make Kenya unforgettable. Explore stays, experiences, and hidden gems across all of Kenya's top destinations.",
  alternates: { canonical: "https://klickenya.com/destinations" },
  openGraph: {
    title: "Destinations in Kenya | Klickenya",
    description:
      "From the stunning Coast to the wild Mara, discover the places that make Kenya unforgettable.",
    url: "https://klickenya.com/destinations",
    type: "website",
  },
};

/* ── Static data ───────────────────────────────────── */

const PLACEHOLDER_DESTINATIONS = [
  {
    name: "Watamu",
    slug: "watamu",
    tagline: "Kenya's most beautiful beach town",
  },
  {
    name: "Kilifi",
    slug: "kilifi",
    tagline: "Kenya's best-kept secret",
  },
  {
    name: "Diani Beach",
    slug: "diani",
    tagline: "The perfect white sand escape",
  },
  {
    name: "Nairobi",
    slug: "nairobi",
    tagline: "The city that never stops",
  },
  {
    name: "Lamu",
    slug: "lamu",
    tagline: "Step back in time",
  },
];

const DESTINATION_COLORS = [
  "#6B4E3D",
  "#2D6B7A",
  "#3D5A3E",
  "#8B6B4E",
  "#4A5E6B",
  "#5E3D6B",
  "#3D6B5A",
  "#6B5A3D",
];

const REGIONS = [
  {
    emoji: "\uD83C\uDFD6\uFE0F",
    name: "Coast",
    destinations: [
      { name: "Watamu", slug: "watamu" },
      { name: "Kilifi", slug: "kilifi" },
      { name: "Diani", slug: "diani" },
      { name: "Malindi", slug: "malindi" },
      { name: "Lamu", slug: "lamu" },
      { name: "Mombasa", slug: "mombasa" },
      { name: "Nyali", slug: "nyali" },
      { name: "Vipingo", slug: "vipingo" },
    ],
  },
  {
    emoji: "\uD83E\uDD81",
    name: "Safari & Wildlife",
    destinations: [
      { name: "Maasai Mara", slug: "maasai-mara" },
      { name: "Amboseli", slug: "amboseli" },
      { name: "Tsavo", slug: "tsavo" },
      { name: "Samburu", slug: "samburu" },
      { name: "Lake Nakuru", slug: "lake-nakuru" },
    ],
  },
  {
    emoji: "\uD83C\uDFD9\uFE0F",
    name: "City & Urban",
    destinations: [
      { name: "Nairobi", slug: "nairobi" },
      { name: "Kisumu", slug: "kisumu" },
      { name: "Nanyuki", slug: "nanyuki" },
      { name: "Eldoret", slug: "eldoret" },
    ],
  },
  {
    emoji: "\uD83C\uDFD4\uFE0F",
    name: "Mountains & Highlands",
    destinations: [
      { name: "Mount Kenya", slug: "mount-kenya" },
      { name: "Aberdares", slug: "aberdares" },
      { name: "Laikipia", slug: "laikipia" },
    ],
  },
];

/* ── Page ──────────────────────────────────────────── */

export default async function DestinationsPage() {
  const [homepageDestResult, allDestResult] = await Promise.all([
    sanityFetch({ query: HOMEPAGE_DESTINATIONS_QUERY }).catch(() => ({ data: [] })),
    sanityFetch({ query: ALL_DESTINATIONS_QUERY }).catch(() => ({ data: [] })),
  ]);

  const homepageDestinations = (homepageDestResult.data ?? []) as any[];
  const allDestinations = (allDestResult.data ?? []) as any[];

  const bentoDestinations: DestinationDisplay[] = homepageDestinations.map((d: any) => ({
    name: d.name,
    slug: d.slug?.current ?? d.slug ?? "",
    tagline: d.tagline ?? "",
    color: "",
    imageUrl: d.heroImage?.asset?.url,
  }));

  // For the all-destinations grid, use Sanity data if available, otherwise placeholders
  const gridDestinations = allDestinations.length > 0
    ? allDestinations.map((d: any, i: number) => ({
        name: d.name,
        slug: d.slug?.current ?? d.slug ?? "",
        tagline: d.tagline ?? "",
        coverUrl: d.coverImage ? urlForImage(d.coverImage).width(800).url() : "",
        color: DESTINATION_COLORS[i % DESTINATION_COLORS.length],
      }))
    : PLACEHOLDER_DESTINATIONS.map((d, i) => ({
        name: d.name,
        slug: d.slug,
        tagline: d.tagline,
        coverUrl: "",
        color: DESTINATION_COLORS[i % DESTINATION_COLORS.length],
      }));

  return (
    <>
      <Nav transparent />

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28" style={{ background: "linear-gradient(180deg, #16130C 0%, #1a1610 40%, #1f1a12 70%, #16130C 100%)" }}>
        {/* Static ambient glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] opacity-15"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 30%, #E8A020 0%, transparent 70%)",
          }}
        />
        {/* Mouse-tracking amber glow */}
        <DestinationsHeroGlow />

        <div className="relative z-10 max-w-[960px] mx-auto px-5 md:px-10 text-center">
          <h1
            className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-6"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            Explore Kenya&apos;s best{" "}
            <span className="text-[#E8A020]">destinations</span>
          </h1>

          <p
            className="max-w-[600px] mx-auto leading-[1.7] mb-10"
            style={{
              color: "rgba(255,255,255,.55)",
              fontSize: "clamp(16px, 2vw, 19px)",
            }}
          >
            From the stunning Coast to the wild Mara, discover the places that
            make Kenya unforgettable.
          </p>
        </div>
      </section>

      {/* ── Featured Destinations (Bento Grid) ─────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Featured destinations
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              The most popular places to explore in Kenya
            </p>
          </div>
        </div>

        <DestinationBentoGrid destinations={bentoDestinations} />
      </section>

      {/* ── All Destinations Grid ──────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="mb-8">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              All destinations
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              Browse every destination on Klickenya
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {gridDestinations.map((dest) => (
              <Link
                key={dest.slug}
                href={`/destinations/${dest.slug}`}
                className="group relative rounded-[24px] overflow-hidden min-h-[220px] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundColor: dest.color,
                    backgroundImage: dest.coverUrl
                      ? `url(${dest.coverUrl})`
                      : undefined,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-white font-semibold text-[20px] leading-tight mb-1">
                    {dest.name}
                  </h3>
                  {dest.tagline && (
                    <p className="text-white/60 text-[14px] mb-3 line-clamp-2">
                      {dest.tagline}
                    </p>
                  )}
                  <span className="inline-flex items-center text-[13px] font-semibold text-amber group-hover:underline">
                    Explore &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Region Categories ──────────────────────── */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Explore by region
            </h2>
            <p className="text-text2 text-[15px] mt-2">
              Kenya&apos;s diverse landscapes, grouped by region
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REGIONS.map((region) => (
              <div
                key={region.name}
                className="rounded-[24px] border border-border p-7 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[28px]">{region.emoji}</span>
                  <h3 className="text-[18px] font-semibold text-text">
                    {region.name}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {region.destinations.map((dest) => (
                    <Link
                      key={dest.slug}
                      href={`/destinations/${dest.slug}`}
                      className="inline-flex px-3 py-1.5 rounded-full bg-surface text-[13px] font-medium text-text2 hover:bg-amber/10 hover:text-amber transition-colors"
                    >
                      {dest.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ambassador CTA ─────────────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[720px] mx-auto px-5 md:px-10 text-center">
          <div className="rounded-[32px] border border-amber/20 bg-gradient-to-br from-amber/5 to-amber/10 p-10 md:p-14">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em] mb-4">
              Become a Klickenya Ambassador
            </h2>
            <p className="text-text2 text-[15px] leading-[1.65] mb-8 max-w-[480px] mx-auto">
              Are you a local guide, content creator, or influencer? Help us
              showcase Kenya&apos;s best destinations.
            </p>
            <Link
              href="/how-it-works#ambassador"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-amber text-dark font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Learn more &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
