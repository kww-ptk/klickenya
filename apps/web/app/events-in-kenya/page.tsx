import { type Metadata } from "next";
import Link from "next/link";
import { Calendar, Search, MapPin } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import {
  UPCOMING_EVENTS_QUERY,
  THIS_WEEKEND_EVENTS_QUERY,
  EVENTS_BY_CITY_QUERY,
  EVENT_SUBCATEGORY_COUNTS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { ListingCard } from "@/components/listings/ListingCard";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import { WeekendEventCard } from "@/components/events/WeekendEventCard";
import { CityEventCard, CITY_GRADIENTS } from "@/components/events/CityEventCard";
import { SubcategoryCard } from "@/components/events/SubcategoryCard";
import { OrganizerCTA } from "@/components/events/OrganizerCTA";
import { AddEventButton } from "@/components/events/AddEventButton";

export const revalidate = 3600;

/* ── Metadata ──────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Events in Kenya | Klickenya",
  description:
    "Parties, fitness, workshops — find things to do near you. Discover upcoming events across Watamu, Kilifi, Diani, Nairobi, Lamu and beyond.",
  alternates: { canonical: "https://klickenya.com/events-in-kenya" },
  openGraph: {
    title: "Events in Kenya | Klickenya",
    description:
      "Parties, fitness, workshops — find things to do near you.",
    url: "https://klickenya.com/events-in-kenya",
    type: "website",
  },
};

/* ── Types ─────────────────────────────────────────── */

interface SanityEventCard {
  _id: string;
  title: string;
  slug: { current: string } | string;
  city: string;
  subcategory: string | null;
  price: number | null;
  priceUnit: string | null;
  type: string;
  isVerified: boolean;
  hostName: string | null;
  hostRef?: { name?: string; slug?: string; photo?: { asset?: { url?: string } } };
  coverPhoto?: { asset?: { url?: string } };
  coverPhotoUrl?: string;
  eventDate: string | null;
  eventEndDate: string | null;
  venue: string | null;
  isFree: boolean;
  priceFrom: number | null;
  avgRating?: number;
  reviewCount?: number;
  tags?: string[];
}

interface CityData {
  watamu: number;
  kilifi: number;
  diani: number;
  nairobi: number;
  lamu: number;
  watamuImage: string | null;
  kilifiImage: string | null;
  dianiImage: string | null;
  nairobiImage: string | null;
  lamuImage: string | null;
}

/* ── Subcategory config ────────────────────────────── */

const EVENT_SUBCATEGORIES = [
  { value: "parties", label: "Parties", emoji: "\uD83C\uDF89" },
  { value: "festival", label: "Festivals", emoji: "\uD83C\uDFAA" },
  { value: "art_culture", label: "Art & Culture", emoji: "\uD83C\uDFA8" },
  { value: "wellness_sport", label: "Wellness & Sport", emoji: "\uD83C\uDFC3" },
  { value: "networking", label: "Networking", emoji: "\uD83D\uDCBC" },
  { value: "kids", label: "Kids", emoji: "\uD83D\uDC66" },
  { value: "other", label: "Other", emoji: "\u2728" },
];

/* ── Helpers ───────────────────────────────────────── */

function toListingCard(e: SanityEventCard): ListingCardProps {
  const slug = typeof e.slug === "string" ? e.slug : e.slug?.current ?? "";
  const citySlug = (e.city ?? "").toLowerCase().replace(/\s+/g, "-");
  const photoUrl = e.coverPhoto?.asset?.url
    ? e.coverPhoto.asset.url + "?w=800&h=600&fit=crop&auto=format&q=80"
    : e.coverPhotoUrl ?? "";

  return {
    id: e._id,
    title: e.title ?? "Untitled",
    city: e.city ?? "",
    price: e.isFree ? null : (e.priceFrom ?? e.price ?? null),
    priceUnit: e.priceUnit ?? "ticket",
    type: "event",
    subcategory: e.subcategory ?? undefined,
    isVerified: e.isVerified ?? false,
    hostName: e.hostRef?.name ?? e.hostName ?? undefined,
    hostPhotoUrl: e.hostRef?.photo?.asset?.url ?? undefined,
    hostSlug: e.hostRef?.slug ?? undefined,
    rating: e.avgRating ?? undefined,
    reviewCount: e.reviewCount ?? undefined,
    photos: photoUrl ? [photoUrl] : [],
    href: `/events/${citySlug}/${slug}`,
  };
}

/* ── Page ──────────────────────────────────────────── */

export default async function EventsInKenyaPage() {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [weekendResult, cityResult, upcomingResult, subcatResult] = await Promise.all([
    sanityFetch({
      query: THIS_WEEKEND_EVENTS_QUERY,
      params: {
        weekStart: now.toISOString(),
        weekEnd: weekEnd.toISOString(),
      },
    }).catch(() => ({ data: [] })),
    sanityFetch({ query: EVENTS_BY_CITY_QUERY }).catch(() => ({ data: null })),
    sanityFetch({
      query: UPCOMING_EVENTS_QUERY,
      params: { limit: 12 },
    }).catch(() => ({ data: [] })),
    sanityFetch({ query: EVENT_SUBCATEGORY_COUNTS_QUERY }).catch(() => ({ data: [] })),
  ]);

  const weekendEvents = (weekendResult.data ?? []) as SanityEventCard[];
  const cityData = (cityResult.data ?? {}) as CityData;
  const upcomingEvents = (upcomingResult.data ?? []) as SanityEventCard[];
  const subcatRaw = (subcatResult.data ?? []) as { subcategory: string | null }[];

  // Count events per subcategory
  const subcatCounts = new Map<string, number>();
  for (const item of subcatRaw) {
    if (item.subcategory) {
      subcatCounts.set(item.subcategory, (subcatCounts.get(item.subcategory) ?? 0) + 1);
    }
  }

  // City cards data
  const cities = [
    { city: "Watamu", citySlug: "watamu", count: cityData.watamu ?? 0, imageUrl: cityData.watamuImage, gradient: CITY_GRADIENTS.watamu },
    { city: "Kilifi", citySlug: "kilifi", count: cityData.kilifi ?? 0, imageUrl: cityData.kilifiImage, gradient: CITY_GRADIENTS.kilifi },
    { city: "Diani", citySlug: "diani", count: cityData.diani ?? 0, imageUrl: cityData.dianiImage, gradient: CITY_GRADIENTS.diani },
    { city: "Nairobi", citySlug: "nairobi", count: cityData.nairobi ?? 0, imageUrl: cityData.nairobiImage, gradient: CITY_GRADIENTS.nairobi },
    { city: "Lamu", citySlug: "lamu", count: cityData.lamu ?? 0, imageUrl: cityData.lamuImage, gradient: CITY_GRADIENTS.lamu },
  ];

  const upcomingCards = upcomingEvents.map(toListingCard);

  return (
    <>
      <Nav transparent />

      {/* ── SECTION 1: Hero ───────────────────────────── */}
      <section className="relative min-h-[520px] md:min-h-[600px] flex items-center justify-center overflow-hidden bg-zinc-950">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(232,160,32,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(232,160,32,0.08) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[800px] mx-auto pt-[140px] pb-16">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-8">
            <Calendar className="size-3.5 text-amber-500" />
            <span className="text-[13px] font-semibold text-white/85 tracking-[0.01em]">
              Events & happenings
            </span>
          </div>

          <h1
            className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-5"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            Events in{" "}
            <span className="text-amber-500">Kenya</span>
          </h1>

          <p
            className="max-w-[520px] leading-[1.65] mb-10"
            style={{ color: "rgba(255,255,255,.55)", fontSize: "clamp(16px, 2vw, 19px)" }}
          >
            Parties, Fitness, Workshops — find things to do near you
          </p>

          {/* Search bar → links to /search?type=event */}
          <Link
            href="/search?type=event"
            className="w-full max-w-[560px] flex items-center bg-white/[0.08] backdrop-blur-[12px] border border-white/[0.12] rounded-full px-5 py-3.5 gap-3 hover:bg-white/[0.12] transition-colors"
          >
            <MapPin className="size-5 text-white/40 shrink-0" />
            <span className="text-[15px] text-white/35 flex-1 text-left">
              Search events by location...
            </span>
            <span className="shrink-0 flex items-center justify-center size-10 rounded-full bg-amber-500 text-zinc-950">
              <Search className="size-4" />
            </span>
          </Link>

          <div className="mt-6">
            <AddEventButton />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Happening this weekend ─────────── */}
      {weekendEvents.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
          <div className="mb-8">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
              Don&apos;t miss out
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Happening this weekend
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {weekendEvents.map((e) => {
              const slug = typeof e.slug === "string" ? e.slug : e.slug?.current ?? "";
              return (
                <WeekendEventCard
                  key={e._id}
                  title={e.title}
                  slug={slug}
                  city={e.city ?? ""}
                  subcategory={e.subcategory}
                  coverPhotoUrl={e.coverPhotoUrl ?? e.coverPhoto?.asset?.url ?? null}
                  eventDate={e.eventDate ?? ""}
                  isFree={e.isFree ?? false}
                  priceFrom={e.priceFrom ?? e.price ?? null}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── SECTION 3: Location cards ─────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="mb-8">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
              Browse by location
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Events near you
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cities.map((c) => (
              <CityEventCard key={c.citySlug} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Browse by type ─────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="mb-8">
          <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
            Browse by type
          </span>
          <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
            What are you looking for?
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EVENT_SUBCATEGORIES.map((sub) => (
            <SubcategoryCard
              key={sub.value}
              subcategory={sub.value}
              label={sub.label}
              emoji={sub.emoji}
              count={subcatCounts.get(sub.value) ?? 0}
            />
          ))}
        </div>
      </section>

      {/* ── SECTION 5: All upcoming events ────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="mb-8">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
              Upcoming
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              All upcoming events
            </h2>
          </div>

          {upcomingCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {upcomingCards.map((card) => (
                <ListingCard key={card.id} {...card} />
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-border bg-white p-12 text-center">
              <Calendar className="size-10 text-text3 mx-auto mb-3" />
              <p className="text-[16px] font-semibold text-text mb-1">
                No upcoming events
              </p>
              <p className="text-[13px] text-text2 max-w-[360px] mx-auto mb-6">
                Be the first to list your event on Klickenya and reach thousands
                of people across Kenya.
              </p>
              <AddEventButton label="Add the first event" />
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 6: Organizer CTA ──────────────────── */}
      <OrganizerCTA />

      <Footer />
    </>
  );
}
