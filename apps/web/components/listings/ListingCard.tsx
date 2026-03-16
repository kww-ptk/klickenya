"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingType = "stay" | "experience" | "event" | "rental" | "service";

interface ListingCardProps {
  id: string;
  title: string;
  city: string;
  price: number;
  priceUnit: string;
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
  };

  return (
    <Link href={href} className="group block cursor-pointer">
      {/* Photo area */}
      <div className="relative aspect-[1/0.85] rounded-[var(--radius-lg)] overflow-hidden bg-surface2">
        {photos[0] && (
          <Image
            src={photos[0]}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        )}

        {/* Badge */}
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

        {/* Heart / save */}
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

        {/* Hover dots */}
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
            {title}
          </p>
          {rating && (
            <span className="flex items-center gap-1 shrink-0 text-[13.5px] font-semibold">
              <Star className="size-3.5 fill-amber text-amber" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[13px] text-text2">
          {city}
          {reviewCount ? ` · ${reviewCount} reviews` : ""}
          {" · "}
          {typeLabels[type]}
        </p>
        <p className="mt-1.5 text-[14.5px] font-semibold">
          KSh {price.toLocaleString()}{" "}
          <span className="text-text2 font-normal">/ {priceUnit}</span>
        </p>
      </div>
    </Link>
  );
}

export { ListingCard };
export type { ListingCardProps };
