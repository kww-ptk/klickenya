"use client";

import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = ["Stays", "Experiences", "Events", "Rentals", "Services"] as const;

function HeroSearch() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Stays");

  return (
    <div className="w-full max-w-[820px] mx-auto">
      {/* Tabs */}
      <div className="flex items-center justify-center gap-1 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 rounded-full text-[13.5px] font-semibold transition-all duration-200 cursor-pointer",
              activeTab === tab
                ? "bg-purple text-white shadow-[0_2px_12px_rgba(107,45,139,0.35)]"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-[32px] shadow-lg p-2 flex items-center">
        <div className="flex flex-1 items-center divide-x divide-border">
          {/* Location */}
          <button className="flex-1 flex flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0">
            <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
              Location
            </span>
            <span className="text-[14px] text-text2 truncate w-full text-left">
              Anywhere in Kenya
            </span>
          </button>

          {/* Check in */}
          <button className="hidden md:flex flex-1 flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0">
            <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
              Check in
            </span>
            <span className="text-[14px] text-text2 truncate w-full text-left">
              Add date
            </span>
          </button>

          {/* Check out */}
          <button className="hidden md:flex flex-1 flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0">
            <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
              Check out
            </span>
            <span className="text-[14px] text-text2 truncate w-full text-left">
              Add date
            </span>
          </button>

          {/* Guests */}
          <button className="hidden md:flex flex-1 flex-col items-start px-5 py-2 rounded-full hover:bg-surface transition-colors cursor-pointer min-w-0">
            <span className="text-[11px] font-bold text-text uppercase tracking-[0.04em]">
              Guests
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-text2">Add guests</span>
              <ChevronDown className="size-3.5 text-text3" />
            </div>
          </button>
        </div>

        {/* Search button */}
        <button className="shrink-0 size-12 rounded-full bg-amber flex items-center justify-center shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer ml-1">
          <Search className="size-5 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

export { HeroSearch };
