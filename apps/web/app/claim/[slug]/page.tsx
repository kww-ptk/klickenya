import { notFound } from "next/navigation";
import { sanityFetch } from "@/lib/sanity/client";
import { defineQuery } from "next-sanity";
import Image from "next/image";
import Link from "next/link";
import { ClaimForm } from "@/components/claim/ClaimForm";

/* ---------- Sanity query ---------- */

const CLAIM_LISTING_QUERY = defineQuery(`
  *[_type == "listing" && slug.current == $slug][0] {
    _id,
    title,
    type,
    subcategory,
    city,
    "slug": slug.current,
    "mainImage": mainImage.asset->url,
    verificationStatus
  }
`);

/* ---------- Metadata ---------- */

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const { data: listing } = await sanityFetch({
    query: CLAIM_LISTING_QUERY,
    params: { slug },
  });

  return {
    title: listing ? `Claim ${listing.title} — Klickenya` : "Claim Listing — Klickenya",
    robots: { index: false, follow: false },
  };
}

/* ---------- Trust signals ---------- */

const TRUST_SIGNALS = [
  { icon: "✓", title: "Verified badge", desc: "Green tick visible to all visitors" },
  { icon: "📩", title: "Direct enquiries", desc: "Receive messages straight to your inbox" },
  { icon: "📊", title: "Listing insights", desc: "See how many people view your listing" },
  { icon: "🔒", title: "You stay in control", desc: "Update your info anytime" },
];

const STEPS = [
  { num: "1", label: "Verify your identity" },
  { num: "2", label: "We review your listing" },
  { num: "3", label: "Your Verified badge goes live" },
];

/* ---------- Page ---------- */

export default async function ClaimPage({ params }: PageProps) {
  const { slug } = await params;
  const { data: listing } = await sanityFetch({
    query: CLAIM_LISTING_QUERY,
    params: { slug },
  });

  if (!listing) notFound();

  const listingUrl = `/${listing.type === "experience" ? "experiences" : listing.type + "s"}/${(listing.city ?? "").toLowerCase().replace(/ /g, "-")}/${listing.slug}`;

  /* Already claimed */
  if (listing.verificationStatus === "claimed" || listing.verificationStatus === "verified") {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <ClaimHeader />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          {listing.mainImage && (
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6 shadow-lg">
              <Image src={listing.mainImage} alt={listing.title} fill className="object-cover" sizes="80px" />
            </div>
          )}
          <h1 className="font-display text-2xl font-bold text-[#16130C] mb-3">{listing.title}</h1>
          <div className="inline-flex items-center gap-2 bg-[#16A34A]/10 text-[#16A34A] font-semibold text-sm px-4 py-2 rounded-full mb-4">
            <span className="size-2 rounded-full bg-[#16A34A]" />
            This listing has already been claimed
          </div>
          <p className="text-sm text-[#5E5848] mb-8">
            The owner has verified their identity and claimed this listing.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={listingUrl} className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-sm rounded-full px-6 py-3 hover:bg-[#d4910f] transition-colors">
              View listing →
            </Link>
            <Link href="/contact" className="text-sm text-[#9C9485] hover:text-[#16130C] underline underline-offset-2">
              Not the owner? Contact us
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Claim form — premium two-column layout */
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <ClaimHeader />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-14">

          {/* ── Left column: form ── */}
          <div>
            {/* Listing mini card */}
            <div className="flex items-center gap-4 border border-[#E2DDD5] rounded-2xl p-4 mb-8 bg-white shadow-sm">
              {listing.mainImage ? (
                <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 shadow-sm">
                  <Image src={listing.mainImage} alt={listing.title} fill className="object-cover" sizes="72px" />
                </div>
              ) : (
                <div className="w-[72px] h-[72px] rounded-xl bg-gradient-to-br from-[#E8A020] to-[#6b2d8b] shrink-0 flex items-center justify-center shadow-sm">
                  <img src="/klickenya-mark.svg" alt="" className="w-7 h-7 opacity-30" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-[#16130C] line-clamp-1">{listing.title}</p>
                {listing.city && (
                  <p className="text-[13px] text-[#9C9485] mt-0.5 flex items-center gap-1">
                    <span>📍</span> {listing.city}
                  </p>
                )}
                <Link href={listingUrl} className="text-[12px] text-[#E8A020] font-semibold mt-1 inline-block hover:underline">
                  View listing →
                </Link>
              </div>
            </div>

            {/* Heading */}
            <h1 className="font-display text-[clamp(24px,3.5vw,32px)] font-bold text-[#16130C] mb-2 tracking-[-0.02em]">
              Is this your business?
            </h1>
            <p className="text-[15px] text-[#5E5848] mb-8 max-w-md">
              Claim it for free — receive enquiries directly, get a Verified badge, and take control of your listing.
            </p>

            {/* Form */}
            <ClaimForm
              listingSlug={listing.slug}
              listingSanityId={listing._id}
              listingTitle={listing.title}
              listingType={listing.type}
              listingSubcategory={listing.subcategory ?? null}
              listingCity={listing.city}
            />
          </div>

          {/* ── Right column: trust signals (hidden on mobile, sticky on desktop) ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[80px] space-y-6">
              {/* How it works */}
              <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-sm">
                <h3 className="text-[13px] font-bold text-[#16130C] uppercase tracking-[0.06em] mb-5">
                  How claiming works
                </h3>
                <div className="space-y-4">
                  {STEPS.map((step, i) => (
                    <div key={step.num} className="flex items-start gap-3">
                      <span className="flex items-center justify-center size-8 rounded-full bg-[#E8A020]/10 text-[#E8A020] text-[13px] font-bold shrink-0">
                        {step.num}
                      </span>
                      <div className="pt-1">
                        <p className="text-[14px] font-semibold text-[#16130C]">{step.label}</p>
                        {i < STEPS.length - 1 && (
                          <div className="w-px h-4 bg-[#E2DDD5] ml-[15px] mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What you get */}
              <div className="bg-white rounded-2xl border border-[#E2DDD5] p-6 shadow-sm">
                <h3 className="text-[13px] font-bold text-[#16130C] uppercase tracking-[0.06em] mb-5">
                  What you get
                </h3>
                <div className="space-y-4">
                  {TRUST_SIGNALS.map((ts) => (
                    <div key={ts.title} className="flex items-start gap-3">
                      <span className="flex items-center justify-center size-8 rounded-lg bg-[#F4F1EC] text-[15px] shrink-0">
                        {ts.icon}
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-[#16130C]">{ts.title}</p>
                        <p className="text-[12px] text-[#9C9485] mt-0.5">{ts.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonial / trust */}
              <div className="bg-[#16130C] rounded-2xl p-6 text-center">
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-[#E8A020] text-[16px]">★</span>
                  ))}
                </div>
                <p className="text-[14px] text-white/70 leading-relaxed mb-3 italic">
                  &ldquo;Claimed our villa in 2 minutes. Started receiving enquiries the same week.&rdquo;
                </p>
                <p className="text-[12px] text-white/40">
                  — Villa owner, Watamu
                </p>
              </div>

              {/* Security note */}
              <div className="flex items-start gap-3 px-2">
                <span className="text-[#9C9485] text-[16px] mt-0.5">🔒</span>
                <p className="text-[12px] text-[#9C9485] leading-relaxed">
                  Your information is encrypted and secure. We never share your personal details without your consent.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared header ---------- */

function ClaimHeader() {
  return (
    <div className="bg-[#16130C] px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <img src="/klickenya-mark.svg" alt="Klickenya" className="h-8 w-8" />
        <span className="text-white font-bold text-lg">
          Klic<span className="text-[#E8A020]">Kenya</span>
        </span>
      </Link>
      <Link
        href="/how-it-works"
        className="text-[12px] text-white/50 hover:text-white transition-colors"
      >
        How it works
      </Link>
    </div>
  );
}
