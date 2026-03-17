import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Klickenya is Kenya's first dedicated marketplace for stays, experiences, restaurants, events, rentals, and property. Learn about our mission, values, and roadmap.",
  openGraph: {
    title: "About Us | Klickenya",
    description:
      "Built for Kenya, by people who love Kenya. Discover our mission to make it easier to find, book, and experience everything Kenya has to offer.",
    siteName: "Klickenya",
    type: "website",
    locale: "en_KE",
  },
};

export default function AboutPage() {
  return (
    <>
      <Nav />

      {/* ─── HERO ─────────────────────────────────────── */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #09090b 0%, #18181b 40%, #1c1917 70%, #09090b 100%)",
        }}
      >
        {/* Subtle landscape-like gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 60% at 50% 80%, rgba(245,158,11,0.08) 0%, transparent 70%), radial-gradient(ellipse 80% 40% at 20% 30%, rgba(245,158,11,0.04) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center px-5 w-full max-w-[820px] mx-auto py-32">
          {/* Amber chip */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/20 mb-8">
            <span className="size-1.5 rounded-full bg-amber" />
            <span className="text-[12px] font-semibold text-amber tracking-[0.02em]">
              Our story
            </span>
          </div>

          <h1
            className="font-display font-bold text-white tracking-[-0.04em] leading-[1.08] mb-6"
            style={{ fontSize: "clamp(36px, 6vw, 72px)" }}
          >
            Built for Kenya, by people who love Kenya
          </h1>

          <p
            className="max-w-[600px] leading-[1.7] text-white/55"
            style={{ fontSize: "clamp(16px, 2vw, 19px)" }}
          >
            Klickenya is Kenya&apos;s first dedicated marketplace for stays,
            experiences, restaurants, events, rentals, and property. We&apos;re
            on a mission to make it easier to discover, book, and experience
            everything Kenya has to offer.
          </p>
        </div>
      </section>

      {/* ─── MISSION ──────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Pull quote */}
          <blockquote className="font-serif text-[clamp(22px,3vw,32px)] italic text-text leading-[1.55] tracking-[-0.01em]">
            &ldquo;Kenya has world-class destinations, incredible hosts, and
            experiences you can&apos;t find anywhere else. They just need a
            platform worthy of them.&rdquo;
          </blockquote>

          {/* Mission paragraphs */}
          <div className="space-y-5 text-[15.5px] text-text2 leading-[1.75]">
            <p>
              We started Klickenya because we saw a gap. Kenya&apos;s tourism
              and hospitality industry is vibrant, diverse, and growing fast —
              but there was no single platform that brought it all together. No
              place where a traveller could find a beachfront villa in Diani, a
              walking tour in Lamu, and a food festival in Nairobi — all in one
              search.
            </p>
            <p>
              We&apos;re deeply connected to Kenya. We know the back roads of
              the Rift Valley, the hidden restaurants in Westlands, the sunrise
              spots on Mount Kenya. This isn&apos;t a Silicon Valley experiment —
              it&apos;s a product built by people who live here and care about
              getting it right.
            </p>
            <p>
              Our vision is simple: become the definitive platform for
              discovering and booking anything in Kenya. We&apos;re early, but
              we&apos;re serious — and we&apos;re moving fast.
            </p>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE'RE BUILDING ──────────────────────── */}
      <section className="bg-surface py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              What we&apos;re building
            </h2>
            <p className="text-text2 text-[15px] mt-2 max-w-[520px] mx-auto">
              A platform that does justice to Kenya&apos;s incredible travel and
              hospitality ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BUILDING_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white rounded-[24px] border border-border p-8"
              >
                <span className="text-[32px] mb-5 block">{card.emoji}</span>
                <h3 className="text-[17px] font-semibold text-text mb-3">
                  {card.title}
                </h3>
                <p className="text-[14px] text-text2 leading-[1.7]">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TIMELINE / ROADMAP ───────────────────────── */}
      <section className="bg-zinc-950 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-white tracking-[-0.03em] mb-4">
            We&apos;re just getting started
          </h2>
          <p className="text-white/45 text-[15px] mb-12 max-w-[480px]">
            Here&apos;s where we are and where we&apos;re headed.
          </p>

          <div className="relative pl-8 border-l-2 border-amber/40 space-y-10">
            {ROADMAP.map((item) => (
              <div key={item.label} className="relative">
                {/* Dot on the line */}
                <div className="absolute -left-[calc(2rem+5px)] top-1 size-3 rounded-full bg-amber ring-4 ring-zinc-950" />
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[20px]">{item.icon}</span>
                  <span className="text-[13px] font-semibold text-amber tracking-wide uppercase">
                    {item.label}
                  </span>
                </div>
                <p className="text-white/70 text-[15px] leading-[1.65]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VALUES ───────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-5 md:px-10 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
            Our values
          </h2>
          <p className="text-text2 text-[15px] mt-2">
            The principles that guide everything we build
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-[32px] border border-border overflow-hidden">
          {VALUES.map((value, i) => (
            <div
              key={value.title}
              className={`p-8 ${
                i < VALUES.length - 1
                  ? "border-b sm:border-b lg:border-b-0 sm:odd:border-r lg:border-r border-border"
                  : ""
              }`}
            >
              <span className="text-[28px] mb-4 block">{value.emoji}</span>
              <h3 className="text-[16px] font-semibold text-text mb-2">
                {value.title}
              </h3>
              <p className="text-[13.5px] text-text2 leading-[1.65]">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────── */}
      <section className="bg-zinc-950 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center">
          <h2
            className="font-display font-bold text-white tracking-[-0.03em] leading-[1.1] mb-6"
            style={{ fontSize: "clamp(26px, 4vw, 44px)" }}
          >
            Want to be part of Kenya&apos;s travel revolution?
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/stays"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-dark font-semibold text-[15px] shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Explore listings
            </Link>
            <Link
              href="/contact?subject=I+want+to+list+my+space"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-white/20 text-white/80 font-semibold text-[15px] hover:bg-white/5 hover:border-white/35 transition-all duration-200"
            >
              List your space
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

/* ─── Static data ───────────────────────────────── */

const BUILDING_CARDS = [
  {
    emoji: "\uD83D\uDDFA\uFE0F",
    title: "The discovery layer",
    description:
      "Every listing gets a Google-indexed page, structured data, and SEO-optimised content so travellers find Kenya's best organically.",
  },
  {
    emoji: "\uD83E\uDD1D",
    title: "Direct connections",
    description:
      "No unnecessary middlemen. Enquiries go straight to hosts and operators.",
  },
  {
    emoji: "\uD83C\uDDF0\uD83C\uDDEA",
    title: "Kenya-first",
    description:
      "KES pricing, M-Pesa payments (V2), built for 47 counties, designed for how Kenyans and visitors actually travel.",
  },
];

const ROADMAP = [
  {
    icon: "\u2705",
    label: "2026 Q1 — Launch",
    description:
      "Listings, blog, SEO foundation — the building blocks are live.",
  },
  {
    icon: "\uD83D\uDD04",
    label: "2026 Q2 — Bookings",
    description:
      "Real payments, availability calendar, and instant confirmation.",
  },
  {
    icon: "\uD83D\uDD2E",
    label: "2026 Q3 — Marketplace",
    description: "Host dashboard, reviews, ratings, and verified badges.",
  },
  {
    icon: "\uD83D\uDE80",
    label: "2026 Q4 — Scale",
    description: "AI recommendations, semantic search, and nationwide growth.",
  },
];

const VALUES = [
  {
    emoji: "\uD83D\uDD0D",
    title: "Transparency",
    description: "No hidden fees, no commission in V1. What you see is what you get.",
  },
  {
    emoji: "\u2B50",
    title: "Quality",
    description: "Every listing is reviewed before going live. We protect the standard.",
  },
  {
    emoji: "\uD83C\uDDF0\uD83C\uDDEA",
    title: "Kenya-first",
    description: "Built for the local market and economy. Kenya always comes first.",
  },
  {
    emoji: "\u26A1",
    title: "Speed",
    description: "We move fast and ship often. Progress over perfection.",
  },
];
