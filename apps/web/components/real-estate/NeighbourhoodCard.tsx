import Image from "next/image";
import Link from "next/link";

interface NeighbourhoodCardProps {
  name: string;
  slug: string;
  city: string;
  tagline?: string;
  avgPrice?: number;
  listingsCount?: number;
  imageUrl?: string;
}

function formatAvgPrice(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `KSh ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M avg`;
  }
  return `KSh ${price.toLocaleString()} avg`;
}

function NeighbourhoodCard({
  name,
  slug,
  city,
  tagline,
  avgPrice,
  listingsCount,
  imageUrl,
}: NeighbourhoodCardProps) {
  return (
    <Link
      href={`/real-estate/neighbourhood/${slug}`}
      className="relative rounded-[22px] overflow-hidden cursor-pointer aspect-[3/4] group block"
    >
      {/* Image */}
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-600 group-hover:scale-[1.06]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-90"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)",
        }}
      />

      {/* Explore button */}
      <span className="absolute top-3.5 right-3.5 px-3.5 py-1.5 rounded-full bg-white/12 backdrop-blur-[8px] border border-white/20 text-[12px] font-semibold text-white opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-250">
        Explore &rarr;
      </span>

      {/* Body */}
      <div className="absolute bottom-0 left-0 right-0 p-4.5">
        <h3 className="text-[18px] font-bold text-white tracking-[-0.02em] mb-1">
          {name}
        </h3>
        <p className="text-[12px] text-white/55 mb-2.5">
          {tagline || city}
        </p>

        {/* Stats pills */}
        <div className="flex gap-2.5">
          {listingsCount != null && listingsCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-[8px] text-[11px] font-semibold text-white/80">
              {listingsCount} listings
            </span>
          )}
          {avgPrice != null && avgPrice > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber/20 backdrop-blur-[8px] text-[11px] font-semibold text-amber">
              {formatAvgPrice(avgPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export { NeighbourhoodCard };
export type { NeighbourhoodCardProps };
