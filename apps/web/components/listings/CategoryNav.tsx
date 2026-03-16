"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  icon: string;
  label: string;
}

const CATEGORIES: Category[] = [
  { id: "all", icon: "✨", label: "All" },
  { id: "stays", icon: "🏠", label: "Stays" },
  { id: "safari", icon: "🦁", label: "Safari" },
  { id: "beach", icon: "🏖️", label: "Beach" },
  { id: "events", icon: "🎉", label: "Events" },
  { id: "rentals", icon: "🚗", label: "Rentals" },
  { id: "services", icon: "✂️", label: "Services" },
  { id: "mountain", icon: "⛰️", label: "Mountain" },
  { id: "lakeside", icon: "🌊", label: "Lakeside" },
  { id: "culture", icon: "🎨", label: "Culture" },
];

interface CategoryNavProps {
  onCategoryChange?: (categoryId: string) => void;
  onFiltersClick?: () => void;
  className?: string;
}

function CategoryNav({
  onCategoryChange,
  onFiltersClick,
  className,
}: CategoryNavProps) {
  const [active, setActive] = useState("all");

  const handleSelect = (id: string) => {
    setActive(id);
    onCategoryChange?.(id);
  };

  return (
    <div
      className={cn(
        "sticky top-[67px] z-[100] bg-white/97 backdrop-blur-[20px] border-b border-border",
        className
      )}
    >
      <div className="flex items-center gap-0 px-5 md:px-10 overflow-x-auto scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={cn(
              "shrink-0 flex flex-col items-center gap-[7px] px-5 py-3.5 border-b-2 transition-all duration-200 cursor-pointer min-w-[72px]",
              active === cat.id
                ? "border-amber opacity-100"
                : "border-transparent opacity-50 hover:opacity-[0.85]"
            )}
          >
            <span className="text-[22px] leading-none">{cat.icon}</span>
            <span
              className={cn(
                "text-[11.5px] font-semibold whitespace-nowrap transition-colors",
                active === cat.id ? "text-amber" : "text-text"
              )}
            >
              {cat.label}
            </span>
          </button>
        ))}

        {/* Filters button */}
        <button
          onClick={onFiltersClick}
          className="shrink-0 ml-auto flex items-center gap-[7px] px-4 py-2.5 rounded-[10px] border border-border text-[13px] font-semibold whitespace-nowrap transition-all duration-200 hover:shadow-sm hover:border-amber hover:text-amber"
        >
          <SlidersHorizontal className="size-[15px]" />
          Filters
        </button>
      </div>
    </div>
  );
}

export { CategoryNav };
