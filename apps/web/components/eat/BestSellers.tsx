"use client";

import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, CalendarCheck } from "lucide-react";
import { isOpenNow } from "@/lib/listings/openingHours";

export type BestSeller = {
  name: string;
  priceKes: number;
  restaurant: string;
  menuSlug: string;
  /** Dish photo when the kitchen uploaded one, else the restaurant's. */
  photo: string;
  /** True when `photo` is the dish itself rather than the venue. */
  photoIsDish: boolean;
  openingHours?: string;
  isVerified: boolean;
  canBook: boolean;
  city: string;
};

/**
 * Best sellers — real dishes off live menus.
 *
 * Trust signals are limited to what can be evidenced: open right now
 * (computed in the browser against the reader's clock), the owner-verified
 * badge from the claim flow, and whether the kitchen takes bookings. There is
 * no review system, no coordinates and no delivery, so no rating, distance,
 * ETA or fee — inventing those would put a lie next to a real price.
 *
 * Images: only 2 of 162 menu items carry their own photo, so most cards fall
 * back to the restaurant's cover image. Those are venue shots as often as food
 * shots, so the card never captions the image as the dish.
 */
export function BestSellers({ items }: { items: BestSeller[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
      {items.map((d, i) => {
        const open = isOpenNow(d.openingHours);
        return (
          <article key={`${d.menuSlug}-${d.name}-${i}`} className="group">
            <Link href={`/m/${d.menuSlug}`} className="block">
              <div className="relative aspect-[4/3] rounded-[18px] overflow-hidden bg-surface2">
                {d.photo ? (
                  <Image
                    src={d.photo}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 300px"
                    className={`object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                      open === false ? "grayscale opacity-75" : ""
                    }`}
                  />
                ) : null}

                {open !== null && (
                  <span
                    className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      open ? "bg-white text-green" : "bg-dark/85 text-white"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        open ? "bg-green" : "bg-white/60"
                      }`}
                    />
                    {open ? "Open now" : "Closed"}
                  </span>
                )}

                {d.canBook && (
                  <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 text-dark text-[11px] font-extrabold">
                    <CalendarCheck className="size-3" />
                    Takes bookings
                  </span>
                )}
              </div>
            </Link>

            <div className="pt-3">
              <Link href={`/m/${d.menuSlug}`}>
                <h3 className="font-display text-[16px] font-extrabold text-text leading-[1.25] tracking-[-0.015em] group-hover:text-amber-700 transition-colors">
                  {d.name}
                </h3>
              </Link>

              <p className="flex items-center gap-1 text-[12.5px] text-text2 mt-0.5 truncate">
                <span className="truncate">{d.restaurant}</span>
                {d.isVerified && (
                  <BadgeCheck
                    className="size-3.5 text-amber-600 shrink-0"
                    aria-label="Verified restaurant"
                  />
                )}
              </p>

              <p className="font-display text-[17px] font-extrabold text-amber-700 mt-1.5 tabular-nums">
                KSh {d.priceKes.toLocaleString()}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
