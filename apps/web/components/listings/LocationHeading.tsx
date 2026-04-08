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
    <div className="mb-8">
      {/* Main heading */}
      <h1 className="font-display font-extrabold tracking-[-0.03em] text-dark leading-[1.15] text-[clamp(32px,4.5vw,52px)]">
        {/* "Pick your" */}
        <span className="block text-[0.55em] font-semibold text-[#9C9485] tracking-[0.04em] uppercase mb-1">
          Find your perfect
        </span>

        {/* Category label in amber */}
        <span className="text-[#E8A020]">{subLabel}</span>
        {" "}

        {/* "in" */}
        <span className="text-dark">in</span>
        {" "}

        {/* Location dropdown trigger */}
        <span className="relative inline-block align-middle" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={`Filter by location, currently showing ${locationLabel}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl transition-all duration-200",
              "text-[clamp(32px,4.5vw,52px)] font-extrabold tracking-[-0.03em]",
              "px-4 py-1",
              open
                ? "bg-[#16130C] text-white shadow-lg"
                : "bg-[#FEF3DB] text-[#16130C] hover:bg-[#FDEAB8]",
              // Pulse ring only when closed (draws attention)
              !open && "ring-2 ring-[#E8A020] ring-offset-2 animate-pulse-ring"
            )}
          >
            <span>{locationLabel}</span>
            <svg
              className={cn(
                "transition-transform duration-200 shrink-0",
                "w-[0.7em] h-[0.7em]",
                open && "rotate-180"
              )}
              viewBox="0 0 16 16" fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute left-0 top-full mt-3 z-50 w-[220px] rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#9C9485]">
                  Choose a location
                </p>
              </div>

              {/* All Kenya */}
              <button
                onClick={() => navigate(null)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-[14px] font-semibold transition-colors hover:bg-[#FEF3DB]",
                  !activeCity ? "bg-[#FEF3DB] text-[#16130C]" : "text-text2"
                )}
              >
                <span className="flex items-center gap-2">
                  <span>🇰🇪</span> All Kenya
                </span>
                {!activeCity && (
                  <span className="text-[10px] bg-[#E8A020] text-white rounded-full px-2 py-0.5">✓</span>
                )}
              </button>

              <div className="h-px bg-border mx-4 my-1" />

              {/* City list */}
              {cities.map(({ city, count: cityCount }) => {
                const slug = city.toLowerCase().replace(/\s+/g, "-");
                const isActive = activeCity === slug;
                return (
                  <button
                    key={city}
                    onClick={() => navigate(city)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-[14px] transition-colors hover:bg-[#FEF3DB]",
                      isActive
                        ? "bg-[#FEF3DB] font-bold text-[#16130C]"
                        : "font-medium text-text2"
                    )}
                  >
                    <span>{city}</span>
                    <span className={cn(
                      "text-[11px] rounded-full px-2 py-0.5 tabular-nums",
                      isActive
                        ? "bg-[#E8A020] text-white"
                        : "bg-surface2 text-text2"
                    )}>
                      {cityCount}
                    </span>
                  </button>
                );
              })}

              <div className="h-3" />
            </div>
          )}
        </span>
      </h1>

      {/* Sub-line */}
      <p className="mt-3 text-[15px] text-text2">
        {count > 0
          ? `${count} listing${count !== 1 ? "s" : ""} in ${locationLabel}`
          : `No listings in ${locationLabel} yet — more coming soon`}
      </p>
    </div>
  );
}
