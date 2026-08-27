import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Coins,
  Heart,
  MessageSquare,
  Search,
  Store,
  Tag,
} from "lucide-react";

/**
 * "Who are you and why should I trust this listing?" answered on the page.
 *
 * The town hub is a landing page: a lot of its traffic arrives from a search
 * for the town, has never heard of Klickenya, and will not go and find /about.
 * Both blocks below exist so that visitor can decide without leaving.
 */

/* ── Why Klickenya ─────────────────────────────────── */

const REASONS = [
  {
    icon: Tag,
    title: "The price the seller actually asked for",
    body: "Every property shows its own currency. Coastal stock quoted in euro stays in euro rather than being converted at a stale rate, and where a seller has cut their price we show the previous figure and the percentage.",
  },
  {
    icon: MessageSquare,
    title: "Enquiries go straight to the agent",
    body: "Your message and phone number reach the listing agent or owner directly, so a viewing can be arranged by call or WhatsApp the same day. No lead resale, no middle layer.",
  },
  {
    icon: BadgeCheck,
    title: "You can see who is selling",
    body: "Each listing states whether it came from an agency, a developer or the owner directly, and every agent has a profile page showing their live stock and the areas they cover.",
  },
  {
    icon: Coins,
    title: "Free for buyers and renters",
    body: "Klickenya does not charge buyers a commission, a viewing fee or a subscription. Searching, saving properties and enquiring cost nothing.",
  },
];

function WhyKlickenya({ placeName }: { placeName: string }) {
  return (
    <section className="bg-surface px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
              New to Klickenya
            </span>
            <h2 className="font-display text-[clamp(26px,3vw,38px)] font-bold leading-[1.12] tracking-[-0.03em] text-dark">
              What Klickenya is
            </h2>
            <div className="mt-4 flex flex-col gap-4 text-[15.5px] leading-[1.75] text-text2">
              <p>
                Klickenya is a Kenyan marketplace. Property is one part of it,
                alongside places to stay, restaurants, experiences and events,
                which is why a search for a house in {placeName} and a search for
                somewhere to eat in {placeName} land on the same site.
              </p>
              <p>
                On the property side we list for agencies, developers and private
                owners, and we run the tools those businesses use to manage
                enquiries and bookings. That means the person on the other end of
                your enquiry is the one who actually holds the keys.
              </p>
            </div>
            <Link
              href="/about"
              className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-purple2 transition-colors hover:text-[#9B5ABF]"
            >
              More about Klickenya
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REASONS.map((reason) => {
              const Icon = reason.icon;
              return (
                <div
                  key={reason.title}
                  className="rounded-[20px] border border-border bg-white p-6"
                >
                  <div className="mb-3.5 flex size-10 items-center justify-center rounded-[12px] bg-purple2/10 text-purple2">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-[15.5px] font-bold leading-[1.35] tracking-[-0.01em] text-dark">
                    {reason.title}
                  </h3>
                  <p className="text-[14.5px] leading-[1.65] text-text2">
                    {reason.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Join Klickenya ────────────────────────────────── */

function JoinKlickenya({ placeName }: { placeName: string }) {
  const paths = [
    {
      icon: Heart,
      eyebrow: "Buyers and renters",
      title: "Save the ones you like",
      body: `Create a free account to save properties in ${placeName}, keep your enquiries in one place and pick up a search where you left it.`,
      cta: "Create a free account",
      href: "/register",
      primary: false,
    },
    {
      icon: Building2,
      eyebrow: "Owners, agents and developers",
      title: `List your property in ${placeName}`,
      body: "Agencies, developers and private owners can all list. Your listing goes live once our team has reviewed it, and enquiries come straight to you.",
      cta: "List your property",
      href: "/real-estate/list",
      primary: true,
    },
    {
      icon: Store,
      eyebrow: "Businesses",
      title: "Run your business on Klickenya",
      body: "Hotels, restaurants and tour operators use Klickenya for bookings, menus, table reservations and events, on top of being listed in the marketplace.",
      cta: "See how it works",
      href: "/how-it-works",
      primary: false,
    },
  ];

  return (
    <section className="bg-[#111008] px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 max-w-[620px]">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.09em] text-amber">
            Join Klickenya
          </span>
          <h2 className="font-display text-[clamp(28px,3.4vw,42px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
            Whichever side of {placeName} you are on
          </h2>
          <p className="mt-3 text-[16px] leading-[1.7] text-white/50">
            Klickenya is free to join, whether you are looking for a property, have
            one to sell, or run a business here.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {paths.map((path) => {
            const Icon = path.icon;
            return (
              <div
                key={path.title}
                className="flex flex-col rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-7 transition-colors hover:bg-white/[0.07]"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-[13px] bg-amber/[0.14] text-amber">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <span className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-white/35">
                  {path.eyebrow}
                </span>
                <h3 className="mb-2.5 text-[19px] font-bold leading-[1.25] tracking-[-0.02em] text-white">
                  {path.title}
                </h3>
                <p className="mb-6 text-[14.5px] leading-[1.7] text-white/45">
                  {path.body}
                </p>
                <Link
                  href={path.href}
                  className={
                    path.primary
                      ? "mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-amber px-6 py-3 text-[14px] font-bold text-dark shadow-[0_4px_14px_rgba(232,160,32,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(232,160,32,0.42)]"
                      : "mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-white/10"
                  }
                >
                  {path.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Compact in page search prompt ─────────────────── */

/**
 * Sits directly above the results grid. The grid has its own filters, so this
 * is a scroll target and an affordance rather than a second search engine.
 */
function BrowsePrompt({
  placeName,
  count,
}: {
  placeName: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border bg-white px-5 py-4">
      <Search className="size-[18px] shrink-0 text-purple2" aria-hidden="true" />
      <p className="text-[15px] font-semibold text-text">
        {count} {count === 1 ? "property" : "properties"} in {placeName}
        <span className="ml-1.5 font-normal text-text2">
          Filter by price, type, bedrooms and features below.
        </span>
      </p>
    </div>
  );
}

export { WhyKlickenya, JoinKlickenya, BrowsePrompt };
