import Image from "next/image";
import Link from "next/link";
import { MapPin, Bed, Bath, Maximize, Images, Trees } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_BADGE_STYLES,
  CATEGORY_LABELS,
  LISTED_BY_BADGE_STYLES,
  LISTED_BY_LABELS,
  STATUS_LABELS,
  isPropertyCategory,
  isClosedStatus,
  propertyPath,
  type PropertyStatus,
} from "@/lib/real-estate/constants";
import {
  formatPrice,
  formatAcres,
  getReductionPercent,
  pluralize,
  priceSuffix,
} from "@/lib/real-estate/format";
import type { PropertyCardData } from "@/lib/real-estate/mappers";
import { SavePropertyButton } from "./SavePropertyButton";

interface PropertyCardProps extends PropertyCardData {
  large?: boolean;
  /** Set on the first card of the first grid so the LCP image preloads. */
  priority?: boolean;
}

function PropertyCard({
  id,
  title,
  slug,
  listingCategory,
  status,
  price,
  currency,
  priceType,
  previousPrice,
  isFeatured,
  isNewDevelopment,
  listedBy,
  bedrooms,
  bathrooms,
  sizeSqm,
  landSizeAcres,
  neighbourhood,
  city,
  coverPhoto,
  coverPhotoAlt,
  photoCount,
  large,
  priority,
}: PropertyCardProps) {
  const reduction = getReductionPercent(previousPrice, price);
  const suffix = priceSuffix(listingCategory, priceType);
  const closed = isClosedStatus(status);

  // The badge shows what the property IS (For Sale / For Rent). The previous
  // card keyed this off `status`, which only ever holds available/sold/let, so
  // every card rendered an identical grey "Available" pill.
  const categoryLabel = isPropertyCategory(listingCategory)
    ? CATEGORY_LABELS[listingCategory]
    : "For Sale";
  const categoryStyle = isPropertyCategory(listingCategory)
    ? CATEGORY_BADGE_STYLES[listingCategory]
    : CATEGORY_BADGE_STYLES["for-sale"];

  const isLand = listingCategory === "land";
  const acres = formatAcres(landSizeAcres);
  const hasSpecs = isLand
    ? Boolean(acres || sizeSqm)
    : Boolean(bedrooms || bathrooms || sizeSqm);

  return (
    <article className="group relative h-full">
      <Link
        href={propertyPath(slug)}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-[22px] border border-border bg-white transition-all duration-250",
          "hover:shadow-lg hover:-translate-y-1",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple2 focus-visible:ring-offset-2"
        )}
      >
        {/* Photo */}
        <div
          className={cn(
            "relative overflow-hidden bg-surface2",
            large ? "h-[320px]" : "h-[210px]"
          )}
        >
          {coverPhoto ? (
            <Image
              src={coverPhoto}
              alt={coverPhotoAlt || title}
              fill
              className={cn(
                "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]",
                closed && "grayscale-[0.55]"
              )}
              sizes={
                large
                  ? "(max-width: 768px) 100vw, 50vw"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              }
              priority={priority}
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-surface2 to-surface">
              <span className="text-[40px]" aria-hidden="true">
                🏠
              </span>
            </div>
          )}

          {/* Category + new-build badges. A sold or let property is not "For
              Sale" any more, so the category badge gives way to the status
              ribbon below; under offer keeps it, because it is still on the
              market until the sale completes. */}
          <div className="absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5 pr-14">
            {!closed && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-[8px]",
                  categoryStyle
                )}
              >
                {categoryLabel}
              </span>
            )}
            {isNewDevelopment && (
              <span className="rounded-full bg-blue-500/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-[8px]">
                Off-plan
              </span>
            )}
          </div>

          {/* Sold / Let / Under offer — the market state, not the category */}
          {(closed || status === "under-offer") && (
            <div className="absolute inset-0 flex items-center justify-center bg-dark/35">
              <span className="rounded-full bg-white px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-wide text-dark shadow-lg">
                {STATUS_LABELS[status as PropertyStatus] ?? status}
              </span>
            </div>
          )}

          {/* Photo count — replaces the three fake dots that never moved */}
          {photoCount > 1 && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-dark/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-[6px]">
              <Images className="size-3" />
              {photoCount}
            </span>
          )}

          {/* Who is selling. Owner-direct usually means no agent commission,
              which is the thing buyers scan a grid for. */}
          {listedBy && !closed && (
            <span
              className={cn(
                "absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-[6px]",
                LISTED_BY_BADGE_STYLES[listedBy]
              )}
            >
              {LISTED_BY_LABELS[listedBy]}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          {/* Price row */}
          <div className="mb-1.5 flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-bold tracking-[-0.02em] text-text",
                large ? "text-[26px]" : "text-[20px]"
              )}
            >
              {formatPrice(price, currency)}
            </span>
            {suffix && (
              <span className="text-[13px] font-normal text-text2">{suffix}</span>
            )}
            <span className="flex-1" />
            {reduction != null && reduction > 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-green/12 px-2 py-0.5 text-[11px] font-bold text-green">
                &darr;{reduction}% reduced
              </span>
            ) : isFeatured ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-bold text-amber">
                Featured
              </span>
            ) : null}
          </div>

          {/* Title */}
          <h3
            className={cn(
              "mb-1 line-clamp-2 font-semibold leading-[1.35] text-text",
              large ? "text-[17px]" : "text-[15px]"
            )}
          >
            {title}
          </h3>

          {/* Location */}
          <p className="mb-3 flex items-center gap-1 text-[13px] text-text3">
            <MapPin className="size-3 shrink-0" />
            <span className="line-clamp-1">
              {[neighbourhood, city].filter(Boolean).join(", ")}
            </span>
          </p>

          {/* Spec pills */}
          {hasSpecs && (
            <div className="mt-auto flex flex-wrap gap-1.5 border-t border-border pt-3">
              {isLand ? (
                <>
                  {acres && (
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text2">
                      <Trees className="size-3" />
                      {acres}
                    </span>
                  )}
                  {sizeSqm != null && sizeSqm > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text2">
                      <Maximize className="size-3" />
                      {sizeSqm.toLocaleString("en-KE")} m&sup2;
                    </span>
                  )}
                </>
              ) : (
                <>
                  {bedrooms != null && bedrooms > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text2">
                      <Bed className="size-3" />
                      {pluralize(bedrooms, "bed")}
                    </span>
                  )}
                  {bathrooms != null && bathrooms > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text2">
                      <Bath className="size-3" />
                      {pluralize(bathrooms, "bath")}
                    </span>
                  )}
                  {sizeSqm != null && sizeSqm > 0 && (
                    <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-text2">
                      <Maximize className="size-3" />
                      {sizeSqm.toLocaleString("en-KE")} m&sup2;
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Sibling of the link, not a child — so it is a real button that saves
          instead of a div that navigates. */}
      <SavePropertyButton
        propertyId={id}
        propertyTitle={title}
        className="absolute right-3 top-3 z-[2]"
      />
    </article>
  );
}

export { PropertyCard };
export type { PropertyCardProps };
