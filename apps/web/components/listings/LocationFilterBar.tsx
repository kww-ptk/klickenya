"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCityCounts } from "@/context/CityCountsContext";
import { cn } from "@/lib/utils";

interface LocationFilterBarProps {
  type: string;       // "stays" | "experiences" | ...
  activeCity?: string | null;
}

export function LocationFilterBar({ type, activeCity }: LocationFilterBarProps) {
  const cities = useCityCounts();
  const pathname = usePathname();

  if (!cities || cities.length === 0) return null;

  // Keep the existing subcategory / tag query params when changing city
  // (strip them — city navigation resets filters for simplicity)
  const allHref = `/${type}`;

  return (
    <div className="border-b border-border bg-white">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-4 md:px-10 py-2.5">
        <span className="shrink-0 text-[12px] font-semibold text-text2 uppercase tracking-wide mr-1">
          Location
        </span>

        {/* All */}
        <Link
          href={allHref}
          scroll={false}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap",
            !activeCity
              ? "bg-dark text-white"
              : "bg-surface text-text2 border border-border hover:bg-surface2"
          )}
        >
          All Kenya
        </Link>

        {/* City pills */}
        {cities.map(({ city, count }) => {
          const slug = city.toLowerCase().replace(/\s+/g, "-");
          const isActive = activeCity === slug;
          const href = `/${type}/${slug}`;

          return (
            <Link
              key={city}
              href={href}
              scroll={false}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors whitespace-nowrap",
                isActive
                  ? "bg-dark text-white"
                  : "bg-surface text-text2 border border-border hover:bg-surface2"
              )}
            >
              {city}
              {count > 0 && (
                <span className={cn("ml-1.5 text-[11px]", isActive ? "opacity-60" : "opacity-50")}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
