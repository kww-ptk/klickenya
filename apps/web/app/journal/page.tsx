import { type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { sanityFetch } from "@/lib/sanity/client";
import { BLOG_POSTS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PostCard } from "@/components/blog/PostCard";
import { Badge } from "@/components/ui/Badge";

export const revalidate = 3600;

/* ─── Types ──────────────────────────────────────── */

interface SanityBlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  tags: string[];
  readingTime: number;
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

/* ─── Constants ──────────────────────────────────── */

const TAG_PILLS = [
  { label: "All", href: "/journal" },
  { label: "Safari", href: "/journal/category/safari" },
  { label: "Beach", href: "/journal/category/beach" },
  { label: "Nairobi", href: "/journal/category/nairobi" },
  { label: "Budget Travel", href: "/journal/category/budget-travel" },
  { label: "Luxury", href: "/journal/category/luxury" },
  { label: "Food & Culture", href: "/journal/category/food-culture" },
];

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
          {/* Title with amber swoosh */}
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
            className="group relative block w-full rounded-[var(--radius-xl)] overflow-hidden"
            style={{ aspectRatio: "16 / 9", maxHeight: "500px" }}
          >
            {/* Background image */}
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

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
              {/* Category badge */}
              {featuredPost.tags?.[0] && (
                <Badge variant="amber" className="mb-4">
                  {featuredPost.tags[0]}
                </Badge>
              )}

              <h2 className="font-display text-white font-bold tracking-[-0.03em] leading-[1.12] mb-3 max-w-[680px] line-clamp-2" style={{ fontSize: "clamp(24px, 3.5vw, 40px)" }}>
                {featuredPost.title}
              </h2>

              <p className="text-white/65 text-[15px] leading-[1.6] max-w-[560px] line-clamp-2 mb-5">
                {featuredPost.excerpt}
              </p>

              {/* Author row */}
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

      {/* ─── TAG FILTER + POST GRID ────────────────── */}
      <section className="bg-surface py-14 md:py-20">
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          {/* Tag filter pills */}
          <div className="flex flex-wrap gap-2.5 mb-10">
            {TAG_PILLS.map((tag) => (
              <Link
                key={tag.label}
                href={tag.href}
                className={`inline-flex items-center px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 ${
                  tag.label === "All"
                    ? "bg-text text-canvas"
                    : "bg-white text-text2 border border-border hover:border-amber hover:text-amber"
                }`}
              >
                {tag.label}
              </Link>
            ))}
          </div>

          {/* Posts grid */}
          {gridPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {gridPosts.map((post) => (
                <PostCard
                  key={post._id}
                  slug={post.slug.current}
                  title={post.title}
                  excerpt={post.excerpt}
                  coverImage={getCoverUrl(post)}
                  category={post.tags?.[0] ?? "Travel"}
                  authorName={post.author?.name ?? "Klickenya"}
                  authorAvatar={post.author?.avatar?.asset?.url}
                  publishedAt={post.publishedAt}
                  readTimeMinutes={post.readingTime ?? 5}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-text3 text-[15px]">
                No posts yet &mdash; check back soon for travel stories and guides.
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
