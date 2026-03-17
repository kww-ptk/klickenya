import { type Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import {
  BLOG_POST_BY_SLUG_QUERY,
  BLOG_POST_SLUGS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { PortableTextRenderer } from "@/components/blog/PortableTextRenderer";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { BlogPostClient, NewsletterForm, ShareButtons } from "@/components/blog/BlogPostClient";

/* ── ISR ────────────────────────────────────────────────────────── */
export const dynamic = 'force-static';
export const revalidate = 3600;

/* ── Type mapping for listing hrefs ─────────────────────────────── */
const TYPE_TO_PLURAL: Record<string, string> = {
  stay: "stays",
  experience: "experiences",
  event: "events",
  rental: "rentals",
  service: "services",
};

/* ── Static params ──────────────────────────────────────────────── */
export async function generateStaticParams() {
  const slugs: { slug: string }[] = await sanityClient.fetch(
    BLOG_POST_SLUGS_QUERY
  );
  return slugs.map((s) => ({ slug: s.slug }));
}

/* ── Metadata ───────────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await sanityClient.fetch(BLOG_POST_BY_SLUG_QUERY, { slug });

  if (!post) {
    return { title: "Post not found" };
  }

  const ogImage = post.coverImage
    ? urlForImage(post.coverImage).width(1200).height(630).url()
    : undefined;

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : undefined,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toISOString();
}

/* ── Page ────────────────────────────────────────────────────────── */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: post } = await sanityFetch({
    query: BLOG_POST_BY_SLUG_QUERY,
    params: { slug },
  });

  if (!post) {
    notFound();
  }

  const heroImageUrl = post.coverImage
    ? urlForImage(post.coverImage).width(1800).url()
    : "";

  const postUrl = `https://klickenya.com/journal/${post.slug.current}`;

  /* ── Extract TOC headings from body ─────────────────────────── */
  const tocItems: { id: string; text: string }[] = [];
  if (post.body) {
    let counter = 0;
    for (const block of post.body) {
      if (block._type === "block" && block.style === "h2") {
        counter++;
        const text =
          block.children
            ?.map((child: { text?: string }) => child.text || "")
            .join("") || "";
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        tocItems.push({ id, text });
      }
    }
  }

  /* ── JSON-LD ─────────────────────────────────────────────────── */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: heroImageUrl,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author?.name || "Klickenya",
    },
    publisher: {
      "@type": "Organization",
      name: "Klickenya",
      logo: {
        "@type": "ImageObject",
        url: "https://klickenya.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <BlogPostClient
        readingTime={post.readingTime || 5}
        title={post.title}
        url={postUrl}
      >
        {/* ── Nav ──────────────────────────────────────────────── */}
        <Nav transparent={false} />

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative w-full h-[88vh] min-h-[520px] overflow-hidden">
          {/* Cover image with Ken Burns */}
          {heroImageUrl && (
            <div className="absolute inset-0 animate-[kenBurns_20s_ease-out_forwards]">
              <Image
                src={heroImageUrl}
                alt={post.coverImage?.alt || post.title}
                fill
                priority
                className="object-cover"
                sizes="100vw"
                style={{
                  transform: "scale(1.04)",
                  animation: "kenBurns 1.2s ease-out forwards",
                }}
              />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          {/* Content at bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-5 md:px-10 pb-12 md:pb-16">
            <div className="max-w-[1280px] mx-auto">
              {/* Category chip */}
              {post.tags?.[0] && (
                <span className="inline-block bg-amber text-dark text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-1.5 rounded-full mb-4">
                  {post.tags[0]}
                </span>
              )}

              {/* Title */}
              <h1 className="font-display font-[800] text-[clamp(36px,5.5vw,72px)] leading-[1.05] tracking-[-0.03em] text-white max-w-[900px] mb-4">
                {post.title}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-[clamp(16px,1.8vw,20px)] italic text-white/65 max-w-[640px] leading-[1.5] mb-6">
                  {post.excerpt}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-[13px] text-white/60">
                {/* Author */}
                {post.author && (
                  <div className="flex items-center gap-2.5">
                    {post.author.avatar?.asset?.url ? (
                      <Image
                        src={post.author.avatar.asset.url}
                        alt={post.author.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover border-2 border-white/20"
                      />
                    ) : (
                      <div className="size-9 rounded-full bg-white/15 flex items-center justify-center text-white font-semibold text-[14px]">
                        {post.author.name?.[0] || "K"}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-white font-semibold text-[14px]">
                        {post.author.name}
                      </span>
                      {post.author.role && (
                        <span className="text-white/40 text-[12px]">
                          {post.author.role}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <span className="w-px h-4 bg-white/20 hidden sm:block" />

                {/* Date */}
                {post.publishedAt && (
                  <span className="hidden sm:inline">
                    {formatDate(post.publishedAt)}
                  </span>
                )}

                <span className="w-px h-4 bg-white/20 hidden sm:block" />

                {/* Reading time */}
                <span className="hidden sm:inline">
                  {post.readingTime || 5} min read
                </span>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-6 right-6 md:right-10 flex flex-col items-center gap-1.5 text-white/40 animate-[float_2.5s_ease-in-out_infinite]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.1em] font-medium">
              Scroll
            </span>
          </div>
        </section>

        {/* ── Article layout ───────────────────────────────────── */}
        <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-[72px]">
            {/* ── Main column ───────────────────────────────────── */}
            <article className="min-w-0">
              {/* Body content */}
              <div className="sr">
                <PortableTextRenderer value={post.body || []} className="" slug={post.slug?.current} />
              </div>

              {/* ── Share section ─────────────────────────────── */}
              <div className="mt-16 pt-10 border-t border-border sr">
                <p className="text-[13px] font-semibold text-text2 uppercase tracking-[0.05em] mb-4">
                  Share this article
                </p>
                <ShareButtons title={post.title} url={postUrl} />
              </div>

              {/* ── Author bio card ──────────────────────────── */}
              {post.author && (
                <div className="mt-10 p-6 md:p-8 bg-surface rounded-[22px] border border-border sr">
                  <div className="flex items-start gap-4">
                    {post.author.avatar?.asset?.url ? (
                      <Image
                        src={post.author.avatar.asset.url}
                        alt={post.author.name}
                        width={56}
                        height={56}
                        className="rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-14 rounded-full bg-amber/10 flex items-center justify-center text-amber font-bold text-[20px] shrink-0">
                        {post.author.name?.[0] || "K"}
                      </div>
                    )}
                    <div>
                      <p className="font-display font-bold text-[18px] text-text">
                        {post.author.name}
                      </p>
                      {post.author.role && (
                        <p className="text-[13px] text-text3 mb-2">
                          {post.author.role}
                        </p>
                      )}
                      {post.author.bio && (
                        <p className="text-[14px] text-text2 leading-[1.7]">
                          {post.author.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>

            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className="lg:sticky lg:top-[80px] lg:self-start space-y-6">
              {/* TOC card — hidden on mobile */}
              {tocItems.length > 0 && (
                <div className="hidden lg:block bg-surface rounded-[22px] border border-border p-6 sr-r">
                  <p className="text-[13px] font-bold text-text uppercase tracking-[0.05em] mb-4">
                    In this guide
                  </p>
                  <ul className="space-y-0">
                    {tocItems.map((item, i) => (
                      <li key={item.id}>
                        <a
                          href={`#${item.id}`}
                          className="toc-item group flex items-center gap-3 py-2 text-[14px] text-text2 hover:text-amber transition-colors duration-200"
                          data-section-id={item.id}
                        >
                          <span className="flex items-center justify-center size-6 rounded-full border border-border bg-white text-[11px] font-semibold text-text3 group-hover:border-amber group-hover:text-amber transition-colors duration-200">
                            {i + 1}
                          </span>
                          <span className="truncate">{item.text}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Related listings card */}
              {post.relatedListings && post.relatedListings.length > 0 && (
                <div className="bg-surface rounded-[22px] border border-border p-6 sr-r">
                  <p className="text-[13px] font-bold text-text uppercase tracking-[0.05em] mb-4">
                    Places in this guide
                  </p>
                  <div className="space-y-3">
                    {post.relatedListings.map(
                      (listing: {
                        _id: string;
                        title: string;
                        slug: { current: string };
                        type: string;
                        city: string;
                        price: number;
                        priceUnit?: string;
                        coverPhoto?: { asset?: { url?: string } };
                      }) => {
                        const typePlural =
                          TYPE_TO_PLURAL[listing.type] || listing.type;
                        const href = `/${typePlural}/${(listing.city || "nairobi").toLowerCase()}/${listing.slug.current}`;
                        const photoUrl =
                          listing.coverPhoto?.asset?.url || "";

                        return (
                          <Link
                            key={listing._id}
                            href={href}
                            className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white transition-colors duration-200"
                          >
                            {photoUrl ? (
                              <Image
                                src={photoUrl}
                                alt={listing.title}
                                width={54}
                                height={54}
                                className="rounded-lg object-cover shrink-0"
                                style={{ width: 54, height: 54 }}
                              />
                            ) : (
                              <div className="size-[54px] rounded-lg bg-border shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-amber">
                                {listing.type}
                              </span>
                              <p className="text-[14px] font-semibold text-text truncate leading-snug">
                                {listing.title}
                              </p>
                              <div className="flex items-center gap-2 text-[12px] text-text3">
                                <span>{listing.city}</span>
                                {listing.price != null && (
                                  <>
                                    <span className="text-border">|</span>
                                    <span className="font-semibold text-text2">
                                      KES{" "}
                                      {listing.price.toLocaleString()}
                                      {listing.priceUnit &&
                                        `/${listing.priceUnit}`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Newsletter card */}
              <div className="relative bg-dark rounded-[22px] border border-white/[0.06] p-6 overflow-hidden sr-r">
                {/* Amber glow */}
                <div className="absolute -top-12 -right-12 size-40 rounded-full bg-amber/15 blur-[60px] pointer-events-none" />

                <p className="relative font-display font-bold text-[18px] text-white mb-1.5">
                  Stay in the loop
                </p>
                <p className="relative text-[13px] text-white/40 mb-5 leading-[1.6]">
                  Get Kenya travel tips, new listings, and insider guides
                  straight to your inbox.
                </p>

                <NewsletterForm />
              </div>
            </aside>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <Footer />
      </BlogPostClient>

      {/* Ken Burns keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes kenBurns {
              from { transform: scale(1.04); }
              to { transform: scale(1); }
            }
          `,
        }}
      />
    </>
  );
}
