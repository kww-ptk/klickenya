"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Bike, ShoppingBag, CalendarDays } from "lucide-react";
import { isOpenNow } from "@/lib/listings/openingHours";

export type FoodCardData = {
  id: string;
  name: string;
  city: string;
  cuisine: string[];
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  photo: string;
  openingHours?: string;
  /** Canonical listing page. */
  href: string;
  /** Public menu — only set when the restaurant can actually take an order. */
  orderHref?: string;
  canOrder: boolean;
  canBook: boolean;
  canDeliver: boolean;
};

const PRICE_GLYPH: Record<string, string> = {
  budget: "$",
  "mid-range": "$$",
  "fine-dining": "$$$",
};

/**
 * A food card, not a marketplace listing card.
 *
 * Deliberately different from components/listings/ListingCard: no host avatar,
 * no listing-type badge, no save control. The job here is the same one an
 * ordering app does — what is it, is it open, can I order, how much — so
 * everything else is noise.
 */
export function FoodCard({ item }: { item: FoodCardData }) {
  const open = isOpenNow(item.openingHours);
  const price = item.priceRange ? PRICE_GLYPH[item.priceRange] : undefined;
  const primaryHref = item.canOrder && item.orderHref ? item.orderHref : item.href;

  return (
    <article className="group">
      <Link href={primaryHref} className="block">
        <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden bg-surface2">
          {item.photo ? (
            <Image
              src={item.photo}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
              className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                open === false ? "grayscale opacity-70" : ""
              }`}
            />
          ) : null}

          {open === false && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-3 py-1.5 rounded-full bg-dark/85 text-white text-[12px] font-bold">
                Closed right now
              </span>
            </div>
          )}

          {item.canDeliver && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber text-dark text-[11px] font-extrabold">
              <Bike className="size-3" />
              Delivery
            </span>
          )}
        </div>
      </Link>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={primaryHref}>
            <h3 className="font-display text-[16px] font-extrabold text-text tracking-[-0.02em] leading-[1.25] group-hover:text-amber-700 transition-colors">
              {item.name}
            </h3>
          </Link>
          {typeof item.rating === "number" && item.rating > 0 && (
            <span className="flex items-center gap-1 text-[13px] font-bold text-text shrink-0">
              <Star className="size-3.5 fill-amber text-amber" />
              {item.rating.toFixed(1)}
            </span>
          )}
        </div>

        {(item.cuisine.length > 0 || price) && (
          <p className="text-text2 text-[13px] mt-0.5 truncate">
            {[item.cuisine.slice(0, 2).join(", "), price].filter(Boolean).join(" · ")}
          </p>
        )}

        {(item.canOrder || item.canBook) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {item.canOrder && item.orderHref && (
              <Link
                href={item.orderHref}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber text-dark text-[12px] font-extrabold hover:bg-amber2 transition-colors"
              >
                <ShoppingBag className="size-3" />
                Order online
              </Link>
            )}
            {item.canBook && (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border text-text text-[12px] font-bold hover:border-amber transition-colors"
              >
                <CalendarDays className="size-3" />
                Book a table
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function FoodGrid({ items }: { items: FoodCardData[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
      {items.map((item) => (
        <FoodCard key={item.id} item={item} />
      ))}
    </div>
  );
}
