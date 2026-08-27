import { type Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Check, Mail, MessageCircle, Phone } from "lucide-react";
import { sanityClient } from "@/lib/sanity/client";
import {
  AGENTS_QUERY,
  AGENT_BY_SLUG_QUERY,
  PROPERTIES_BY_AGENT_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { PropertyCard } from "@/components/real-estate/PropertyCard";
import { PropertyGrid } from "@/components/real-estate/PropertyGrid";
import { PropertyBrowser } from "@/components/real-estate/PropertyBrowser";
import { Breadcrumbs } from "@/components/real-estate/Breadcrumbs";
import { InternalLinkRail } from "@/components/real-estate/InternalLinkRail";
import { mapPropertiesToCards } from "@/lib/real-estate/mappers";
import { toWhatsAppNumber } from "@/lib/real-estate/format";
import {
  PROPERTY_CATEGORIES,
  agentPath,
  categoryPath,
} from "@/lib/real-estate/constants";
import { categoryHeading } from "@/lib/real-estate/content";
import { absoluteUrl, agentSchema, itemListSchema } from "@/lib/real-estate/schema";

export const revalidate = 3600;

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

  const title = `${agent.displayName}, Property Agent in Kenya`;
  const description = agent.bio
    ? agent.bio.slice(0, 160)
    : `View properties listed by ${agent.displayName}${agent.agencyName ? ` at ${agent.agencyName}` : ""} on Klickenya.`;

  const ogImage = agent.photo?.asset
    ? urlForImage(agent.photo).width(600).height(600).url()
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(agentPath(slug)) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(agentPath(slug)),
      type: "profile",
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

  const cards = mapPropertiesToCards(properties);

  const specialisations: string[] = agent.specialisations ?? [];
  const serviceAreas: string[] = agent.serviceAreas ?? [];

  const photoUrl = agent.photo?.asset
    ? urlForImage(agent.photo).width(600).height(600).url()
    : undefined;
  const whatsapp = toWhatsAppNumber(agent.phone);

  return (
    <>
      <JsonLd schema={agentSchema(agent, photoUrl)} />
      <JsonLd
        schema={itemListSchema(cards, {
          name: `Properties listed by ${agent.displayName}`,
          url: agentPath(slug),
        })}
      />
      <Nav />

      <div className="pt-[68px]">
        <section className="max-w-[1320px] mx-auto px-5 md:px-10 py-10">
          <Breadcrumbs
            crumbs={[
              { name: "Home", path: "/" },
              { name: "Real Estate", path: "/real-estate" },
              { name: "Agents", path: "/real-estate" },
              { name: agent.displayName },
            ]}
          />

          {/* ── Agent header ───────────────── */}
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
            {/* Photo */}
            <div className="relative shrink-0">
              <div className="size-[120px] rounded-full overflow-hidden border-[4px] border-white shadow-lg bg-surface2">
                {photoUrl ? (
                  <Image
                    src={photoUrl}
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
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-[#25D366] text-white text-[13px] font-bold hover:-translate-y-0.5 transition-all"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                )}
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

          {/*
            The middle cell of this row used to read "4.9 Rating", hardcoded.
            There is no reviews system, so that number was invented on a page
            that presents itself as a professional profile.
          */}
          <div className="mb-10 flex overflow-hidden rounded-[20px] border border-border">
            <div className="flex-1 border-r border-border py-5 text-center">
              <div className="text-[24px] font-bold tracking-[-0.02em] text-text">
                {cards.length}
              </div>
              <div className="mt-0.5 text-[12px] text-text3">
                {cards.length === 1 ? "Live listing" : "Live listings"}
              </div>
            </div>
            <div className="flex-1 border-r border-border py-5 text-center">
              <div className="text-[24px] font-bold tracking-[-0.02em] text-text">
                {serviceAreas.length > 0 ? serviceAreas.length : "\u2014"}
              </div>
              <div className="mt-0.5 text-[12px] text-text3">Service areas</div>
            </div>
            <div className="flex-1 py-5 text-center">
              <div className="text-[24px] font-bold tracking-[-0.02em] text-text">
                {agent.isVerified ? "Yes" : "Pending"}
              </div>
              <div className="mt-0.5 text-[12px] text-text3">Verified</div>
            </div>
          </div>

          {serviceAreas.length > 0 && (
            <div className="mb-10">
              <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-text3">
                Areas covered
              </p>
              <div className="flex flex-wrap gap-2">
                {serviceAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-text2"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Properties grid ─────────────── */}
          {cards.length > 0 ? (
            <>
              <h2 className="font-display text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark mb-6">
                Properties by {agent.displayName}
              </h2>
              <Suspense
                fallback={
                  <PropertyGrid variant="standard">
                    {cards.map((card) => (
                      <PropertyCard key={card.id} {...card} />
                    ))}
                  </PropertyGrid>
                }
              >
                <PropertyBrowser
                  cards={cards}
                  emptyLabel={`properties from ${agent.displayName}`}
                />
              </Suspense>
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
          <InternalLinkRail
            title="Browse the whole market"
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
