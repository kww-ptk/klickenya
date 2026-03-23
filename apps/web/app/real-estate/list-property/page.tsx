import { type Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { ListPropertyForm } from "./ListPropertyForm";

export const metadata: Metadata = {
  title: "List Your Property | Klickenya Real Estate",
  description:
    "Get your property in front of buyers and renters across Kenya. Submit a listing request and our team will help you go live within 24 hours.",
  alternates: { canonical: "https://klickenya.com/real-estate/list-property" },
  openGraph: {
    title: "List Your Property | Klickenya Real Estate",
    description:
      "Get your property in front of buyers and renters across Kenya. Free listing during our launch phase.",
    url: "https://klickenya.com/real-estate/list-property",
    type: "website",
  },
};

const steps = [
  {
    number: "1",
    title: "Submit your details",
    description:
      "Fill in the form with your contact information and property details.",
  },
  {
    number: "2",
    title: "We review & reach out",
    description:
      "Our team reviews your submission and contacts you within 24 hours.",
  },
  {
    number: "3",
    title: "Your listing goes live",
    description:
      "We create a professional listing and publish it on Klickenya.",
  },
];

export default function ListPropertyPage() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="bg-purple-dark pt-[120px] pb-16 md:pb-20">
        <div className="max-w-[1320px] mx-auto px-5 md:px-10 text-center">
          <span className="inline-flex items-center gap-2 bg-white/8 backdrop-blur-[12px] border border-white/15 rounded-full px-4 py-1.5 text-[12px] font-semibold text-white/85 mb-6">
            Free during launch
          </span>
          <h1
            className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            List your property on{" "}
            <span className="text-amber">Klickenya</span>
          </h1>
          <p className="text-white/55 text-[16px] leading-[1.7] max-w-[520px] mx-auto">
            Get your property in front of thousands of buyers and renters across
            Kenya. Listing is free during our launch phase.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface py-12">
        <div className="max-w-[1320px] mx-auto px-5 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-4 bg-white rounded-[16px] p-6 shadow-xs"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-dim flex items-center justify-center text-[15px] font-bold text-purple2">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-text mb-1">
                    {step.title}
                  </h3>
                  <p className="text-[13px] text-text2 leading-[1.6]">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form section */}
      <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-start">
          {/* Left — info */}
          <div>
            <span className="text-[11px] font-bold tracking-[0.09em] uppercase text-purple2 mb-1.5 block">
              Listing request
            </span>
            <h2 className="text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.03em] text-text leading-[1.15] mb-4">
              Tell us about your property
            </h2>
            <p className="text-[15px] text-text2 leading-[1.7] mb-8">
              Fill in the form and our team will get in touch to gather photos,
              pricing, and any extra details needed to create your listing.
            </p>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text">
                    Free to list
                  </p>
                  <p className="text-[13px] text-text2">
                    No upfront costs during our launch phase.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text">
                    Professional listing
                  </p>
                  <p className="text-[13px] text-text2">
                    We help you create a polished, high-quality listing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-4 h-4 text-green"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-text">
                    Reach thousands
                  </p>
                  <p className="text-[13px] text-text2">
                    Your property gets visibility across all 47 counties.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-border">
              <p className="text-[13px] text-text3">
                Have questions?{" "}
                <Link
                  href="/contact"
                  className="text-purple2 font-semibold hover:underline"
                >
                  Contact us
                </Link>{" "}
                or email{" "}
                <a
                  href="mailto:hello@klickenya.com"
                  className="text-purple2 font-semibold hover:underline"
                >
                  hello@klickenya.com
                </a>
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="bg-white rounded-[20px] border border-border p-6 sm:p-8 shadow-sm">
            <ListPropertyForm />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
