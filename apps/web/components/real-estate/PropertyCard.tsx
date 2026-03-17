import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Bed, Bath, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  id: string;
  title: string;
  slug: string;
  listingCategory: string;
  propertyType?: string;
  status: string;
  price: number;
  priceType: string;
  previousPrice?: number;
  isFeatured?: boolean;
  isNewDevelopment?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  neighbourhood: string;
  city: string;
  coverPhoto?: string;
  large?: boolean;
}

const statusStyles: Record<string, string> = {
  "for-sale": "bg-purple2/88 text-white",
  "for-rent": "bg-green/88 text-white",
  land: "bg-amber/90 text-dark",
  "under-offer": "bg-dark/80 text-white",
};

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    const m = price / 1_000_000;
    return `KSh ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `KSh ${price.toLocaleString()}`;
}

function getReductionPercent(
  previous: number,
  current: number
): number | null {
  if (previous <= current) return null;
  return Math.round(((previous - current) / previous) * 100);
}

function PropertyCard({
  title,
  slug,
  status,
  price,
  priceType,
  previousPrice,
  isFeatured,
  isNewDevelopment,
  bedrooms,
  bathrooms,
  sizeSqm,
  neighbourhood,
  city,
  coverPhoto,
  large,
}: PropertyCardProps) {
  const reduction =
    previousPrice != null ? getReductionPercent(previousPrice, price) : null;

  return (
    <Link
      href={`/real-estate/${slug}`}
      className={cn(
        "group block border border-border rounded-[22px] overflow-hidden transition-all duration-250",
        "hover:shadow-lg hover:-translate-y-1"
      )}
    >
      {/* Photo */}
      <div
        className={cn(
          "relative overflow-hidden bg-surface2",
          large ? "h-[320px]" : "h-[210px]"
        )}
      >
        {coverPhoto && (
          <Image
            src={coverPhoto}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes={
              large
                ? "(max-width: 768px) 100vw, 50vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
          />
        )}

        {/* Status badge */}
        <span
          className={cn(
            "absolute top-3.5 left-3.5 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-[8px]",
            statusStyles[status] ?? "bg-dark/80 text-white"
          )}
        >
          {status
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>

        {/* New Development badge */}
        {isNewDevelopment && (
          <span className="absolute top-3.5 left-[calc(3.5rem+60px)] rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-[8px] bg-blue-500/88 text-white">
            New Development
          </span>
        )}

        {/* Heart button */}
        <div className="absolute top-3 right-3 size-8 rounded-full bg-white/22 backdrop-blur-[8px] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200">
          <Heart
            className="size-4 text-white"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}
          />
        </div>

        {/* Photo dots (visible on hover) */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "size-[5px] rounded-full",
                i === 0 ? "bg-white" : "bg-white/55"
              )}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 pt-4">
        {/* Price row */}
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span
            className={cn(
              "font-bold text-text tracking-[-0.02em]",
              large ? "text-[26px]" : "text-[20px]"
            )}
          >
            {formatPrice(price)}
          </span>
          {status === "for-rent" && (
            <span className="text-[13px] font-normal text-text2">/month</span>
          )}
          <span className="flex-1" />
          {reduction != null && reduction > 0 ? (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-green/12 text-[11px] font-bold text-green">
              &darr;{reduction}% reduced
            </span>
          ) : isFeatured ? (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber/15 text-[11px] font-bold text-amber">
              Popular
            </span>
          ) : null}
        </div>

        {/* Title */}
        <p
          className={cn(
            "font-semibold text-text leading-[1.35] mb-1 line-clamp-1",
            large ? "text-[17px]" : "text-[15px]"
          )}
        >
          {title}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1 text-[13px] text-text3 mb-3">
          <MapPin className="size-3 shrink-0" />
          <span className="line-clamp-1">
            {neighbourhood}, {city}
          </span>
        </div>

        {/* Spec pills */}
        {(bedrooms || bathrooms || sizeSqm) && (
          <div className="flex gap-1.5 flex-wrap pt-3 border-t border-border">
            {bedrooms != null && bedrooms > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border text-[12px] font-semibold text-text2">
                <Bed className="size-3" />
                {bedrooms} beds
              </span>
            )}
            {bathrooms != null && bathrooms > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border text-[12px] font-semibold text-text2">
                <Bath className="size-3" />
                {bathrooms} baths
              </span>
            )}
            {sizeSqm != null && sizeSqm > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border text-[12px] font-semibold text-text2">
                <Maximize className="size-3" />
                {sizeSqm.toLocaleString()} m&sup2;
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export { PropertyCard };
export type { PropertyCardProps };
