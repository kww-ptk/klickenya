import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity/client";
import { BLOG_POSTS_BY_TAG_QUERY, ALL_BLOG_TAGS_QUERY } from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { PostCard } from "@/components/blog/PostCard";

export const revalidate = 3600;

/* ---------- Static params ---------- */

export async function generateStaticParams() {
  const tags: string[] = await sanityClient.fetch(ALL_BLOG_TAGS_QUERY);
  return tags.map((tag) => ({ tag }));
}

/* ---------- Metadata ---------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;

  const label = tag.charAt(0).toUpperCase() + tag.slice(1);

  return {
    title: `${label} Travel Articles — Klickenya`,
    description: `Browse our curated collection of ${label.toLowerCase()} travel articles covering the best of Kenya — tips, guides, and stories from Klickenya Journal.`,
  };
}

/* ---------- Page ---------- */

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  tags: string[];
  readingTime: number;
  publishedAt: string;
  coverImage: {
    asset: { _id: string; url: string };
    alt?: string;
  };
  author: {
    name: string;
    slug: { current: string };
    avatar?: { asset: { _id: string; url: string } };
  };
}

export default async function JournalTagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  if (!tag) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts: BlogPost[] = await sanityClient.fetch(BLOG_POSTS_BY_TAG_QUERY, {
    tag,
  } as any);

  const label = tag.charAt(0).toUpperCase() + tag.slice(1);

  return (
    <>
      <Nav transparent={false} />

      <main className="min-h-screen bg-surface pt-24 pb-20">
        {/* Breadcrumb */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-text3">
            <Link href="/" className="hover:text-amber transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/journal" className="hover:text-amber transition-colors">
              Journal
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-text font-medium">{label}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12">
          <h1 className="font-display text-[32px] sm:text-[40px] font-bold text-text tracking-[-0.02em] leading-[1.15] mb-4">
            Kenya {label} Articles
          </h1>

          {/* Active tag pill */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 text-amber px-3 py-1 text-[13px] font-semibold">
              {label}
            </span>
            <Link
              href="/journal"
              className="text-[13px] text-text3 hover:text-text transition-colors underline underline-offset-2"
            >
              Clear filter
            </Link>
          </div>
        </div>

        {/* Posts grid or empty state */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  slug={post.slug.current}
                  title={post.title}
                  excerpt={post.excerpt}
                  coverImage={
                    post.coverImage?.asset
                      ? urlForImage(post.coverImage).width(800).auto("format").url()
                      : "/images/placeholder.jpg"
                  }
                  category={label}
                  authorName={post.author?.name ?? "Klickenya"}
                  authorAvatar={
                    post.author?.avatar?.asset
                      ? urlForImage(post.author.avatar).width(64).auto("format").url()
                      : undefined
                  }
                  publishedAt={post.publishedAt}
                  readTimeMinutes={post.readingTime ?? 5}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-full bg-surface2 flex items-center justify-center mb-4">
                <svg
                  className="size-8 text-text3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </div>
              <h2 className="font-display text-[20px] font-bold text-text mb-2">
                No articles found
              </h2>
              <p className="text-[14px] text-text2 max-w-sm mb-6">
                We don&apos;t have any {label.toLowerCase()} articles yet. Check back soon or explore
                other topics.
              </p>
              <Link
                href="/journal"
                className="inline-flex items-center rounded-full bg-amber px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-amber/90 transition-colors"
              >
                Browse all articles
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
