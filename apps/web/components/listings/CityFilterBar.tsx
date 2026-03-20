"use client";

import { cn } from "@/lib/utils";

interface CityFilterBarProps {
  cities: { city: string; count: number }[];
  activeCity: string | null;
  onCityChange: (city: string | null) => void;
}

function CityFilterBar({ cities, activeCity, onCityChange }: CityFilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5 md:-mx-0 md:px-0 pb-1">
      {/* All pill */}
      <button
        onClick={() => onCityChange(null)}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
          activeCity === null
            ? "bg-amber text-dark font-bold"
            : "bg-surface text-text2 border border-border hover:bg-surface2"
        )}
      >
        All
      </button>

      {/* City pills */}
      {cities.map(({ city, count }) => (
        <button
          key={city}
          onClick={() => onCityChange(city)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
            activeCity === city
              ? "bg-amber text-dark font-bold"
              : "bg-surface text-text2 border border-border hover:bg-surface2"
          )}
        >
          {city} <span className="opacity-60">{count}</span>
        </button>
      ))}
    </div>
  );
}

export { CityFilterBar };
export type { CityFilterBarProps };
