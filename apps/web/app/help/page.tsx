import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { HelpAccordion } from "./HelpAccordion";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Find answers to common questions about using Klickenya — Kenya's marketplace for stays, experiences, events, and more.",
  openGraph: {
    title: "Help Center | Klickenya",
    description:
      "Find answers to common questions about using Klickenya — Kenya's marketplace for stays, experiences, events, and more.",
    siteName: "Klickenya",
    type: "website",
    locale: "en_KE",
  },
};

/* ─── FAQ Data ────────────────────────────────────── */

const BROWSING_FAQ = [
  {
    q: "How do I search for listings?",
    a: "Use the search bar on the homepage or browse by category (Stays, Experiences, Events, Restaurants, Rentals, Services). You can filter by location to find exactly what you\u2019re looking for.",
  },
  {
    q: "What types of listings are available?",
    a: "Klickenya features stays (hotels, villas, Airbnbs), experiences (tours, activities), events, restaurants, car & equipment rentals, services, and real estate.",
  },
  {
    q: "Can I save listings I like?",
    a: "Yes! Click the heart icon on any listing to save it to your favourites. You can compare saved listings before making a decision.",
  },
  {
    q: "Are all listings verified?",
    a: "Every listing on Klickenya is reviewed by our team before going live. We check for accuracy, quality photos, and complete information.",
  },
];

const ENQUIRY_FAQ = [
  {
    q: "How do I contact a host?",
    a: "Click the \u201CSend enquiry\u201D button on any listing page. Fill in your name, email, dates, and message. It\u2019s free and takes about 30 seconds.",
  },
  {
    q: "Do I need an account to enquire?",
    a: "No! Anyone can send an enquiry without creating an account. Just fill in the form and we\u2019ll connect you with the host.",
  },
  {
    q: "How quickly will I get a response?",
    a: "Most hosts respond within 2 hours. Our team also monitors enquiries to make sure you get a timely response.",
  },
  {
    q: "Is there a booking fee?",
    a: "No. During our launch phase, all enquiries are completely free. There are no booking fees or commissions.",
  },
];

const LISTING_FAQ = [
  {
    q: "How do I list my property or experience?",
    a: "Head to our How It Works page and fill out the listing request form. Our team will personally set up your listing within 24 hours.",
  },
  {
    q: "Is it free to list?",
    a: "Yes, listing is completely free during our launch phase. No hidden fees, no commission.",
  },
  {
    q: "What information do I need to provide?",
    a: "Your name, email, phone number, listing type, location, and a brief description. We\u2019ll handle the rest \u2014 including photos, descriptions, and SEO optimisation.",
  },
  {
    q: "Can I edit my listing after it\u2019s live?",
    a: "Absolutely. Just reach out to us and we\u2019ll make any changes you need. In V2, you\u2019ll have a host dashboard to manage your listing directly.",
  },
];

const PRICING_FAQ = [
  {
    q: "How much does it cost to use Klickenya?",
    a: "Browsing and enquiring is completely free for guests. Listing is free for hosts during our launch phase.",
  },
  {
    q: "How do payments work?",
    a: "In V1, Klickenya is an enquiry-based platform. Guests connect with hosts directly to arrange payment. M-Pesa and card payments are coming in V2.",
  },
  {
    q: "Are there any hidden fees?",
    a: "None. We believe in full transparency. During our launch phase, there are zero fees for both guests and hosts.",
  },
  {
    q: "Will you support M-Pesa?",
    a: "Yes! M-Pesa integration is a top priority for V2. We\u2019re building the payment system to work seamlessly with how Kenyans actually pay.",
  },
];

const ACCOUNT_FAQ = [
  {
    q: "Do I need an account?",
    a: "No. You can browse and enquire without an account. Accounts will be available in V2 for managing bookings, reviews, and host dashboards.",
  },
  {
    q: "How do I save my favourite listings?",
    a: "Click the heart icon on any listing. Your favourites are saved locally in your browser.",
  },
  {
    q: "Can I get notifications for new listings?",
    a: "Not yet, but this is coming in V2. For now, follow us on Instagram and subscribe to our journal for updates.",
  },
];

const SAFETY_FAQ = [
  {
    q: "How do you verify listings?",
    a: "Every listing is manually reviewed by our team. We check photos, descriptions, and contact information before publishing.",
  },
  {
    q: "What if I have a problem with a host?",
    a: "Contact us directly at hello@klickenya.com or via WhatsApp. We\u2019ll mediate and help resolve any issues.",
  },
  {
    q: "Is my personal information safe?",
    a: "Yes. We only collect what\u2019s necessary to connect you with hosts. Read our Privacy Policy for full details.",
  },
  {
    q: "How do I report a listing?",
    a: "Email us at hello@klickenya.com with the listing URL and your concern. We take all reports seriously and act quickly.",
  },
];

/* ─── Quick Link Cards ────────────────────────────── */

const QUICK_LINKS = [
  {
    emoji: "\uD83D\uDD0D",
    title: "Finding & Browsing",
    description: "How to discover stays, experiences, and more",
    anchor: "#browsing",
  },
  {
    emoji: "\uD83D\uDCE9",
    title: "Making an Enquiry",
    description: "How the enquiry process works",
    anchor: "#enquiry",
  },
  {
    emoji: "\uD83C\uDFE0",
    title: "Listing Your Space",
    description: "How to get your property or experience listed",
    anchor: "#listing",
  },
  {
    emoji: "\uD83D\uDCB0",
    title: "Pricing & Payments",
    description: "What it costs and how payments work",
    anchor: "#pricing",
  },
  {
    emoji: "\uD83D\uDC64",
    title: "Your Account",
    description: "Account settings and preferences",
    anchor: "#account",
  },
  {
    emoji: "\uD83D\uDEE1\uFE0F",
    title: "Trust & Safety",
    description: "How we keep the platform safe",
    anchor: "#safety",
  },
];

/* ─── Section Data ────────────────────────────────── */

const SECTIONS = [
  { id: "browsing", title: "Finding & Browsing", items: BROWSING_FAQ },
  { id: "enquiry", title: "Making an Enquiry", items: ENQUIRY_FAQ },
  { id: "listing", title: "Listing Your Space", items: LISTING_FAQ },
  { id: "pricing", title: "Pricing & Payments", items: PRICING_FAQ },
  { id: "account", title: "Your Account", items: ACCOUNT_FAQ },
  { id: "safety", title: "Trust & Safety", items: SAFETY_FAQ },
];

/* ─── Page ────────────────────────────────────────── */

export default function HelpPage() {
  return (
    <>
      <Nav />

      {/* ─── HERO ──────────────────────────────────── */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 overflow-hidden">
        {/* Subtle amber gradient accent */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245,158,11,0.07) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-[760px] mx-auto px-5 md:px-10 text-center">
          {/* Amber chip */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber/10 border border-amber/20 mb-8">
            <span className="size-1.5 rounded-full bg-amber" />
            <span className="text-[12px] font-semibold text-amber tracking-[0.02em]">
              Help Center
            </span>
          </div>

          <h1
            className="font-display font-bold text-text tracking-[-0.04em] leading-[1.08] mb-4"
            style={{ fontSize: "clamp(36px, 5.5vw, 60px)" }}
          >
            How can we help?
          </h1>

          <p
            className="text-text2 max-w-[480px] mx-auto leading-[1.65] mb-10"
            style={{ fontSize: "clamp(16px, 2vw, 18px)" }}
          >
            Everything you need to know about using Klickenya
          </p>

          {/* Search bar (visual only) */}
          <div className="max-w-[520px] mx-auto">
            <div className="flex items-center bg-white border border-zinc-200 rounded-full py-3.5 pl-5 pr-3.5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <svg
                className="size-5 text-zinc-400 shrink-0 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search for answers..."
                className="flex-1 text-[15px] text-zinc-900 placeholder:text-zinc-400 bg-transparent outline-none"
                readOnly
              />
              <div className="ml-2 size-9 rounded-full bg-amber flex items-center justify-center shrink-0">
                <svg
                  className="size-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── QUICK LINKS ──────────────────────────── */}
      <section className="bg-surface py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,34px)] font-bold text-text tracking-[-0.03em]">
              Browse by topic
            </h2>
            <p className="text-text2 text-[15px] mt-2">
              Jump straight to what you need
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {QUICK_LINKS.map((card) => (
              <a
                key={card.anchor}
                href={card.anchor}
                className="group bg-white rounded-[24px] border border-border p-7 hover:-translate-y-1 transition-all duration-300 hover:shadow-lg hover:shadow-zinc-100 hover:border-amber/30"
              >
                <span className="text-[32px] mb-4 block">{card.emoji}</span>
                <h3 className="text-[16px] font-semibold text-text mb-2 group-hover:text-amber transition-colors duration-200">
                  {card.title}
                </h3>
                <p className="text-[13.5px] text-text2 leading-[1.65]">
                  {card.description}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DETAILED FAQ SECTIONS ─────────────────── */}
      {SECTIONS.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-[68px] py-16 md:py-20 ${
            i % 2 === 0 ? "bg-white" : "bg-zinc-50"
          }`}
        >
          <div className="max-w-[720px] mx-auto px-5 md:px-10">
            <h2 className="font-display text-[clamp(22px,3vw,30px)] font-bold text-text tracking-[-0.03em] mb-2">
              {section.title}
            </h2>
            <div className="w-12 h-[3px] rounded-full bg-amber mb-8" />
            <HelpAccordion items={section.items} />
          </div>
        </section>
      ))}

      {/* ─── CONTACT / STILL NEED HELP ─────────────── */}
      <section className="bg-zinc-950 py-16 md:py-24">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <div className="text-center mb-12">
            <h2
              className="font-display font-bold text-white tracking-[-0.03em] leading-[1.1] mb-4"
              style={{ fontSize: "clamp(26px, 4vw, 44px)" }}
            >
              Still need help?
            </h2>
            <p className="text-white/50 text-[16px] max-w-[440px] mx-auto">
              Our team is here for you
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-[860px] mx-auto mb-12">
            {/* Email */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-7 text-center">
              <span className="text-[28px] mb-3 block">{"\uD83D\uDCE7"}</span>
              <h3 className="text-[15px] font-semibold text-white mb-1.5">
                Email
              </h3>
              <a
                href="mailto:hello@klickenya.com"
                className="text-[14px] text-amber hover:underline"
              >
                hello@klickenya.com
              </a>
            </div>

            {/* WhatsApp */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-7 text-center">
              <span className="text-[28px] mb-3 block">{"\uD83D\uDCF1"}</span>
              <h3 className="text-[15px] font-semibold text-white mb-1.5">
                WhatsApp
              </h3>
              <a
                href="https://wa.me/254700000000"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] text-amber hover:underline"
              >
                Chat with us
              </a>
            </div>

            {/* Response time */}
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-7 text-center">
              <span className="text-[28px] mb-3 block">{"\u23F1"}</span>
              <h3 className="text-[15px] font-semibold text-white mb-1.5">
                Response time
              </h3>
              <p className="text-[14px] text-white/50">
                We reply within 24 hours
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-amber text-zinc-950 font-semibold text-[15px] shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
