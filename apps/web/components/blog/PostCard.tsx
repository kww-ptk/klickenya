import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface PostCardProps {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  location?: string;
  authorName: string;
  authorAvatar?: string;
  publishedAt: string;
  readTimeMinutes: number;
}

function PostCard({
  slug,
  title,
  excerpt,
  coverImage,
  category,
  location,
  authorName,
  authorAvatar,
  publishedAt,
  readTimeMinutes,
}: PostCardProps) {
  const formattedDate = new Date(publishedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/journal/${slug}`} className="group block">
      {/* Cover image */}
      <div className="relative aspect-[16/9] rounded-[var(--radius-lg)] overflow-hidden bg-surface2 mb-4">
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Category + location chips */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="amber">
          {category}
        </Badge>
        {location && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E5848] bg-[#F4F1EC] px-2.5 py-1 rounded-full">
            📍 {location}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-display text-[20px] font-bold text-text tracking-[-0.02em] leading-[1.25] mb-2 group-hover:text-amber transition-colors line-clamp-2">
        {title}
      </h3>

      {/* Excerpt */}
      <p className="text-[14px] text-text2 leading-[1.65] line-clamp-2 mb-4">
        {excerpt}
      </p>

      {/* Author row */}
      <div className="flex items-center gap-3">
        {authorAvatar ? (
          <Image
            src={authorAvatar}
            alt={authorName}
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <div className="size-8 rounded-full bg-gradient-to-br from-amber to-teal flex items-center justify-center text-[12px] font-bold text-white">
            {authorName
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
        )}
        <div>
          <p className="text-[13px] font-semibold text-text">{authorName}</p>
          <p className="text-[12px] text-text3">
            {formattedDate} · {readTimeMinutes} min read
          </p>
        </div>
      </div>
    </Link>
  );
}

export { PostCard };
export type { PostCardProps };
