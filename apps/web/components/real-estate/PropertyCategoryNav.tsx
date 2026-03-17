"use client";

import { useState } from "react";
import { Map, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyCategoryNavProps {
  activeCategory?: string;
  onCategoryChange?: (id: string) => void;
}

const categories = [
  { id: "all", icon: "\u2728", label: "All" },
  { id: "for-sale", icon: "\uD83C\uDFE0", label: "For Sale" },
  { id: "for-rent", icon: "\uD83D\uDD11", label: "For Rent" },
  { id: "land", icon: "\uD83C\uDF0D", label: "Land" },
  { id: "commercial", icon: "\uD83C\uDFE2", label: "Commercial" },
  { id: "new-builds", icon: "\uD83C\uDFD7", label: "New Builds" },
  { id: "luxury", icon: "\uD83D\uDC8E", label: "Luxury" },
  { id: "student", icon: "\uD83C\uDF93", label: "Student" },
];

function PropertyCategoryNav({
  activeCategory: controlledCategory,
  onCategoryChange,
}: PropertyCategoryNavProps) {
  const [internalCategory, setInternalCategory] = useState("all");
  const active = controlledCategory ?? internalCategory;

  function handleSelect(id: string) {
    setInternalCategory(id);
    onCategoryChange?.(id);
  }

  return (
    <div className="sticky top-[65px] z-[200] bg-white/97 backdrop-blur-[20px] border-b border-border">
      <div className="flex items-stretch overflow-x-auto scrollbar-none">
        {/* Category tabs */}
        <div className="flex items-stretch">
          {categories.map((cat) => {
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleSelect(cat.id)}
                className={cn(
                  "shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 border-b-2 min-w-[80px] cursor-pointer transition-all duration-200",
                  isActive
                    ? "border-purple2 opacity-100"
                    : "border-transparent opacity-50 hover:opacity-85"
                )}
              >
                <span className="text-[20px] leading-none">{cat.icon}</span>
                <span
                  className={cn(
                    "text-[12px] font-semibold whitespace-nowrap",
                    isActive ? "text-purple2" : "text-text2"
                  )}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right section: sort + map */}
        <div className="ml-auto shrink-0 flex items-center gap-2.5 pl-5 border-l border-border pr-4">
          <div className="relative">
            <select className="appearance-none px-3 py-2 pr-7 rounded-[10px] border border-border text-[13px] font-semibold text-text2 bg-transparent cursor-pointer focus:outline-none focus:border-purple2">
              <option>Newest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Most Popular</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-text3 pointer-events-none" />
          </div>

          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-border text-[13px] font-semibold text-text2 hover:border-purple2 hover:text-purple2 transition-colors duration-200 whitespace-nowrap">
            <Map className="size-4" />
            Map view
          </button>
        </div>
      </div>
    </div>
  );
}

export { PropertyCategoryNav };
export type { PropertyCategoryNavProps };
