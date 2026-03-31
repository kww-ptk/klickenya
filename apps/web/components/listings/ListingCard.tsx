"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Star, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";

type ListingType = "stay" | "experience" | "event" | "rental" | "service" | "restaurant" | "real_estate";

interface ListingCardProps {
  id: string;
  title: string;
  city?: string;
  price: number | null;
  priceUnit?: string;
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  type: ListingType;
  subcategory?: string;
  openingHours?: string;
  badge?: string;
  isVerified?: boolean;
  hostName?: string;
  hostPhotoUrl?: string;
  hostSlug?: string;
  photos: string[];
  href: string;
  initialSaved?: boolean;
}

/* ── Type badge config ─────────────────────────── */

type BadgeConfig = { emoji: string; label: string };

const TYPE_BADGES: Record<string, BadgeConfig> = {
  stay: { emoji: "🏠", label: "Stay" },
  restaurant: { emoji: "🍽️", label: "Restaurant" },
  event: { emoji: "🎟", label: "Event" },
};

const EXPERIENCE_SUB_BADGES: Record<string, BadgeConfig> = {
  safari: { emoji: "🦁", label: "Safari" },
  outdoor: { emoji: "🏄‍♀️", label: "Outdoor" },
  beaches: { emoji: "🏖️", label: "Beach" },
  cultural: { emoji: "🎭", label: "Cultural" },
  wellness: { emoji: "🧘", label: "Wellness" },
  family: { emoji: "👨‍👩‍👧", label: "Family" },
  restaurants: { emoji: "🍽️", label: "Restaurant" },
};

const SERVICE_SUB_BADGES: Record<string, BadgeConfig> = {
  fundis: { emoji: "🔧", label: "Fundi" },
  transfers: { emoji: "🚗", label: "Transfer" },
  private_chef: { emoji: "👨‍🍳", label: "Chef" },
};

function getTypeBadge(type: ListingType, subcategory?: string): BadgeConfig {
  if (type === "experience") {
    return EXPERIENCE_SUB_BADGES[subcategory ?? ""] ?? { emoji: "🌴", label: "Experience" };
  }
  if (type === "service") {
    return SERVICE_SUB_BADGES[subcategory ?? ""] ?? { emoji: "⭐", label: "Service" };
  }
  return TYPE_BADGES[type] ?? { emoji: "📍", label: "Listing" };
}

/* ── Open Now helper ───────────────────────────── */

function isCurrentlyOpen(openingHours: string): boolean | null {
  if (!openingHours) return null;
  const now = new Date();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = days[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const lines = openingHours.toLowerCase().split(/\n|;|,/).map((l) => l.trim());
  for (const line of lines) {
    if (!line.includes(today) && !line.includes("daily") && !line.includes("everyday") && !line.includes("every day")) continue;
    const timeMatch = line.match(/(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})[:\.]?(\d{2})?\s*(am|pm)?/i);
    if (!timeMatch) continue;
    let openH = parseInt(timeMatch[1]);
    const openM = parseInt(timeMatch[2] || "0");
    let closeH = parseInt(timeMatch[4]);
    const closeM = parseInt(timeMatch[5] || "0");
    if (timeMatch[3]?.toLowerCase() === "pm" && openH < 12) openH += 12;
    if (timeMatch[3]?.toLowerCase() === "am" && openH === 12) openH = 0;
    if (timeMatch[6]?.toLowerCase() === "pm" && closeH < 12) closeH += 12;
    if (timeMatch[6]?.toLowerCase() === "am" && closeH === 12) closeH = 0;
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    if (closeMin > openMin) {
      return currentMinutes >= openMin && currentMinutes < closeMin;
    }
    // Wraps midnight
    return currentMinutes >= openMin || currentMinutes < closeMin;
  }
  return null;
}

/* ── Price range display ──────────────────────── */

const PRICE_RANGE_MAP: Record<string, string> = {
  budget: "$ · Affordable",
  "mid-range": "$$ · Mid-range",
  "fine-dining": "$$$ · Fine dining",
};

/* ── Component ─────────────────────────────────── */

function ListingCard({
  id,
  title,
  city,
  price,
  priceUnit,
  priceRange,
  rating,
  reviewCount,
  type,
  subcategory,
  openingHours,
  badge,
  isVerified,
  hostName,
  hostPhotoUrl,
  hostSlug,
  photos,
  href,
  initialSaved = false,
}: ListingCardProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [toast, setToast] = useState<string | null>(null);
  const [openStatus, setOpenStatus] = useState<boolean | null>(null);
  const pathname = usePathname();

  const handleSaveToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = `/login?returnTo=${encodeURIComponent(pathname)}`;
      return;
    }

    const wasSaved = saved;
    setSaved(!wasSaved);

    const res = await fetch("/api/listings/save", {
      method: wasSaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sanityListingId: id }),
    });

    if (!res.ok) {
      setSaved(wasSaved);
    } else {
      setToast(wasSaved ? "Removed from saved" : "Saved to your profile");
      setTimeout(() => setToast(null), 2500);
    }
  }, [saved, id, pathname]);

  const typeBadge = getTypeBadge(type, subcategory);
  const hostInitials = hostName
    ? hostName.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : null;

  // Client-side open/closed for restaurants
  useEffect(() => {
    if (type === "restaurant" && openingHours) {
      setOpenStatus(isCurrentlyOpen(openingHours));
    }
  }, [type, openingHours]);

  const isFreeEvent = type === "event" && (price === null || price === 0);
  const ctaLabels: Record<ListingType, string> = {
    stay: "View stay",
    experience: "View experience",
    event: isFreeEvent ? "Join event" : "Get tickets",
    rental: "View rental",
    service: "View service",
    restaurant: "See restaurant",
    real_estate: "View property",
  };

  /* ── Price renderer ── */
  function renderPrice(size: "sm" | "md") {
    const textClass = size === "sm" ? "text-[13.5px]" : "text-[14.5px]";
    const unitClass = size === "sm" ? "text-text2 font-normal text-[12px]" : "text-text2 font-normal";

    // Restaurant: show price range
    if (type === "restaurant") {
      const rangeLabel = PRICE_RANGE_MAP[priceRange ?? ""];
      if (!rangeLabel) return null;
      return <span className={cn(textClass, "font-semibold text-text2")}>{rangeLabel}</span>;
    }

    // No price → hide
    if (price == null || price === 0) return null;

    switch (type) {
      case "event":
      case "service":
        return (
          <span className={cn(textClass, "font-semibold")}>
            From KSh {price.toLocaleString()}
          </span>
        );
      case "real_estate":
        return (
          <span className={cn(textClass, "font-semibold")}>
            KSh {price.toLocaleString()}
          </span>
        );
      case "experience":
        return (
          <span className={cn(textClass, "font-semibold")}>
            KSh {price.toLocaleString()}{" "}
            <span className={unitClass}>/ person</span>
          </span>
        );
      default:
        return (
          <span className={cn(textClass, "font-semibold")}>
            KSh {price.toLocaleString()}{" "}
            <span className={unitClass}>/ {priceUnit || "night"}</span>
          </span>
        );
    }
  }

  /* ── Subtitle line ── */
  const subcategoryLabel = subcategory ? SUBCATEGORY_LABELS[subcategory] : null;

  function renderSubtitle() {
    const parts: string[] = [];
    if (city) parts.push(city);
    if (subcategoryLabel) parts.push(subcategoryLabel);
    return parts.join(" · ");
  }

  const priceNode = renderPrice("sm");
  const priceMdNode = renderPrice("md");

  const toastElement = toast
    ? createPortal(
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto">
          <div className="flex items-center gap-2 rounded-full bg-[#16130C] px-4 py-2.5 shadow-lg border border-white/10">
            <Heart className="size-3.5 fill-amber text-amber shrink-0" />
            <span className="text-[13px] font-semibold text-white whitespace-nowrap">{toast}</span>
            <a href="/profile?tab=saved" className="text-[12px] font-semibold text-[#E8A020] hover:underline ml-1 whitespace-nowrap">
              View saved
            </a>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
    {toastElement}
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
            <img src="/klickenya-mark.svg" alt="" className="absolute inset-0 m-auto w-[40%] h-[40%] object-contain opacity-25" />
          )}
          {/* Type badge */}
          <span className="absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-xs backdrop-blur-[8px] bg-white/22 text-white">
            {typeBadge.emoji} {typeBadge.label}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              {(hostPhotoUrl || hostInitials) && (
                <div
                  className="relative size-5 rounded-full shrink-0 cursor-pointer"
                  onClick={(e) => { if (hostSlug) { e.preventDefault(); e.stopPropagation(); window.location.href = `/hosts/${hostSlug}`; } }}
                  title={hostName ? `Hosted by ${hostName}` : undefined}
                >
                  {hostPhotoUrl ? (
                    <Image src={`${hostPhotoUrl}?w=40&h=40&fit=crop&auto=format`} alt={hostName ?? ""} width={20} height={20} className="size-5 rounded-full object-cover" />
                  ) : (
                    <div className="size-5 rounded-full bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[7px] font-bold">
                      {hostInitials}
                    </div>
                  )}
                  {isVerified && (
                    <span className="absolute -bottom-px -right-px size-2.5 rounded-full bg-[#16A34A] border border-white flex items-center justify-center">
                      <Check className="size-1.5 text-white" strokeWidth={4} />
                    </span>
                  )}
                </div>
              )}
              <p className="text-[14.5px] font-semibold text-text leading-[1.3] line-clamp-1">
                {title || "Untitled"}
              </p>
            </div>
            <p className="mt-1 text-[12.5px] text-text2 line-clamp-1">
              {renderSubtitle()}
            </p>
            {/* Open Now badge (mobile) */}
            {type === "restaurant" && openStatus !== null && (
              <span className={cn(
                "inline-flex items-center gap-1 mt-1 text-[10px] font-semibold",
                openStatus ? "text-emerald-600" : "text-red-500"
              )}>
                <span className={cn("size-1.5 rounded-full", openStatus ? "bg-emerald-500" : "bg-red-400")} />
                {openStatus ? "Open now" : "Closed"}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            {priceNode && (
              <p className="text-[13.5px] font-semibold">{priceNode}</p>
            )}
            <div className="flex items-center gap-1.5">
              {rating != null && rating > 0 && (
                <span className="flex items-center gap-0.5 text-[12.5px] font-semibold">
                  <Star className="size-3 fill-amber text-amber" />
                  {rating.toFixed(1)}
                </span>
              )}
              <button
                onClick={handleSaveToggle}
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

      {/* ── DESKTOP: vertical card ── */}
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

          {/* Type badge (top-left) */}
          <span className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs backdrop-blur-[8px] bg-white/22 text-white">
            {typeBadge.emoji} {typeBadge.label}
          </span>
          <button
            onClick={handleSaveToggle}
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

          {/* Hover CTA */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
            <span className="inline-block rounded-full bg-white/95 backdrop-blur-[8px] px-4 py-1.5 text-[12px] font-bold text-dark shadow-sm">
              {ctaLabels[type]}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="pt-3.5 px-0.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(hostPhotoUrl || hostInitials) && (
                <div
                  className="relative size-6 rounded-full shrink-0 cursor-pointer"
                  onClick={(e) => { if (hostSlug) { e.preventDefault(); e.stopPropagation(); window.location.href = `/hosts/${hostSlug}`; } }}
                  title={hostName ? `Hosted by ${hostName}` : undefined}
                >
                  {hostPhotoUrl ? (
                    <Image src={`${hostPhotoUrl}?w=48&h=48&fit=crop&auto=format`} alt={hostName ?? ""} width={24} height={24} className="size-6 rounded-full object-cover" />
                  ) : (
                    <div className="size-6 rounded-full bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[8px] font-bold">
                      {hostInitials}
                    </div>
                  )}
                  {isVerified && (
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#16A34A] border-[1.5px] border-white flex items-center justify-center">
                      <Check className="size-2 text-white" strokeWidth={4} />
                    </span>
                  )}
                </div>
              )}
              <p className="text-[14.5px] font-semibold text-text leading-[1.35] line-clamp-1 flex-1">
                {title || "Untitled"}
              </p>
            </div>
            {rating != null && rating > 0 && (
              <span className="flex items-center gap-1 shrink-0 text-[13.5px] font-semibold">
                <Star className="size-3.5 fill-amber text-amber" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[13px] text-text2">
            <span>
              {renderSubtitle()}
            </span>
            {/* Open Now badge (desktop) */}
            {type === "restaurant" && openStatus !== null && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold",
                openStatus ? "text-emerald-600" : "text-red-500"
              )}>
                <span className={cn("size-1.5 rounded-full", openStatus ? "bg-emerald-500" : "bg-red-400")} />
                {openStatus ? "Open now" : "Closed"}
              </span>
            )}
          </div>
          {rating != null && rating > 0 && reviewCount != null && reviewCount > 0 && (
            <p className="mt-0.5 text-[12.5px] text-text2">
              ⭐ {rating.toFixed(1)} · {reviewCount} review{reviewCount !== 1 ? "s" : ""}
            </p>
          )}
          {priceMdNode && (
            <p className="mt-1.5">{priceMdNode}</p>
          )}
        </div>
      </div>
    </Link>
    </>
  );
}

export { ListingCard };
export type { ListingCardProps };
