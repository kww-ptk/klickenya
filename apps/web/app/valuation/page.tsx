import { type Metadata } from "next";
import { sanityFetch } from "@/lib/sanity/client";
import { NEIGHBOURHOODS_QUERY } from "@/lib/sanity/queries";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { PropertyFaq } from "@/components/real-estate/PropertyFaq";
import { InternalLinkRail } from "@/components/real-estate/InternalLinkRail";
import { ValuationForm } from "@/components/real-estate/ValuationForm";
import {
  PROPERTY_CATEGORIES,
  categoryPath,
  neighbourhoodPath,
} from "@/lib/real-estate/constants";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl, faqSchema } from "@/lib/real-estate/schema";

/**
 * Property valuation tool.
 *
 * ValuationCTA on the real-estate hub has always linked to /valuation, and the
 * page did not exist: only the POST handler at /api/real-estate/valuation did.
 * Every visitor who clicked the hub's main call to action hit a 404.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Free Property Valuation Kenya | What Is My House Worth",
  description:
    "Get an instant estimate of what your property is worth in Kenya. Enter the neighbourhood, type, bedrooms and size for a free valuation range in Kenyan shillings. No contact details required.",
  alternates: { canonical: absoluteUrl("/valuation") },
  openGraph: {
    title: "Free Property Valuation in Kenya | Klickenya",
    description:
      "Instant estimate of what your property is worth in Kenya. Free, and no contact details required.",
    url: absoluteUrl("/valuation"),
    type: "website",
  },
};

const FAQS = [
  {
    question: "How is this valuation calculated?",
    answer:
      "The estimate multiplies an average price per square metre for the neighbourhood by the size you enter, then adjusts for property type and bedroom count. It returns a midpoint and a likely range either side of it.",
  },
  {
    question: "Is this a formal valuation?",
    answer:
      "No. It is an automated estimate meant as a starting point. Banks, courts and most buyers require a report from a valuer registered with the Valuers Registration Board of Kenya, which involves an inspection of the actual property.",
  },
  {
    question: "What affects a property's value most in Kenya?",
    answer:
      "Location first, then size, then condition and finish. Beyond those, secure parking, backup water and power, and whether the title is clean and transferable all move the number materially.",
  },
  {
    question: "Do I need to give my phone number to use this?",
    answer:
      "No. The valuation tool is free and returns the estimate immediately without asking for contact details.",
  },
  {
    question: "How do I sell my property on Klickenya?",
    answer:
      "Submit it through the listing form at /real-estate/list. Owners, agents and developers can all list, and listing is free during the launch phase.",
  },
];

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function ValuationPage() {
  const { data: neighbourhoods } = await sanityFetch({
    query: NEIGHBOURHOODS_QUERY,
  }).catch(() => ({ data: [] }));

  const list = (neighbourhoods ?? []) as any[];
  const names: string[] = list.map((n) => n.name).filter(Boolean);
  const areaLinks = list
    .filter((n) => (n.slug?.current ?? n.slug) && (n.propertyCount ?? 0) > 0)
    .slice(0, 12)
    .map((n) => ({
      label: n.name,
      href: neighbourhoodPath(n.slug?.current ?? n.slug),
      count: n.propertyCount,
    }));

  return (
    <>
      <JsonLd schema={faqSchema(FAQS)} />
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Klickenya Property Valuation",
          url: absoluteUrl("/valuation"),
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: 0, priceCurrency: "KES" },
          description:
            "Free instant property valuation estimate for homes and apartments in Kenya.",
        }}
      />
      <Nav />

      <div className="pt-[68px]">
        <section className="mx-auto max-w-[1320px] px-5 py-10 md:px-10">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Real Estate", path: "/real-estate" },
              { name: "Property valuation" },
            ]}
          />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_460px] lg:gap-16">
            <div className="max-w-[640px]">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.09em] text-purple2">
                Free tool
              </span>
              <h1 className="font-display text-[clamp(30px,4vw,48px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-dark">
                What is your property worth?
              </h1>
              <p className="mt-4 text-[16px] leading-[1.75] text-text2">
                Enter four details and get an instant estimate of your
                property&apos;s value in Kenyan shillings, along with the likely
                range either side of it. The estimate is built from average
                prices per square metre in the neighbourhood you choose, adjusted
                for the type of property and how many bedrooms it has.
              </p>
              <p className="mt-4 text-[16px] leading-[1.75] text-text2">
                Use it to sanity check an asking price before you list, to judge
                whether an offer is fair, or to see how your home compares to
                what is currently on the market nearby. It takes about twenty
                seconds and asks for nothing but the property details.
              </p>

              <div className="mt-8 rounded-[20px] border border-amber/25 bg-amber/8 p-5">
                <p className="text-[14px] font-bold text-dark">
                  This is an estimate, not a formal valuation
                </p>
                <p className="mt-1.5 text-[14px] leading-[1.7] text-text2">
                  Banks, courts and most serious buyers require a report from a
                  valuer registered with the Valuers Registration Board of Kenya.
                  That involves an inspection of the actual property and costs
                  money. Treat this figure as a starting point for a conversation.
                </p>
              </div>
            </div>

            <div className="lg:sticky lg:top-[88px] lg:self-start">
              <ValuationForm neighbourhoods={names} />
            </div>
          </div>

          <div className="mt-16 max-w-[860px]">
            <PropertyFaq items={FAQS} title="Property valuation questions" />
          </div>

          <InternalLinkRail
            title="See what is actually selling"
            description="The fastest way to sense check an estimate is to look at live asking prices in the same area."
            links={areaLinks}
          />

          <InternalLinkRail
            title="Browse the market"
            links={PROPERTY_CATEGORIES.map((c) => ({
              label: categoryHeading(c),
              href: categoryPath(c),
            }))}
          />
        </section>
      </div>

      <Footer />
    </>
  );
}
