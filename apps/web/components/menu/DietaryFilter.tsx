"use client";

import { useState } from "react";

const FILTER_OPTIONS = [
  { tag: "V",  label: "Vegetarian", bg: "bg-green-100",  text: "text-green-700",  activeBg: "bg-green-600",  activeText: "text-white" },
  { tag: "VG", label: "Vegan",      bg: "bg-green-100",  text: "text-green-800",  activeBg: "bg-green-700",  activeText: "text-white" },
  { tag: "GF", label: "Gluten-free",bg: "bg-amber-100",  text: "text-amber-700",  activeBg: "bg-amber-600",  activeText: "text-white" },
  { tag: "H",  label: "Halal",      bg: "bg-teal-100",   text: "text-teal-700",   activeBg: "bg-teal-600",   activeText: "text-white" },
  { tag: "S",  label: "Spicy",      bg: "bg-red-100",    text: "text-red-700",    activeBg: "bg-red-600",    activeText: "text-white" },
] as const;

interface DietaryFilterProps {
  availableTags: string[];
  activeTags: string[];
  onChange: (tags: string[]) => void;
}

export function DietaryFilter({ availableTags, activeTags, onChange }: DietaryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show filters that exist in the menu
  const visibleFilters = FILTER_OPTIONS.filter((f) => availableTags.includes(f.tag));
  if (visibleFilters.length === 0) return null;

  function toggle(tag: string) {
    if (activeTags.includes(tag)) {
      onChange(activeTags.filter((t) => t !== tag));
    } else {
      onChange([...activeTags, tag]);
    }
  }

  return (
    <div className="max-w-[480px] mx-auto px-4">
      <div className="py-3">
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-text2 hover:text-dark transition-colors"
        >
          <span className="text-[15px]">🍽</span>
          <span>Dietary filters</span>
          {activeTags.length > 0 && (
            <span className="inline-flex items-center justify-center size-[18px] rounded-full bg-amber text-[10px] font-bold text-dark">
              {activeTags.length}
            </span>
          )}
          <svg
            className={`size-3.5 text-text3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Filter pills */}
        {isOpen && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {visibleFilters.map((f) => {
              const isActive = activeTags.includes(f.tag);
              return (
                <button
                  key={f.tag}
                  onClick={() => toggle(f.tag)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    isActive
                      ? `${f.activeBg} ${f.activeText}`
                      : `${f.bg} ${f.text} hover:opacity-80`
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="rounded-full px-3 py-1.5 text-[12px] font-semibold text-text3 hover:text-dark transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
