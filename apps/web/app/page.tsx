import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  Shield,
  Zap,
  HeartHandshake,
  BadgeCheck,
  Star,
  TrendingUp,
  BarChart3,
  Wallet,
} from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import {
  LISTINGS_QUERY,
  DESTINATIONS_QUERY,
  SITE_SETTINGS_QUERY,
} from "@/lib/sanity/queries";
import { imageUrl } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { ListingCard } from "@/components/listings/ListingCard";
import { CategoryNav } from "@/components/listings/CategoryNav";
import { HeroSearch } from "@/components/home/HeroSearch";
import { MarqueeTicker } from "@/components/home/MarqueeTicker";
import { MobileBottomNav } from "@/components/home/MobileBottomNav";
import { EventCard } from "@/components/home/EventCard";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Klickenya — Discover Kenya",
    description:
      "Kenya's all-in-one booking marketplace for stays, experiences, events, rentals, restaurants, and services. Discover the best of Kenya.",
    openGraph: {
      title: "Klickenya — Discover Kenya",
      description:
        "Kenya's all-in-one booking marketplace for stays, experiences, events, rentals, restaurants, and services.",
      siteName: "Klickenya",
      type: "website",
      locale: "en_KE",
    },
  };
}

/* ─── Data fetching ──────────────────────────────── */

interface SanityListing {
  _id: string;
  title: string;
  slug: { current: string };
  type: "stay" | "experience" | "event" | "rental" | "service" | "restaurant";
  city: string;
  price: number;
  priceUnit: string;
  tags?: string[];
  coverPhoto?: { asset?: { url?: string } };
}

interface SanityDestination {
  _id: string;
  name: string;
  slug: { current: string };
  tagline?: string;
  county?: string;
  heroImage?: { asset?: { url?: string } };
}

async function getData() {
  const [listings, destinations, settings] = await Promise.all([
    sanityClient.fetch<SanityListing[]>(LISTINGS_QUERY).catch(() => []),
    sanityClient.fetch<SanityDestination[]>(DESTINATIONS_QUERY).catch(() => []),
    sanityClient.fetch(SITE_SETTINGS_QUERY).catch(() => null),
  ]);

  return { listings, destinations, settings };
}

/* ─── Page ───────────────────────────────────────── */

export default async function HomePage() {
  const { listings, destinations } = await getData();

  const featuredListings = listings.slice(0, 8);

  const featuredDestinations: DestinationDisplay[] =
    destinations.length > 0
      ? destinations.slice(0, 5).map((d, i) => ({
          name: d.name,
          slug: d.slug.current,
          tagline: d.tagline ?? d.county ?? "",
          color: DESTINATION_COLORS[i % DESTINATION_COLORS.length],
          imageUrl: d.heroImage?.asset?.url,
        }))
      : PLACEHOLDER_DESTINATIONS;

  return (
    <>
      <Nav transparent />

      {/* ─── HERO ─────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Photo mosaic background */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[3px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface2 overflow-hidden"
              style={{
                animation: `kenBurns 12s ease-in-out infinite alternate`,
                animationDelay: `${i * 1.8}s`,
              }}
            >
              <div className="w-full h-full bg-gradient-to-br from-surface2 to-border" />
            </div>
          ))}
        </div>

        {/* Dark overlay gradient */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,.52) 0%, rgba(0,0,0,.08) 30%, rgba(0,0,0,.04) 50%, rgba(0,0,0,.58) 85%, rgba(0,0,0,.78) 100%)",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[960px] mx-auto pt-[120px] pb-16">
          {/* Eyebrow badge */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-8 animate-fade-up">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-amber" />
            </span>
            <span className="text-[13px] font-semibold text-white/85 tracking-[0.01em]">
              Discover Kenya
            </span>
          </div>

          {/* H1 */}
          <h1
            className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-5 animate-fade-up"
            style={{
              fontSize: "clamp(44px, 7vw, 88px)",
              animationDelay: "0.1s",
            }}
          >
            Discover the best of
            <br />
            <span className="text-amber">Kenya</span>
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-[480px] leading-[1.65] mb-10 animate-fade-up"
            style={{
              color: "rgba(255,255,255,.62)",
              fontSize: "clamp(16px, 2vw, 19px)",
              animationDelay: "0.2s",
            }}
          >
            Book unique stays, experiences, events, restaurants, and services across all 47
            counties — all in one place.
          </p>

          {/* Search box */}
          <div
            className="w-full animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            <HeroSearch />
          </div>

          {/* Stats row */}
          <div
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mt-12 animate-fade-up"
            style={{ animationDelay: "0.45s" }}
          >
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-[22px] md:text-[26px] font-bold text-white tracking-[-0.02em]">
                  {stat.value}
                </span>
                <span className="text-[12px] text-white/45 font-medium mt-0.5">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CATEGORY NAV ─────────────────────────── */}
      <CategoryNav />

      {/* ─── FEATURED LISTINGS ────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Featured stays &amp; experiences
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              Hand-picked places and activities across Kenya
            </p>
          </div>
          <Link
            href="/stays"
            className="hidden md:flex text-[14px] font-semibold text-amber hover:underline shrink-0"
          >
            View all
          </Link>
        </div>

        {featuredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {featuredListings.map((listing) => (
              <ListingCard
                key={listing._id}
                id={listing._id}
                title={listing.title}
                city={listing.city}
                price={listing.price}
                priceUnit={listing.priceUnit}
                type={listing.type}
                photos={
                  listing.coverPhoto?.asset?.url
                    ? [listing.coverPhoto.asset.url]
                    : []
                }
                href={`/${listing.type}s/${listing.city?.toLowerCase()}/${listing.slug.current}`}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
            {PLACEHOLDER_LISTINGS.map((listing) => (
              <ListingCard key={listing.id} {...listing} />
            ))}
          </div>
        )}
      </section>

      {/* ─── MARQUEE TICKER ───────────────────────── */}
      <MarqueeTicker />

      {/* ─── EVENTS SECTION ───────────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
                Upcoming events
              </h2>
              <p className="text-text2 text-[15px] mt-1.5">
                Live music, food festivals, cultural celebrations and more
              </p>
            </div>
            <Link
              href="/events"
              className="hidden md:flex text-[14px] font-semibold text-amber hover:underline shrink-0"
            >
              View all
            </Link>
          </div>

          <div className="flex gap-5 overflow-x-auto scrollbar-none pb-4 -mx-5 px-5 md:-mx-10 md:px-10">
            {PLACEHOLDER_EVENTS.map((event, i) => (
              <EventCard key={i} {...event} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── DESTINATIONS BENTO GRID ──────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Explore destinations
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              From coast to highlands, discover Kenya&apos;s most loved places
            </p>
          </div>
          <Link
            href="/destinations"
            className="hidden md:flex text-[14px] font-semibold text-amber hover:underline shrink-0"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-[260px_200px] gap-4">
          {featuredDestinations.map((dest, i) => {
            const gridClass =
              i === 0
                ? "md:col-span-2 md:row-span-2"
                : i === 3
                  ? "md:row-span-2"
                  : "";

            return (
              <Link
                key={dest.name}
                href={`/destinations/${dest.slug}`}
                className={`relative rounded-[24px] overflow-hidden group min-h-[200px] ${gridClass}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundColor: dest.color,
                    backgroundImage: dest.imageUrl
                      ? `url(${dest.imageUrl})`
                      : undefined,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-semibold text-[18px] leading-tight">
                    {dest.name}
                  </h3>
                  <p className="text-white/60 text-[13px] mt-1">
                    {dest.tagline}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
            How it works
          </h2>
          <p className="text-text2 text-[15px] mt-2 max-w-[480px] mx-auto">
            Book anything in Kenya in just a few simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 rounded-[32px] border border-border overflow-hidden">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              className={`group p-8 transition-colors duration-300 hover:bg-surface ${
                i < HOW_IT_WORKS.length - 1
                  ? "border-b md:border-b-0 md:border-r border-border"
                  : ""
              }`}
            >
              <span className="inline-flex items-center justify-center size-[56px] rounded-[16px] bg-surface text-text3 text-[22px] font-bold mb-5 transition-colors duration-300 group-hover:bg-purple-dim group-hover:text-purple">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="size-11 rounded-[14px] bg-purple-dim flex items-center justify-center mb-4">
                {step.icon}
              </div>
              <h3 className="text-[16px] font-semibold text-text mb-2">
                {step.title}
              </h3>
              <p className="text-[13.5px] text-text2 leading-[1.65]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────── */}
      <section
        className="py-16 md:py-20"
        style={{
          background: "linear-gradient(135deg, #E8A020 0%, #E89020 100%)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 text-center">
            {STATS_BAR.map((stat) => (
              <div key={stat.label}>
                <p
                  className="font-display font-bold text-white tracking-[-0.03em]"
                  style={{ fontSize: "clamp(34px, 5vw, 50px)" }}
                >
                  {stat.value}
                </p>
                <p className="text-[14px] text-white/75 font-medium mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOST SECTION ─────────────────────────── */}
      <section className="bg-[#111008] py-16 md:py-24 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber/10 border border-amber/20 mb-6">
                <span className="size-1.5 rounded-full bg-amber" />
                <span className="text-[12px] font-semibold text-amber tracking-[0.02em]">
                  For hosts
                </span>
              </div>

              <h2 className="font-display text-[clamp(28px,4vw,44px)] font-bold text-white tracking-[-0.03em] leading-[1.1] mb-5">
                Earn more as a{" "}
                <span className="text-amber">host</span>
              </h2>

              <p className="text-white/45 text-[16px] leading-[1.7] max-w-[440px] mb-8">
                List your stay, experience, or service on Klickenya and reach
                thousands of travellers exploring Kenya. No hidden fees, instant
                payouts, and a dedicated support team.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/list"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-dark font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  Start hosting
                </Link>
                <Link
                  href="/hosting"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-white/20 text-white/80 font-semibold text-[15px] hover:bg-white/5 hover:border-white/35 transition-all duration-200"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Right — illustrative dashboard cards */}
            <div className="flex flex-col gap-4">
              {/* Earnings card */}
              <div className="bg-white/[0.06] backdrop-blur-[12px] border border-white/[0.08] rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-[12px] bg-amber/15 flex items-center justify-center">
                      <Wallet className="size-5 text-amber" />
                    </div>
                    <div>
                      <p className="text-[13px] text-white/45">Total earnings</p>
                      <p className="text-[24px] font-bold text-white tracking-[-0.02em]">
                        KSh 284,500
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-green/15 text-green text-[12px] font-semibold">
                    +24%
                  </span>
                </div>
                {/* Mini bar chart placeholder */}
                <div className="flex items-end gap-1.5 h-[48px]">
                  {[35, 52, 44, 68, 55, 72, 80, 65, 78, 90, 85, 95].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-[3px] bg-amber/25"
                        style={{ height: `${h}%` }}
                      />
                    )
                  )}
                </div>
              </div>

              {/* Bookings card */}
              <div className="bg-white/[0.06] backdrop-blur-[12px] border border-white/[0.08] rounded-[24px] p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] text-white/45">This month</p>
                  <span className="px-2.5 py-1 rounded-full bg-green/15 text-green text-[12px] font-semibold">
                    +12%
                  </span>
                </div>
                <p className="text-[20px] font-bold text-white tracking-[-0.02em] mb-3">
                  KSh 48,200
                </p>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber to-amber2"
                    style={{ width: "72%" }}
                  />
                </div>
                <p className="text-[12px] text-white/30 mt-2">
                  72% of monthly goal
                </p>
              </div>

              {/* Occupancy card */}
              <div className="bg-white/[0.06] backdrop-blur-[12px] border border-white/[0.08] rounded-[24px] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-white/45">Occupancy rate</p>
                    <p className="text-[20px] font-bold text-white tracking-[-0.02em]">
                      89%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-green/15 text-green text-[12px] font-semibold">
                      +8%
                    </span>
                    <TrendingUp className="size-5 text-green" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              What our guests say
            </h2>
            <p className="text-text2 text-[15px] mt-2">
              Real stories from travellers across Kenya
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-[32px] p-7 border border-border"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star
                      key={j}
                      className="size-4 fill-amber text-amber"
                    />
                  ))}
                </div>
                {/* Quote */}
                <p className="text-[14.5px] text-text leading-[1.65] mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${t.avatarFrom}, ${t.avatarTo})`,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-text">
                      {t.name}
                    </p>
                    <p className="text-[12.5px] text-text3">{t.meta}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────── */}
      <Footer />

      {/* ─── MOBILE BOTTOM NAV ────────────────────── */}
      <MobileBottomNav />

      {/* Ken Burns animation keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes kenBurns {
              from { transform: scale(1.07); }
              to { transform: scale(1); }
            }
          `,
        }}
      />
    </>
  );
}

/* ─── Types & static data ────────────────────────── */

interface DestinationDisplay {
  name: string;
  slug: string;
  tagline: string;
  color: string;
  imageUrl?: string;
}

const DESTINATION_COLORS = [
  "#6B4E3D",
  "#2D6B7A",
  "#3D5A3E",
  "#8B6B4E",
  "#4A5E6B",
];

const HERO_STATS = [
  { value: "2,500+", label: "Listings" },
  { value: "47", label: "Counties" },
  { value: "200+", label: "Hosts" },
  { value: "50K+", label: "Guests served" },
];

const STATS_BAR = [
  { value: "2,500+", label: "Listings" },
  { value: "47", label: "Counties covered" },
  { value: "200+", label: "Verified hosts" },
  { value: "50K+", label: "Guests served" },
];

const HOW_IT_WORKS = [
  {
    title: "Search & discover",
    description:
      "Browse thousands of stays, experiences, and services across all 47 Kenyan counties.",
    icon: <Search className="size-5 text-purple" />,
  },
  {
    title: "Book instantly",
    description:
      "Secure your booking with instant confirmation. Pay securely via M-Pesa or card.",
    icon: <Zap className="size-5 text-purple" />,
  },
  {
    title: "Verified hosts",
    description:
      "Every host is vetted. Read real reviews and book with confidence.",
    icon: <Shield className="size-5 text-purple" />,
  },
  {
    title: "Enjoy & review",
    description:
      "Have an amazing experience and share your story to help other travellers.",
    icon: <HeartHandshake className="size-5 text-purple" />,
  },
];

const PLACEHOLDER_LISTINGS = [
  {
    id: "p1",
    title: "Serene lakeside cabin in Naivasha",
    city: "Naivasha",
    price: 8500,
    priceUnit: "night",
    type: "stay" as const,
    photos: [],
    href: "/stays/naivasha",
    badge: "New",
    rating: 4.9,
    reviewCount: 24,
  },
  {
    id: "p2",
    title: "Sunrise safari experience in Mara",
    city: "Maasai Mara",
    price: 12000,
    priceUnit: "person",
    type: "experience" as const,
    photos: [],
    href: "/experiences/maasai-mara",
    rating: 4.8,
    reviewCount: 56,
  },
  {
    id: "p3",
    title: "Beachfront villa with ocean views",
    city: "Diani Beach",
    price: 15000,
    priceUnit: "night",
    type: "stay" as const,
    photos: [],
    href: "/stays/diani-beach",
    badge: "Superhost",
    rating: 4.95,
    reviewCount: 112,
  },
  {
    id: "p4",
    title: "Cultural walking tour in Lamu",
    city: "Lamu",
    price: 3500,
    priceUnit: "person",
    type: "experience" as const,
    photos: [],
    href: "/experiences/lamu",
    rating: 4.7,
    reviewCount: 38,
  },
  {
    id: "p5",
    title: "Mountain retreat near Mt Kenya",
    city: "Nanyuki",
    price: 11000,
    priceUnit: "night",
    type: "stay" as const,
    photos: [],
    href: "/stays/nanyuki",
    rating: 4.85,
    reviewCount: 67,
  },
  {
    id: "p6",
    title: "City loft in Westlands, Nairobi",
    city: "Nairobi",
    price: 6500,
    priceUnit: "night",
    type: "stay" as const,
    photos: [],
    href: "/stays/nairobi",
    rating: 4.6,
    reviewCount: 89,
  },
  {
    id: "p7",
    title: "Deep sea fishing in Watamu",
    city: "Watamu",
    price: 9000,
    priceUnit: "person",
    type: "experience" as const,
    photos: [],
    href: "/experiences/watamu",
    badge: "New",
    rating: 4.75,
    reviewCount: 15,
  },
  {
    id: "p8",
    title: "Eco-lodge in Samburu conservancy",
    city: "Samburu",
    price: 14500,
    priceUnit: "night",
    type: "stay" as const,
    photos: [],
    href: "/stays/samburu",
    rating: 4.9,
    reviewCount: 43,
  },
];

const PLACEHOLDER_DESTINATIONS = [
  {
    name: "Maasai Mara",
    slug: "maasai-mara",
    tagline: "The world's greatest wildlife reserve",
    color: "#6B4E3D",
  },
  {
    name: "Diani Beach",
    slug: "diani-beach",
    tagline: "White sands & turquoise waters",
    color: "#2D6B7A",
  },
  {
    name: "Nairobi",
    slug: "nairobi",
    tagline: "The green city in the sun",
    color: "#3D5A3E",
  },
  {
    name: "Lamu Island",
    slug: "lamu-island",
    tagline: "Swahili heritage & tranquility",
    color: "#8B6B4E",
  },
  {
    name: "Mount Kenya",
    slug: "mount-kenya",
    tagline: "Africa's second highest peak",
    color: "#4A5E6B",
  },
];

const PLACEHOLDER_EVENTS = [
  {
    title: "Nairobi Night Market — Food & Music Festival",
    date: "2026-04-12",
    month: "APR",
    day: "12",
    location: "Nairobi, Karen",
    time: "Sat, 5:00 PM — 11:00 PM",
    price: "KSh 1,500",
    attending: 128,
    hostInitials: "NM",
    hostName: "Nairobi Markets",
    href: "/events/nairobi",
    imageColor: "bg-[#3D5A3E]",
  },
  {
    title: "Diani Beach Yoga & Wellness Retreat",
    date: "2026-04-18",
    month: "APR",
    day: "18",
    location: "Diani Beach",
    time: "Fri — Sun, All day",
    price: "KSh 8,000",
    attending: 42,
    hostInitials: "DY",
    hostName: "Diani Yoga Co",
    href: "/events/diani-beach",
    imageColor: "bg-[#2D6B7A]",
  },
  {
    title: "Lamu Cultural Festival 2026",
    date: "2026-05-02",
    month: "MAY",
    day: "02",
    location: "Lamu Old Town",
    time: "Fri — Mon, 10:00 AM",
    price: "Free",
    attending: 340,
    hostInitials: "LC",
    hostName: "Lamu County",
    href: "/events/lamu",
    imageColor: "bg-[#8B6B4E]",
  },
  {
    title: "Maasai Mara Balloon Safari Morning",
    date: "2026-05-10",
    month: "MAY",
    day: "10",
    location: "Maasai Mara",
    time: "Sat, 5:30 AM — 9:00 AM",
    price: "KSh 25,000",
    attending: 16,
    hostInitials: "MB",
    hostName: "Mara Balloons",
    href: "/events/maasai-mara",
    imageColor: "bg-[#6B4E3D]",
  },
  {
    title: "Nairobi Tech & Innovation Summit",
    date: "2026-05-22",
    month: "MAY",
    day: "22",
    location: "Nairobi, Westlands",
    time: "Thu — Fri, 9:00 AM",
    price: "KSh 3,500",
    attending: 210,
    hostInitials: "NT",
    hostName: "Nairobi Tech Hub",
    href: "/events/nairobi",
    imageColor: "bg-[#4A5E6B]",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Klickenya made planning our family safari so easy. We booked a stay in Mara and a cultural tour in Lamu — all from one app. The hosts were incredible!",
    name: "Amina Osei",
    meta: "Stayed in Maasai Mara",
    initials: "AO",
    avatarFrom: "#E8A020",
    avatarTo: "#E89020",
  },
  {
    quote:
      "As a host, the platform has been a game-changer. I listed my Diani villa and started getting bookings within the first week. Payouts are fast and reliable.",
    name: "James Mwangi",
    meta: "Host in Diani Beach",
    initials: "JM",
    avatarFrom: "#6B2D8B",
    avatarTo: "#8B4DAB",
  },
  {
    quote:
      "The events section is brilliant. Found an amazing food festival in Nairobi and a yoga retreat in Watamu. Kenya has so much to offer beyond safaris.",
    name: "Sarah Njeri",
    meta: "Explored 5 counties",
    initials: "SN",
    avatarFrom: "#0D7377",
    avatarTo: "#16A34A",
  },
];
