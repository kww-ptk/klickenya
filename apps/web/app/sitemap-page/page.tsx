import type { Metadata } from "next";
import Link from "next/link";
import { groq } from "next-sanity";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { sanityClient } from "@/lib/sanity/client";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Sitemap",
  description:
    "Browse all pages, listings, destinations, and articles on Klickenya — Kenya's marketplace for stays, experiences, and more.",
};

/* ── Types ───────────────────────────────────────── */

interface Destination {
  _id: string;
  name: string;
  slug: { current: string };
}

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  publishedAt: string;
}

interface Listing {
  _id: string;
  title: string;
  slug: { current: string };
  type: string;
  city: string;
}

interface Property {
  _id: string;
  title: string;
  slug: { current: string };
  city: string;
}

/* ── Queries ─────────────────────────────────────── */

const SITEMAP_DESTINATIONS = groq`
  *[_type == "destination"] | order(name asc) { _id, name, slug }
`;

const SITEMAP_POSTS = groq`
  *[_type == "blogPost" && status == "published"] | order(publishedAt desc) {
    _id, title, slug, publishedAt
  }
`;

const SITEMAP_LISTINGS = groq`
  *[_type == "listing" && status == "published" && (!defined(partner) || publishToMarketplace == true)] | order(type asc, title asc) {
    _id, title, slug, type, city
  }
`;

const SITEMAP_PROPERTIES = groq`
  *[_type == "property" && status == "available"] | order(title asc) {
    _id, title, slug, city
  }
`;

/* ── Helpers ─────────────────────────────────────── */

const TYPE_LABELS: Record<string, string> = {
  stays: "Stays",
  experiences: "Experiences",
  events: "Events",
  restaurants: "Restaurants",
  rentals: "Rentals",
  services: "Services",
};

function groupPostsByYear(posts: BlogPost[]) {
  const groups: Record<string, BlogPost[]> = {};
  for (const post of posts) {
    const year = post.publishedAt
      ? new Date(post.publishedAt).getFullYear().toString()
      : "Undated";
    if (!groups[year]) groups[year] = [];
    groups[year].push(post);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function groupListingsByType(listings: Listing[]) {
  const groups: Record<string, Listing[]> = {};
  for (const listing of listings) {
    const t = listing.type || "other";
    if (!groups[t]) groups[t] = [];
    groups[t].push(listing);
  }
  return groups;
}

function toSlug(str: string) {
  return encodeURIComponent(str.toLowerCase().replace(/\s+/g, "-"));
}

/* ── Static link data ────────────────────────────── */

const MAIN_PAGES = [
  { href: "/", label: "Home" },
  { href: "/stays", label: "Explore Stays" },
  { href: "/experiences", label: "Experiences" },
  { href: "/events", label: "Events" },
  { href: "/restaurants", label: "Restaurants" },
  { href: "/rentals", label: "Rentals" },
  { href: "/services", label: "Services" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/destinations", label: "Destinations" },
];

const COMPANY_PAGES = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/journal", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

const SUPPORT_PAGES = [
  { href: "/help", label: "Help Center" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

/* ── Page component ──────────────────────────────── */

export default async function SitemapPage() {
  const [destinations, posts, listings, properties] = await Promise.all([
    sanityClient
      .fetch<Destination[]>(SITEMAP_DESTINATIONS)
      .catch(() => [] as Destination[]),
    sanityClient
      .fetch<BlogPost[]>(SITEMAP_POSTS)
      .catch(() => [] as BlogPost[]),
    sanityClient
      .fetch<Listing[]>(SITEMAP_LISTINGS)
      .catch(() => [] as Listing[]),
    sanityClient
      .fetch<Property[]>(SITEMAP_PROPERTIES)
      .catch(() => [] as Property[]),
  ]);

  const listingGroups = groupListingsByType(listings);
  const postsByYear = groupPostsByYear(posts);

  return (
    <>
      <Nav />

      {/* ─── HERO ─────────────────────────────────────── */}
      <section className="pt-[68px]">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-16 md:py-24 text-center">
          <h1
            className="font-display font-bold text-zinc-900 tracking-[-0.04em] leading-[1.1] mb-4"
            style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
          >
            Sitemap
          </h1>
          <p
            className="text-zinc-500 max-w-[480px] mx-auto mb-6"
            style={{ fontSize: "clamp(15px, 1.8vw, 18px)" }}
          >
            Find everything on Klickenya at a glance
          </p>
          <Link
            href="/sitemap.xml"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
          >
            View XML sitemap
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* ─── STATIC PAGES ─────────────────────────────── */}
      <section className="bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20">
          <h2 className="font-display text-[clamp(20px,3vw,28px)] font-bold text-zinc-900 tracking-[-0.03em] mb-10">
            Pages
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            <StaticLinkGroup title="Main Pages" links={MAIN_PAGES} />
            <StaticLinkGroup title="Company" links={COMPANY_PAGES} />
            <StaticLinkGroup title="Support" links={SUPPORT_PAGES} />
          </div>
        </div>
      </section>

      {/* ─── DYNAMIC CONTENT ──────────────────────────── */}
      <section className="bg-white border-t border-zinc-200">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-14 md:py-20 space-y-16">
          {/* Destinations */}
          <DynamicSection
            title={`Destinations (${destinations.length})`}
          >
            {destinations.length > 0 ? (
              <ul className="space-y-2">
                {destinations.map((d) => (
                  <li key={d._id}>
                    <Link
                      href={`/destinations/${d.slug.current}`}
                      className="text-[14px] text-zinc-600 hover:text-amber-600 transition-colors"
                    >
                      {d.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-zinc-400 italic">Coming soon</p>
            )}
          </DynamicSection>

          {/* Blog Posts */}
          <DynamicSection
            title={`Blog Posts (${posts.length})`}
          >
            {posts.length > 0 ? (
              <div className="space-y-6">
                {postsByYear.map(([year, yearPosts]) => (
                  <div key={year}>
                    <h4 className="text-[12px] font-bold text-zinc-500 uppercase tracking-[0.04em] mb-2">
                      {year}
                    </h4>
                    <ul className="space-y-2">
                      {yearPosts.map((p) => (
                        <li key={p._id}>
                          <Link
                            href={`/journal/${p.slug.current}`}
                            className="text-[14px] text-zinc-600 hover:text-amber-600 transition-colors"
                          >
                            {p.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-zinc-400 italic">Coming soon</p>
            )}
          </DynamicSection>

          {/* Listings by Type */}
          {Object.keys(TYPE_LABELS).map((type) => {
            const group = listingGroups[type] || [];
            return (
              <DynamicSection
                key={type}
                title={`${TYPE_LABELS[type]} (${group.length})`}
              >
                {group.length > 0 ? (
                  <ul className="space-y-2">
                    {group.map((l) => (
                      <li key={l._id}>
                        <Link
                          href={`/${l.type}/${toSlug(l.city)}/${l.slug.current}`}
                          className="text-[14px] text-zinc-600 hover:text-amber-600 transition-colors"
                        >
                          {l.title}
                          {l.city && (
                            <span className="text-zinc-400 ml-1.5">
                              — {l.city}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-zinc-400 italic">
                    Coming soon
                  </p>
                )}
              </DynamicSection>
            );
          })}

          {/* Properties */}
          <DynamicSection
            title={`Properties (${properties.length})`}
          >
            {properties.length > 0 ? (
              <ul className="space-y-2">
                {properties.map((p) => (
                  <li key={p._id}>
                    <Link
                      href={`/real-estate/${p.slug.current}`}
                      className="text-[14px] text-zinc-600 hover:text-amber-600 transition-colors"
                    >
                      {p.title}
                      {p.city && (
                        <span className="text-zinc-400 ml-1.5">
                          — {p.city}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-zinc-400 italic">Coming soon</p>
            )}
          </DynamicSection>
        </div>
      </section>

      <Footer />
    </>
  );
}

/* ── Sub-components ──────────────────────────────── */

function StaticLinkGroup({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-bold text-amber-600 uppercase tracking-[0.04em] mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-[14px] text-zinc-600 hover:text-amber-600 transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DynamicSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-display text-[clamp(17px,2.5vw,22px)] font-bold text-zinc-900 tracking-[-0.02em] mb-5">
        {title}
      </h3>
      <div className="pl-5 border-l-2 border-amber-500/30">{children}</div>
    </div>
  );
}
