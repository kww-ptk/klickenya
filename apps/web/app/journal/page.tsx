import { type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { BLOG_POSTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { Badge } from "@/components/ui/Badge";
import { JournalFilters } from "@/components/blog/JournalFilters";

export const revalidate = 3600;

/* ─── Types ──────────────────────────────────────── */

interface SanityBlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  tags?: string[];
  primaryCategory?: string;
  subcategory?: string;
  location?: string;
  series?: string;
  postType?: string;
  readingTime?: number;
  publishedAt: string;
  coverImage: {
    asset?: { _id: string; url: string; metadata?: { dimensions?: { width: number; height: number } } };
    alt?: string;
    hotspot?: unknown;
    crop?: unknown;
  } | null;
  author: {
    name: string;
    slug: { current: string };
    avatar?: { asset?: { _id: string; url: string } };
  } | null;
}

/* ─── Metadata ───────────────────────────────────── */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Kenya Travel Journal — Klickenya",
    description:
      "Expert travel guides, safari tips, beach getaways, and cultural insights for exploring Kenya. Plan your perfect Kenyan adventure with the Klickenya Journal.",
    openGraph: {
      title: "Kenya Travel Journal — Klickenya",
      description:
        "Expert travel guides, safari tips, beach getaways, and cultural insights for exploring Kenya.",
      siteName: "Klickenya",
      type: "website",
      locale: "en_KE",
    },
  };
}

/* ─── Data fetching ──────────────────────────────── */

async function getPosts(): Promise<SanityBlogPost[]> {
  const { data } = await sanityFetch({ query: BLOG_POSTS_QUERY }).catch(() => ({ data: [] }));
  return data as SanityBlogPost[];
}

/* ─── Helpers ────────────────────────────────────── */

function getCoverUrl(post: SanityBlogPost, width = 800): string {
  if (!post.coverImage?.asset) return "";
  try {
    return urlForImage(post.coverImage).width(width).auto("format").url();
  } catch {
    return post.coverImage.asset.url ?? "";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  destination_guide: "Guides",
  food_restaurants: "Food",
  where_to_stay: "Stays",
  safari_wildlife: "Safari",
  beaches_coast: "Beaches",
  travel_tips: "Tips",
  events_nightlife: "Nightlife",
  living_in_kenya: "Living Here",
};

/* ─── Page ───────────────────────────────────────── */

export default async function JournalPage() {
  const posts = await getPosts();
  const featuredPost = posts[0] ?? null;
  const gridPosts = posts.slice(1);

  /* JSON-LD */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Klickenya Journal",
    description:
      "Expert travel guides, safari tips, beach getaways, and cultural insights for exploring Kenya.",
    url: "https://klickenya.com/journal",
    publisher: {
      "@type": "Organization",
      name: "Klickenya",
      url: "https://klickenya.com",
    },
    ...(posts.length > 0 && {
      blogPost: posts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `https://klickenya.com/journal/${p.slug.current}`,
        datePublished: p.publishedAt,
        ...(p.author && { author: { "@type": "Person", name: p.author.name } }),
      })),
    }),
  };

  // Map posts for JournalFilters client component
  const filterPosts = gridPosts.map((p) => ({
    _id: p._id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    tags: p.tags,
    primaryCategory: p.primaryCategory,
    location: p.location,
    series: p.series,
    readingTime: p.readingTime,
    publishedAt: p.publishedAt,
    coverImageUrl: getCoverUrl(p),
    authorName: p.author?.name ?? "Klickenya",
    authorAvatar: p.author?.avatar?.asset?.url,
  }));

  return (
    <>
      <Nav transparent={false} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── HERO ──────────────────────────────────── */}
      <section className="bg-canvas pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 text-center">
          <div className="inline-block">
            <h1
              className="font-display font-bold text-text tracking-[-0.04em] leading-[1.08]"
              style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
            >
              Klickenya Journal
            </h1>
            <svg
              viewBox="0 0 120 8"
              className="mx-auto mt-3 w-[120px] h-[10px]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 6C20 2 40 2 60 4C80 6 100 3 118 2"
                stroke="#E8A020"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.6"
              />
            </svg>
          </div>

          <p className="max-w-[560px] mx-auto text-text2 leading-[1.7] mt-5" style={{ fontSize: "clamp(16px, 2vw, 18px)" }}>
            Travel guides, insider tips, and stories from across Kenya &mdash; from the savannahs of the Mara to the shores of Diani.
          </p>
        </div>
      </section>

      {/* ─── FEATURED POST ─────────────────────────── */}
      {featuredPost && (
        <section className="max-w-[1280px] mx-auto px-5 md:px-10 pb-14 md:pb-20">
          <Link
            href={`/journal/${featuredPost.slug.current}`}
            className="group relative block w-full rounded-[var(--radius-xl)] overflow-hidden min-h-[340px] md:min-h-0"
            style={{ aspectRatio: "16 / 9", maxHeight: "600px" }}
          >
            {getCoverUrl(featuredPost, 1200) ? (
              <Image
                src={getCoverUrl(featuredPost, 1200)}
                alt={featuredPost.title}
                fill
                priority
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                sizes="(max-width: 1280px) 100vw, 1280px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-surface to-border" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="amber">
                  {featuredPost.primaryCategory
                    ? (CATEGORY_LABELS[featuredPost.primaryCategory] ?? featuredPost.tags?.[0] ?? "Travel")
                    : (featuredPost.tags?.[0] ?? "Travel")}
                </Badge>
                {featuredPost.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    📍 {featuredPost.location.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                )}
              </div>

              <h2 className="font-display text-white font-bold tracking-[-0.03em] leading-[1.12] mb-3 max-w-[680px] line-clamp-2" style={{ fontSize: "clamp(24px, 3.5vw, 40px)" }}>
                {featuredPost.title}
              </h2>

              <p className="text-white/65 text-[15px] leading-[1.6] max-w-[560px] line-clamp-2 mb-5">
                {featuredPost.excerpt}
              </p>

              <div className="flex items-center gap-3">
                {featuredPost.author?.avatar?.asset?.url ? (
                  <Image
                    src={featuredPost.author.avatar.asset.url}
                    alt={featuredPost.author.name}
                    width={36}
                    height={36}
                    className="size-9 rounded-full object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="size-9 rounded-full bg-gradient-to-br from-amber to-teal flex items-center justify-center text-[12px] font-bold text-white border-2 border-white/20">
                    {featuredPost.author?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") ?? "K"}
                  </div>
                )}
                <div>
                  <p className="text-[13px] font-semibold text-white">
                    {featuredPost.author?.name ?? "Klickenya"}
                  </p>
                  <p className="text-[12px] text-white/50">
                    {formatDate(featuredPost.publishedAt)} &middot; {featuredPost.readingTime ?? 5} min read
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ─── FILTER + POST GRID ────────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <JournalFilters posts={filterPosts} />
        </div>
      </section>

      <Footer />
    </>
  );
}
