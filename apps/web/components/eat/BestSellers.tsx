"use client";

import Link from "next/link";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { isOpenNow } from "@/lib/listings/openingHours";

export type BestSeller = {
  name: string;
  priceKes: number;
  restaurant: string;
  menuSlug: string;
  restaurantPhoto: string;
  openingHours?: string;
  isVerified: boolean;
  city: string;
};

/**
 * Best sellers — real dishes off live menus, with the trust signals we can
 * actually evidence.
 *
 * Deliberately NOT the signal set an aggregator shows. There is no review
 * system, so no rating; no coordinates on restaurant listings, so no distance;
 * no delivery, so no ETA or fee. Inventing any of them would be a lie printed
 * next to a price. What is real: the kitchen's own photo, whether it is open
 * right now, and whether the owner verified the listing through the claim flow.
 *
 * Open-now is computed in the browser against the reader's clock — a cached
 * page cannot answer it.
 */
export function BestSellers({ items }: { items: BestSeller[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
      {items.map((d, i) => {
        const open = isOpenNow(d.openingHours);
        return (
          <Link
            key={`${d.menuSlug}-${d.name}-${i}`}
            href={`/m/${d.menuSlug}`}
            className="group rounded-[20px] border border-border bg-white p-4 hover:border-amber hover:shadow-sm transition-all flex flex-col"
          >
            {/* Kitchen identity */}
            <div className="flex items-center gap-2.5 mb-3.5">
              <span className="relative size-9 rounded-full overflow-hidden bg-surface2 shrink-0">
                {d.restaurantPhoto ? (
                  <Image
                    src={d.restaurantPhoto}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : null}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-text truncate flex items-center gap-1">
                  {d.restaurant}
                  {d.isVerified && (
                    <BadgeCheck
                      className="size-3.5 text-amber-600 shrink-0"
                      aria-label="Verified restaurant"
                    />
                  )}
                </p>
                {open !== null && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      open ? "text-green" : "text-text3"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        open ? "bg-green" : "bg-text3"
                      }`}
                    />
                    {open ? "Open now" : "Closed"}
                  </span>
                )}
              </div>
            </div>

            {/* The dish */}
            <p className="font-display text-[16px] font-extrabold text-text leading-[1.25] tracking-[-0.015em] group-hover:text-amber-700 transition-colors">
              {d.name}
            </p>

            <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
              <span className="font-display text-[18px] font-extrabold text-amber-700 tabular-nums">
                KSh {d.priceKes.toLocaleString()}
              </span>
              <span className="text-[11px] font-semibold text-text3 truncate">
                {d.city}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
