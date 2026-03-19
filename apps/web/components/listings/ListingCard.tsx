"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingType = "stay" | "experience" | "event" | "rental" | "service" | "restaurant";

interface ListingCardProps {
  id: string;
  title: string;
  city: string;
  price: number | null;
  priceUnit?: string;
  rating?: number;
  reviewCount?: number;
  type: ListingType;
  badge?: string;
  photos: string[];
  href: string;
}

function ListingCard({
  title,
  city,
  price,
  priceUnit,
  rating,
  reviewCount,
  type,
  badge,
  photos,
  href,
}: ListingCardProps) {
  const [saved, setSaved] = useState(false);

  const typeLabels: Record<ListingType, string> = {
    stay: "Stay",
    experience: "Experience",
    event: "Event",
    rental: "Rental",
    service: "Service",
    restaurant: "Restaurant",
  };

  return (
    <Link href={href} className="group block cursor-pointer">
      {/* ── MOBILE: horizontal compact card ── */}
      <div className="flex gap-3.5 sm:hidden">
        {/* Thumbnail */}
        <div
          className="relative w-[110px] h-[110px] shrink-0 rounded-[var(--radius-md)] overflow-hidden"
          style={!photos[0] ? { background: "linear-gradient(135deg, #6b2d8b 0%, #e8a020 100%)" } : undefined}
        >
          {photos[0] ? (
            <Image
              src={photos[0]}
              alt={title}
              fill
              className="object-cover"
              sizes="110px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30 text-[10px] font-bold tracking-wider">K</div>
          )}
          {badge && (
            <span
              className={cn(
                "absolute top-2 left-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-xs backdrop-blur-[8px]",
                badge === "New"
                  ? "bg-amber text-dark"
                  : "bg-white/95 text-text"
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
          <div>
            <p className="text-[14.5px] font-semibold text-text leading-[1.3] line-clamp-2">
              {title || "Untitled"}
            </p>
            <p className="mt-1 text-[12.5px] text-text2 line-clamp-1">
              {city || "Kenya"} · {typeLabels[type]}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-semibold">
              {price != null ? (
                <>
                  KSh {price.toLocaleString()}{" "}
                  <span className="text-text2 font-normal text-[12px]">/ {priceUnit || "night"}</span>
                </>
              ) : (
                <span className="text-text2 text-[12.5px]">Price on request</span>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              {rating != null && rating > 0 && (
                <span className="flex items-center gap-0.5 text-[12.5px] font-semibold">
                  <Star className="size-3 fill-amber text-amber" />
                  {rating.toFixed(1)}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSaved(!saved);
                }}
                className="size-7 rounded-full flex items-center justify-center bg-surface transition-all hover:scale-110"
                aria-label={saved ? "Remove from saved" : "Save listing"}
              >
                <Heart
                  className={cn("size-3.5", saved ? "fill-amber text-amber" : "text-text2")}
                  strokeWidth={2}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: vertical card (unchanged) ── */}
      <div className="hidden sm:block">
        {/* Photo area */}
        <div
          className="relative aspect-[1/0.85] rounded-[var(--radius-lg)] overflow-hidden"
          style={!photos[0] ? { background: "linear-gradient(135deg, #6b2d8b 0%, #e8a020 100%)" } : undefined}
        >
          {photos[0] ? (
            <Image
              src={photos[0]}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20 text-[24px] font-bold tracking-wider">K</div>
          )}

          {badge && (
            <span
              className={cn(
                "absolute top-3.5 left-3.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs backdrop-blur-[8px]",
                badge === "New"
                  ? "bg-amber text-dark"
                  : "bg-white/95 text-text"
              )}
            >
              {badge}
            </span>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSaved(!saved);
            }}
            className={cn(
              "absolute top-3 right-3 size-8 rounded-full flex items-center justify-center backdrop-blur-[8px] transition-all duration-200",
              "hover:scale-110",
              saved ? "bg-white/80" : "bg-white/22"
            )}
            aria-label={saved ? "Remove from saved" : "Save listing"}
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                saved ? "fill-amber text-amber" : "text-white"
              )}
              style={{
                filter: saved ? "none" : "drop-shadow(0 1px 3px rgba(0,0,0,0.3))",
              }}
              strokeWidth={2}
            />
          </button>

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
        <div className="pt-3.5 px-0.5">
          <div className="flex justify-between items-start gap-2">
            <p className="text-[14.5px] font-semibold text-text leading-[1.35] line-clamp-1 flex-1">
              {title || "Untitled"}
            </p>
            {rating != null && rating > 0 && (
              <span className="flex items-center gap-1 shrink-0 text-[13.5px] font-semibold">
                <Star className="size-3.5 fill-amber text-amber" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-text2">
            {city || "Kenya"}
            {reviewCount ? ` · ${reviewCount} reviews` : ""}
            {" · "}
            {typeLabels[type]}
          </p>
          <p className="mt-1.5 text-[14.5px] font-semibold">
            {price != null ? (
              <>
                KSh {price.toLocaleString()}{" "}
                <span className="text-text2 font-normal">/ {priceUnit || "night"}</span>
              </>
            ) : (
              <span className="text-text2">Price on request</span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

export { ListingCard };
export type { ListingCardProps };
