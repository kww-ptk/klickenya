import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthorBySlug } from "@/lib/profiles";
import { ProfileHero } from "@/components/profiles/ProfileHero";
import { PostCard } from "@/components/blog/PostCard";

/* ---------- Metadata ---------- */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) return { title: "Author not found" };

  return {
    title: `${author.name} — Klickenya Author`,
    description: author.bio ?? `${author.name} writes for Klickenya, Kenya's all-in-one booking platform.`,
  };
}

/* ---------- Page ---------- */

export default async function AuthorProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);

  if (!author) notFound();

  const posts = author.posts ?? [];
  const photoForHero = author.avatar ?? author.photo ?? null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <ProfileHero
        name={author.name}
        photo={photoForHero}
        bio={author.bio}
        website={author.website}
        instagram={author.instagram}
        facebook={author.facebook}
        twitter={author.twitter}
        badgeLabel={author.role ?? "Author"}
        badgeColor="blue"
        stats={[
          { label: "Articles", value: posts.length },
        ]}
        backHref="/journal"
        backLabel="Back to Journal"
      />

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto px-5 py-8">
        <h2 className="font-display text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-5">
          Articles by {author.name}
        </h2>

        {posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                slug={post.slug}
                title={post.title}
                excerpt={post.excerpt ?? ""}
                coverImage={post.coverImageUrl ?? ""}
                category=""
                authorName={author.name}
                authorAvatar={photoForHero?.asset?.url}
                publishedAt={post.publishedAt ?? ""}
                readTimeMinutes={post.readingTime ?? 5}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-10 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-[#16130C] mb-1">
              No articles yet
            </p>
            <p className="text-[13px] text-[#9C9485]">
              Articles by {author.name} will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
