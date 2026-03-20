import { type Metadata } from "next";
import Link from "next/link";
import { Search, MapPin, Calendar, ArrowRight } from "lucide-react";
import { sanityFetch } from "@/lib/sanity/client";
import { EVENTS_QUERY } from "@/lib/sanity/queries";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { EventCard } from "@/components/home/EventCard";

export const revalidate = 3600;

/* ── Metadata ──────────────────────────────────────── */

export const metadata: Metadata = {
  title: "Events in Kenya | Klickenya",
  description:
    "From music festivals to cultural celebrations, discover the best events happening across Kenya. Browse upcoming events in Nairobi, Mombasa, Diani, Lamu and beyond.",
  alternates: { canonical: "https://klickenya.com/event" },
  openGraph: {
    title: "Events in Kenya | Klickenya",
    description:
      "From music festivals to cultural celebrations, discover the best events happening across Kenya.",
    url: "https://klickenya.com/event",
    type: "website",
  },
};

/* ── Placeholder events (fallback) ─────────────────── */

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
  {
    title: "Mombasa Swahili Food Festival",
    date: "2026-06-07",
    month: "JUN",
    day: "07",
    location: "Mombasa, Old Town",
    time: "Sat, 11:00 AM — 9:00 PM",
    price: "KSh 2,000",
    attending: 185,
    hostInitials: "SF",
    hostName: "Swahili Foodies",
    href: "/events/mombasa",
    imageColor: "bg-[#8B4E6B]",
  },
  {
    title: "Kilifi New Year Music Festival",
    date: "2026-06-14",
    month: "JUN",
    day: "14",
    location: "Kilifi Creek",
    time: "Fri — Sun, 2:00 PM",
    price: "KSh 5,500",
    attending: 420,
    hostInitials: "KF",
    hostName: "Kilifi Festival",
    href: "/events/kilifi",
    imageColor: "bg-[#2D7A6B]",
  },
  {
    title: "Nanyuki Marathon & Fun Run",
    date: "2026-06-21",
    month: "JUN",
    day: "21",
    location: "Nanyuki",
    time: "Sat, 6:00 AM — 12:00 PM",
    price: "KSh 1,000",
    attending: 310,
    hostInitials: "NR",
    hostName: "Nanyuki Runners",
    href: "/events/nanyuki",
    imageColor: "bg-[#5A6B3D]",
  },
];

/* ── Event categories ──────────────────────────────── */

const EVENT_CATEGORIES = [
  {
    emoji: "\uD83C\uDFB5",
    title: "Music & Festivals",
    description:
      "Live concerts, DJ sets, and multi-day music festivals across the country.",
  },
  {
    emoji: "\uD83C\uDFAD",
    title: "Cultural Events",
    description:
      "Traditional ceremonies, heritage celebrations, and art exhibitions.",
  },
  {
    emoji: "\uD83C\uDF7D\uFE0F",
    title: "Food & Drink",
    description:
      "Food festivals, wine tastings, cooking classes, and street food tours.",
  },
  {
    emoji: "\u26BD",
    title: "Sports & Adventure",
    description:
      "Marathons, outdoor adventures, sporting events, and fitness challenges.",
  },
  {
    emoji: "\uD83C\uDF03",
    title: "Nightlife",
    description:
      "Club nights, rooftop parties, live entertainment, and late-night experiences.",
  },
  {
    emoji: "\uD83C\uDFA8",
    title: "Workshops & Classes",
    description:
      "Creative workshops, skill-building classes, and hands-on learning experiences.",
  },
];

/* ── Mapper ────────────────────────────────────────── */

import { mapSanityEventToCard } from "@/lib/mappers/eventMapper";

/* ── Page ──────────────────────────────────────────── */

export default async function EventsPage() {
  const eventsResult = await sanityFetch({ query: EVENTS_QUERY }).catch(() => ({
    data: [],
  }));

  const sanityEvents = ((eventsResult.data ?? []) as unknown[]).map(
    mapSanityEventToCard
  );

  const events = sanityEvents.length > 0 ? sanityEvents : PLACEHOLDER_EVENTS;

  return (
    <>
      <Nav transparent />

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative min-h-[520px] md:min-h-[600px] flex items-center justify-center overflow-hidden bg-zinc-950">
        {/* Gradient accents */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(232,160,32,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 20%, rgba(232,160,32,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[800px] mx-auto pt-[140px] pb-16">
          {/* Eyebrow */}
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-[16px] border border-white/15 mb-8">
            <Calendar className="size-3.5 text-amber-500" />
            <span className="text-[13px] font-semibold text-white/85 tracking-[0.01em]">
              Events & happenings
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-5"
            style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
          >
            Events across{" "}
            <span className="text-amber-500">Kenya</span>
          </h1>

          {/* Subtitle */}
          <p
            className="max-w-[520px] leading-[1.65] mb-10"
            style={{
              color: "rgba(255,255,255,.55)",
              fontSize: "clamp(16px, 2vw, 19px)",
            }}
          >
            From music festivals to cultural celebrations, discover the best
            events happening across Kenya.
          </p>

          {/* Search / filter bar placeholder */}
          <div className="w-full max-w-[560px] relative">
            <div className="flex items-center bg-white/[0.08] backdrop-blur-[12px] border border-white/[0.12] rounded-full px-5 py-3.5 gap-3">
              <MapPin className="size-5 text-white/40 shrink-0" />
              <input
                type="text"
                placeholder="Search events by location..."
                className="bg-transparent text-[15px] text-white placeholder:text-white/35 outline-none w-full"
                readOnly
              />
              <button className="shrink-0 flex items-center justify-center size-10 rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors">
                <Search className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Events Grid ────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
              {sanityEvents.length > 0
                ? "Live from Sanity"
                : "Coming soon"}
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Upcoming events
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              Live music, food festivals, cultural celebrations and more
            </p>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto scrollbar-none pb-4 -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 [&>div]:shrink-0 [&>div]:w-[280px] md:[&>div]:w-auto md:[&>div]:shrink">
          {events.map((event, i) => (
            <div key={i}>
              <EventCard {...event} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Event Categories ────────────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="mb-10">
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-amber-600 mb-1.5 block">
              Browse by type
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Event categories
            </h2>
            <p className="text-text2 text-[15px] mt-1.5">
              Find exactly the kind of event you&apos;re looking for
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {EVENT_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="group bg-white rounded-[24px] border border-border p-6 hover:shadow-md hover:border-amber-200 transition-all duration-300 cursor-pointer"
              >
                <span className="text-[32px] mb-4 block">{cat.emoji}</span>
                <h3 className="text-[16px] font-semibold text-text mb-2 group-hover:text-amber-600 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-[13.5px] text-text2 leading-[1.65]">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────── */}
      <section className="bg-zinc-950 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="relative rounded-[32px] overflow-hidden p-10 md:p-16 text-center"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 50% 100%, rgba(232,160,32,0.15) 0%, transparent 60%)",
            }}
          >
            {/* Border effect */}
            <div className="absolute inset-0 rounded-[32px] border border-white/[0.08]" />

            <div className="relative z-10">
              <h2
                className="font-display font-bold text-white tracking-[-0.03em] leading-[1.1] mb-4"
                style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
              >
                Want to list your{" "}
                <span className="text-amber-500">event</span>?
              </h2>
              <p className="text-white/50 text-[16px] leading-[1.7] max-w-[500px] mx-auto mb-8">
                Reach thousands of people across Kenya. List your event on
                Klickenya and sell tickets, manage RSVPs, and grow your audience
                — all in one place.
              </p>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-amber-500 text-zinc-950 font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <Footer />
    </>
  );
}
