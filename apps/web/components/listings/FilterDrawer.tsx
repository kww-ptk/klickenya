"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { useCityCounts } from "@/context/CityCountsContext";
import {
  SUBCATEGORIES_BY_TYPE,
  SUBCATEGORY_LABELS,
  SUBCATEGORY_ICONS,
} from "@/lib/constants/subcategories";
import { cn } from "@/lib/utils";

const URL_TO_SANITY_TYPE: Record<string, string> = {
  stays: "stay",
  experiences: "experience",
  events: "event",
  rentals: "rental",
  services: "service",
  restaurants: "restaurant",
};

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function FilterDrawer({ open, onClose }: FilterDrawerProps) {
  const cities = useCityCounts();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const segments = pathname.split("/").filter(Boolean);
  const urlType = segments[0] ?? "";
  const currentCity = segments[1] ?? null;
  const sanityType = URL_TO_SANITY_TYPE[urlType] ?? "";
  const subcategories = SUBCATEGORIES_BY_TYPE[sanityType] ?? [];
  const activeSubcategory = searchParams.get("sub");

  function selectCity(city: string | null) {
    if (city) {
      router.push(`/${urlType}/${city.toLowerCase().replace(/\s+/g, "-")}`);
    } else {
      router.push(`/${urlType}`);
    }
    onClose();
  }

  function selectSubcategory(sub: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (sub) {
      params.set("sub", sub);
    } else {
      params.delete("sub");
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    onClose();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-[360px] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="text-[17px] font-bold text-dark">Filters</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface transition-colors"
          >
            <X className="size-5 text-text2" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* Location */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-text3 mb-3">
              Location
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => selectCity(null)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors border",
                  !currentCity
                    ? "bg-amber border-amber text-dark"
                    : "border-border text-text2 hover:border-amber hover:text-dark bg-white"
                )}
              >
                🇰🇪 All Kenya
              </button>
              {cities.map(({ city, count }) => {
                const slug = city.toLowerCase().replace(/\s+/g, "-");
                const isActive = currentCity === slug;
                return (
                  <button
                    key={city}
                    onClick={() => selectCity(city)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors border",
                      isActive
                        ? "bg-amber border-amber text-dark"
                        : "border-border text-text2 hover:border-amber hover:text-dark bg-white"
                    )}
                  >
                    {city}
                    <span className="ml-1.5 text-[11px] opacity-50">{count}</span>
                  </button>
                );
              })}

              {/* Fallback when no cities loaded yet */}
              {cities.length === 0 && (
                <p className="text-[13px] text-text3">No locations available yet.</p>
              )}
            </div>
          </section>

          {/* Subcategory — only on typed listing pages */}
          {subcategories.length > 0 && (
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-text3 mb-3">
                Category
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => selectSubcategory(null)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors border",
                    !activeSubcategory
                      ? "bg-amber border-amber text-dark"
                      : "border-border text-text2 hover:border-amber hover:text-dark bg-white"
                  )}
                >
                  ✨ All
                </button>
                {subcategories.map((sub) => {
                  const isActive = activeSubcategory === sub;
                  const icon = SUBCATEGORY_ICONS[sub];
                  const label = SUBCATEGORY_LABELS[sub] ?? sub;
                  return (
                    <button
                      key={sub}
                      onClick={() => selectSubcategory(sub)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors border",
                        isActive
                          ? "bg-amber border-amber text-dark"
                          : "border-border text-text2 hover:border-amber hover:text-dark bg-white"
                      )}
                    >
                      {icon && <span className="mr-1">{icon}</span>}
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
