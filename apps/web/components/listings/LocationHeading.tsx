"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCityCounts } from "@/context/CityCountsContext";
import { cn } from "@/lib/utils";

interface LocationHeadingProps {
  type: string;
  subLabel: string;
  activeCity: string | null;
  count: number;
}

export function LocationHeading({ type, subLabel, activeCity, count }: LocationHeadingProps) {
  const cities = useCityCounts();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const locationLabel = activeCity
    ? activeCity.charAt(0).toUpperCase() + activeCity.slice(1)
    : "Kenya";

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(city: string | null) {
    setOpen(false);
    if (city) {
      router.push(`/${type}/${city.toLowerCase().replace(/\s+/g, "-")}`);
    } else {
      router.push(`/${type}`);
    }
  }

  return (
    <div className="mb-6">
      <h1 className="font-display text-[clamp(24px,3.5vw,40px)] font-extrabold tracking-[-0.03em] text-dark leading-tight">
        Pick your favourite{" "}
        <span className="text-[#9C9485] font-semibold text-[0.85em]">
          {subLabel.toLowerCase()}
        </span>{" "}
        in{" "}

        {/* Inline location trigger */}
        <span className="relative inline-block" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1 transition-all duration-200",
              "border-2 border-dashed",
              open
                ? "border-[#16130C] bg-[#16130C] text-white"
                : "border-[#C8C3BA] text-[#16130C] hover:border-[#16130C] hover:bg-[#F4F1EC]"
            )}
          >
            <span>{locationLabel}</span>
            <svg
              className={cn("w-4 h-4 transition-transform duration-200", open && "rotate-180")}
              viewBox="0 0 16 16" fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute left-0 top-full mt-2 z-50 min-w-[200px] rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
              {/* All Kenya */}
              <button
                onClick={() => navigate(null)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold hover:bg-surface transition-colors",
                  !activeCity ? "text-[#16130C] bg-surface" : "text-text2"
                )}
              >
                <span>🇰🇪 All Kenya</span>
                {!activeCity && <span className="text-[10px] bg-[#16130C] text-white rounded-full px-2 py-0.5">active</span>}
              </button>

              <div className="h-px bg-border mx-3" />

              {/* City list */}
              {cities.map(({ city, count: cityCount }) => {
                const slug = city.toLowerCase().replace(/\s+/g, "-");
                const isActive = activeCity === slug;
                return (
                  <button
                    key={city}
                    onClick={() => navigate(city)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-[14px] hover:bg-surface transition-colors",
                      isActive ? "font-bold text-[#16130C] bg-[#F4F1EC]" : "font-medium text-text2"
                    )}
                  >
                    <span>{city}</span>
                    <span className={cn(
                      "text-[11px] rounded-full px-2 py-0.5",
                      isActive ? "bg-[#16130C] text-white" : "bg-surface2 text-text2"
                    )}>
                      {cityCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </span>
      </h1>

      <p className="mt-2 text-[14px] text-text2">
        {count > 0
          ? `${count} listing${count !== 1 ? "s" : ""} in ${locationLabel}`
          : `No listings in ${locationLabel} yet`}
      </p>
    </div>
  );
}
