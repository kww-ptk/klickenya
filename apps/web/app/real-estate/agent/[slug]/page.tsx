import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Check, Phone, Mail } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import {
  AGENTS_QUERY,
  AGENT_BY_SLUG_QUERY,
  PROPERTIES_BY_AGENT_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";

export const revalidate = 3600;

/* ── Mapper ────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPropertyToCard(p: any) {
  return {
    id: p._id,
    title: p.title ?? "Untitled",
    slug: p.slug?.current ?? p.slug ?? "",
    listingCategory: p.listingCategory ?? "for-sale",
    propertyType: p.propertyType,
    status: p.status ?? "available",
    price: p.price ?? 0,
    priceType: p.priceType ?? "total",
    previousPrice: p.previousPrice,
    isFeatured: p.isFeatured,
    isNewDevelopment: p.isNewDevelopment,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    sizeSqm: p.sizeSqm,
    neighbourhood: p.neighbourhood ?? "",
    city: p.city ?? "",
    coverPhoto: p.coverPhoto ? urlForImage(p.coverPhoto).width(800).url() : "",
  };
}

/* ── Static params ─────────────────────────────────── */

export async function generateStaticParams() {
  const agents: { slug: { current: string } }[] = await sanityClient
    .fetch(AGENTS_QUERY)
    .catch(() => []);

  return (agents ?? [])
    .filter((a) => a.slug)
    .map((a) => ({
      slug: typeof a.slug === "string" ? a.slug : a.slug?.current ?? "",
    }))
    .filter((p) => p.slug);
}

/* ── Metadata ──────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const agent = await sanityClient
    .fetch(AGENT_BY_SLUG_QUERY, { slug })
    .catch(() => null);

  if (!agent) return {};

  const title = `${agent.displayName} — Property Agent | Klickenya`;
  const description = agent.bio
    ? agent.bio.slice(0, 160)
    : `View properties listed by ${agent.displayName}${agent.agencyName ? ` at ${agent.agencyName}` : ""} on Klickenya.`;

  const ogImage = agent.photo
    ? urlForImage(agent.photo).width(600).height(600).url()
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `https://klickenya.com/real-estate/agent/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://klickenya.com/real-estate/agent/${slug}`,
      images: ogImage ? [ogImage] : [],
    },
  };
}

/* ── Page ──────────────────────────────────────────── */

export default async function AgentProfilePage({ params }: PageProps) {
  const { slug } = await params;

  const agent = await sanityClient
    .fetch(AGENT_BY_SLUG_QUERY, { slug })
    .catch(() => null);

  if (!agent) notFound();

  const properties = await sanityClient
    .fetch(PROPERTIES_BY_AGENT_QUERY, { agentId: agent._id })
    .catch(() => []);

  const cards = ((properties ?? []) as unknown[]).map(mapPropertyToCard);

  const specialisations: string[] = agent.specialisations ?? [];
  const serviceAreas: string[] = agent.serviceAreas ?? [];

  return (
    <>
      <Nav />

      <div className="pt-[68px]">
        <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-[13.5px] text-text2">
              <li>
                <Link href="/" className="hover:text-text transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li>
                <Link
                  href="/real-estate"
                  className="hover:text-text transition-colors"
                >
                  Real Estate
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3 text-text3" />
              </li>
              <li className="font-semibold text-text">
                {agent.displayName}
              </li>
            </ol>
          </nav>

          {/* ── Agent header ───────────────── */}
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="size-[120px] rounded-full overflow-hidden border-[4px] border-white shadow-lg bg-surface2">
                {agent.photo ? (
                  <Image
                    src={urlForImage(agent.photo).width(240).url()}
                    alt={agent.displayName}
                    width={120}
                    height={120}
                    className="size-full object-cover"
                    priority
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-[40px] font-bold text-text3">
                    {(agent.displayName ?? "A").charAt(0)}
                  </div>
                )}
              </div>

              {/* Verified badge */}
              {agent.isVerified && (
                <span className="absolute bottom-1 right-1 size-[28px] rounded-full bg-purple2 border-[3px] border-white flex items-center justify-center">
                  <Check
                    className="size-[13px] text-white"
                    strokeWidth={3}
                  />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-[clamp(26px,3vw,36px)] font-extrabold tracking-[-0.03em] text-dark">
                  {agent.displayName}
                </h1>
                {agent.isVerified && (
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-purple2/15 text-[11px] font-bold text-purple2 uppercase tracking-wide">
                    Verified
                  </span>
                )}
              </div>

              {agent.agencyName && (
                <p className="text-[15px] text-text2 mb-3">
                  {agent.agencyName}
                  {agent.licenceNumber && (
                    <span className="text-text3">
                      {" "}
                      &middot; Licence #{agent.licenceNumber}
                    </span>
                  )}
                </p>
              )}

              {agent.bio && (
                <p className="text-[14.5px] text-text2 leading-[1.65] mb-4 max-w-[640px]">
                  {agent.bio}
                </p>
              )}

              {/* Contact info */}
              <div className="flex flex-wrap gap-3 mb-4">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gradient-to-r from-amber to-amber2 text-dark text-[13px] font-bold shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:-translate-y-0.5 transition-all"
                  >
                    <Phone className="size-4" />
                    {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] border border-border text-[13px] font-bold text-text2 hover:border-purple2 hover:text-purple2 transition-colors"
                  >
                    <Mail className="size-4" />
                    {agent.email}
                  </a>
                )}
              </div>

              {/* Specialisation tags */}
              {specialisations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {specialisations.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-purple2/10 border border-purple2/18 text-[12px] font-semibold text-purple2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Stats row ──────────────────── */}
          <div className="flex gap-0 border border-border rounded-[20px] overflow-hidden mb-10">
            <div className="flex-1 text-center py-5 border-r border-border">
              <div className="text-[24px] font-bold text-text tracking-[-0.02em]">
                {cards.length}
              </div>
              <div className="text-[12px] text-text3 mt-0.5">Listings</div>
            </div>
            <div className="flex-1 text-center py-5 border-r border-border">
              <div className="text-[24px] font-bold text-text tracking-[-0.02em]">
                4.9
              </div>
              <div className="text-[12px] text-text3 mt-0.5">Rating</div>
            </div>
            <div className="flex-1 text-center py-5">
              <div className="text-[24px] font-bold text-text tracking-[-0.02em]">
                {serviceAreas.length > 0 ? serviceAreas.length : "—"}
              </div>
              <div className="text-[12px] text-text3 mt-0.5">Service areas</div>
            </div>
          </div>

          {/* ── Properties grid ─────────────── */}
          {cards.length > 0 ? (
            <>
              <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
                Properties by {agent.displayName}
              </h2>
              <PropertyGrid variant="standard">
                {cards.map((card) => (
                  <PropertyCard key={card.id} {...card} />
                ))}
              </PropertyGrid>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="text-[48px] mb-4">🏠</span>
              <p className="text-[18px] font-semibold text-text mb-2">
                No listings yet
              </p>
              <p className="text-[15px] text-text2 max-w-[380px]">
                {agent.displayName} hasn&apos;t listed any properties yet. Check
                back soon.
              </p>
            </div>
          )}
        </section>
      </div>

      <Footer />
    </>
  );
}
