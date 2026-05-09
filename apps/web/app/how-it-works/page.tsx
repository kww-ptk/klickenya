import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { AnimatedCounters } from "./AnimatedCounters";
import { ListingRequestForm } from "./ListingRequestForm";
import { FAQAccordion } from "./FAQAccordion";
import { AmbassadorForm } from "./AmbassadorForm";
import { DestinationsHeroGlow } from "@/components/destinations/DestinationsHeroGlow";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Klickenya connects travellers with Kenya's best stays, experiences, restaurants, and properties. List your space for free during our launch phase.",
  openGraph: {
    title: "How It Works | Klickenya",
    description:
      "Kenya's marketplace is finally here. Discover how to explore listings or list your own space, experience, or property.",
    siteName: "Klickenya",
    type: "website",
    locale: "en_KE",
  },
};

/* ─── Static Data ────────────────────────────────── */

const GUEST_STEPS = [
  {
    emoji: "\uD83D\uDD0D",
    title: "Discover",
    description:
      "Browse verified stays, experiences, restaurants and more across Kenya.",
  },
  {
    emoji: "\u2764\uFE0F",
    title: "Save your favourites",
    description:
      "Heart any listing to save it. Compare before you decide.",
  },
  {
    emoji: "\uD83D\uDCE9",
    title: "Send an enquiry",
    description:
      "Fill in your details and dates. It's free, takes 30 seconds, no account needed.",
  },
  {
    emoji: "\u2705",
    title: "Get confirmed",
    description:
      "The host or team replies within 2 hours with availability and next steps.",
  },
];

const HOST_BENEFITS = [
  {
    emoji: "\uD83C\uDF0D",
    title: "Kenya-first platform",
    description:
      "Built for the Kenyan market, KES pricing, M-Pesa coming in V2.",
  },
  {
    emoji: "\uD83D\uDCC8",
    title: "SEO-powered discovery",
    description: "Every listing gets its own Google-indexed page.",
  },
  {
    emoji: "\uD83D\uDCE9",
    title: "Direct enquiries",
    description: "Leads go straight to your inbox, no commission on V1.",
  },
  {
    emoji: "\uD83E\uDD1D",
    title: "Personal setup",
    description: "We add your listing for you. Just send us the details.",
  },
];

const GROWING_STATS = [
  { value: "10+", label: "New listings weekly" },
  { value: "12", label: "Counties covered" },
  { value: "Free", label: "Free to enquire" },
];

const TICKER_DESTINATIONS = [
  "Watamu",
  "\u00B7",
  "Kilifi",
  "\u00B7",
  "Diani Beach",
  "\u00B7",
  "Nairobi",
  "\u00B7",
  "Lamu",
  "\u00B7",
  "Amboseli",
  "\u00B7",
  "Maasai Mara",
  "\u00B7",
  "Nanyuki",
  "\u00B7",
  "Malindi",
  "\u00B7",
  "Mombasa",
  "\u00B7",
];

/* ─── Page ────────────────────────────────────────── */

export default function HowItWorksPage() {
  return (
    <>
      <Nav />

      {/* ─── HERO ──────────────────────────────────── */}
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
            Kenya&apos;s marketplace is{" "}
            <span className="text-amber">finally here</span>
          </h1>

          <p
            className="max-w-[600px] mx-auto leading-[1.7] mb-10"
            style={{
              color: "rgba(255,255,255,.6)",
              fontSize: "clamp(16px, 2vw, 19px)",
            }}
          >
            Klickenya connects travellers with the best stays, experiences,
            restaurants, and properties across Kenya. We&apos;re growing fast
            — and the best spots are listing now.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-zinc-950 font-semibold text-[15px] shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Explore listings &rarr;
            </Link>
            <Link
              href="/list"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-white/20 text-white/80 font-semibold text-[15px] hover:bg-white/5 hover:border-white/35 transition-all duration-200"
            >
              List your space &rarr;
            </Link>
          </div>

          {/* Animated counter row */}
          <AnimatedCounters />
        </div>
      </section>

      {/* ─── FOR GUESTS ────────────────────────────── */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-zinc-900 tracking-[-0.03em]">
              For guests
            </h2>
            <p className="text-zinc-500 text-[15px] mt-2 max-w-[480px] mx-auto">
              Enquire about anything in Kenya in just a few simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {GUEST_STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-[24px] border border-zinc-200 p-7 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-100"
              >
                <span className="inline-flex items-center justify-center size-[48px] rounded-[14px] bg-amber/10 text-amber text-[22px] font-bold mb-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[24px] mb-3">{step.emoji}</p>
                <h3 className="text-[16px] font-semibold text-zinc-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-[13.5px] text-zinc-500 leading-[1.65]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR HOSTS / LISTERS ───────────────────── */}
      <section id="listing-request" className="scroll-mt-[68px] bg-zinc-950 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-white tracking-[-0.03em]">
              Want to list your space, experience, or property?
            </h2>
            <p className="text-white/50 text-[15px] mt-2 max-w-[560px] mx-auto">
              We&apos;re onboarding Kenya&apos;s best hosts and operators right
              now. Listing is free during our launch phase.
            </p>
          </div>

          {/* Benefits grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {HOST_BENEFITS.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-7 hover:-translate-y-1 transition-all duration-300"
              >
                <p className="text-[24px] mb-3">{benefit.emoji}</p>
                <h3 className="text-[16px] font-semibold text-white mb-2">
                  {benefit.title}
                </h3>
                <p className="text-[13.5px] text-white/50 leading-[1.65]">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>

          {/* Listing request form */}
          <div className="max-w-[640px] mx-auto">
            <ListingRequestForm />
            <p className="text-center text-[13px] text-white/40 mt-5">
              We personally review every submission and get back to you within
              24 hours.
            </p>
          </div>
        </div>
      </section>

      {/* ─── GROWING FAST ──────────────────────────── */}
      <section
        className="py-16 md:py-20 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        }}
      >
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center mb-10">
          <p
            className="font-display font-bold text-white tracking-[-0.03em] leading-[1.1]"
            style={{ fontSize: "clamp(22px, 3.5vw, 32px)" }}
          >
            From Watamu to Nairobi, Kilifi to the Mara — Kenya&apos;s best is
            coming online.
          </p>
        </div>

        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-3 gap-4 text-center mb-12">
            {GROWING_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display font-bold text-white text-[clamp(24px,4vw,40px)] tracking-[-0.03em]">
                  {stat.value}
                </p>
                <p className="text-[13px] text-white/75 font-medium mt-1">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Marquee ticker */}
        <div className="relative w-full overflow-hidden">
          <div className="flex animate-marquee-hiw whitespace-nowrap">
            {[...TICKER_DESTINATIONS, ...TICKER_DESTINATIONS].map((name, i) => (
              <span
                key={i}
                className="mx-6 text-[18px] md:text-[22px] font-semibold text-white/80"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes marqueeHiw {
                from { transform: translateX(0); }
                to { transform: translateX(-50%); }
              }
              .animate-marquee-hiw {
                animation: marqueeHiw 25s linear infinite;
              }
            `,
          }}
        />
      </section>

      {/* ─── BECOME AN AMBASSADOR ───────────────────── */}
      <section id="ambassador" className="scroll-mt-[68px] py-16 md:py-24" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.05) 100%)" }}>
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold tracking-[0.09em] uppercase text-amber mb-3">
              Join the movement
            </span>
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-zinc-900 tracking-[-0.03em]">
              Become a Klickenya Ambassador
            </h2>
            <p className="text-zinc-500 text-[15px] mt-2 max-w-[640px] mx-auto leading-[1.65]">
              We&apos;re building the ultimate platform for Kenya — and we need passionate people to help us do it. Whether you&apos;re a local guide, influencer, content creator, or just someone who loves Kenya, there&apos;s a place for you.
            </p>
          </div>

          {/* Ambassador role cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
            {[
              {
                emoji: "\uD83D\uDCF8",
                title: "Content Creators",
                description: "Share your Kenya stories. Create photos, videos, and guides that showcase the best of Kenya. Get featured on our platform and social channels.",
              },
              {
                emoji: "\uD83D\uDDFA\uFE0F",
                title: "Local Guides",
                description: "Know your city like the back of your hand? Help us discover hidden gems, verify listings, and connect with the best hosts in your area.",
              },
              {
                emoji: "\uD83D\uDCF1",
                title: "Influencers",
                description: "Got an audience that loves travel? Partner with us to promote Kenya\u2019s best destinations, stays, and experiences to your followers.",
              },
              {
                emoji: "\uD83E\uDD1D",
                title: "Community Champions",
                description: "Rally your community around Klickenya. Spread the word, recruit hosts, and help us grow in your area. Earn rewards as we scale.",
              },
            ].map((role) => (
              <div
                key={role.title}
                className="rounded-[24px] border border-zinc-200 bg-white p-7 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-100"
              >
                <p className="text-[28px] mb-3">{role.emoji}</p>
                <h3 className="text-[16px] font-semibold text-zinc-900 mb-2">
                  {role.title}
                </h3>
                <p className="text-[13.5px] text-zinc-500 leading-[1.65]">
                  {role.description}
                </p>
              </div>
            ))}
          </div>

          {/* What you get */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 mb-14">
            {[
              { emoji: "\uD83C\uDF81", text: "Early access to new features" },
              { emoji: "\uD83D\uDCE2", text: "Featured on our platform & socials" },
              { emoji: "\uD83D\uDCB0", text: "Revenue share when we launch payments in V2" },
            ].map((benefit) => (
              <div key={benefit.text} className="flex items-center gap-3">
                <span className="text-[22px]">{benefit.emoji}</span>
                <span className="text-[14px] font-medium text-zinc-700">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* Ambassador form */}
          <div className="max-w-[640px] mx-auto">
            <AmbassadorForm />
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────── */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-[720px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-zinc-900 tracking-[-0.03em]">
              Frequently asked questions
            </h2>
          </div>

          <FAQAccordion />
        </div>
      </section>

      <Footer />
    </>
  );
}
