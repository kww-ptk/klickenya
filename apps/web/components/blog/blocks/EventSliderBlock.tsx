"use client";

import { useState } from "react";
import Link from "next/link";
import { EventCard } from "@/components/home/EventCard";
import { mapSanityEventToCard } from "@/lib/mappers/eventMapper";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EventSliderBlock({ value }: { value: any }) {
  const { heading = "Upcoming events", events, ctaText, ctaLink } = value;
  const [activeFilter, setActiveFilter] = useState("all");

  if (!events || events.length === 0) return null;

  // Build dynamic filters from the events data
  const filters = new Map<string, string>();
  filters.set("all", "All");
  for (const e of events) {
    if (e.subcategory && !filters.has(e.subcategory)) {
      const label = e.subcategory.charAt(0).toUpperCase() + e.subcategory.slice(1).replace(/_/g, " ");
      filters.set(e.subcategory, label);
    }
    if (e.city && !filters.has(`city:${e.city}`)) {
      filters.set(`city:${e.city}`, e.city);
    }
  }

  // Filter events
  const filtered = activeFilter === "all"
    ? events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : events.filter((e: any) => {
        if (activeFilter.startsWith("city:")) {
          return e.city === activeFilter.replace("city:", "");
        }
        return e.subcategory === activeFilter;
      });

  const cards = filtered.map(mapSanityEventToCard);

  return (
    <div className="my-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[20px] font-bold text-dark">
          {heading}
        </h3>
        {ctaText && ctaLink && (
          <Link
            href={ctaLink}
            className="text-[13px] font-semibold text-amber hover:underline shrink-0"
          >
            {ctaText}
          </Link>
        )}
      </div>

      {/* Filter pills — only show if more than 1 filter */}
      {filters.size > 2 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4 pb-1">
          {Array.from(filters).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150 ${
                activeFilter === key
                  ? "bg-amber text-dark"
                  : "bg-surface text-text2 hover:bg-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-1 px-1">
        {cards.map((card: ReturnType<typeof mapSanityEventToCard>, i: number) => (
          <EventCard key={`${activeFilter}-${i}`} {...card} />
        ))}
      </div>
    </div>
  );
}
