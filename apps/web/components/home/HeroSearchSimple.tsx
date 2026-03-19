"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/hooks/useSearch";
import { SearchDropdown } from "@/components/search/SearchDropdown";

/* ── Category quick-links ─────────────────────────── */

const CATEGORIES = [
  { label: "Stays", icon: "🏠", href: "/stays" },
  { label: "Experiences", icon: "🎒", href: "/experiences" },
  { label: "Events", icon: "🎟️", href: "/events" },
  { label: "Services", icon: "⭐", href: "/services" },
  { label: "Real Estate", icon: "🏢", href: "/real-estate" },
];

/* ── Component ────────────────────────────────────── */

function HeroSearchSimple() {
  const router = useRouter();
  const pillRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pillExpanded, setPillExpanded] = useState(false);

  // Exact same hook as the sticky nav bar
  const {
    query: pillQuery,
    setQuery: setPillQuery,
    results: pillResults,
    isLoading: pillLoading,
    isOpen: pillSearchOpen,
    setIsOpen: setPillSearchOpen,
    clear: pillClear,
  } = useSearch();

  // Close pill when clicking outside
  useEffect(() => {
    if (!pillExpanded) return;
    function handleClick(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setPillExpanded(false);
        pillClear();
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [pillExpanded, pillClear]);

  // Close on Escape
  useEffect(() => {
    if (!pillExpanded) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPillExpanded(false);
        pillClear();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [pillExpanded, pillClear]);

  // Auto-focus input when expanded
  useEffect(() => {
    if (pillExpanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pillExpanded]);

  const handlePillSearch = useCallback(() => {
    if (pillQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(pillQuery.trim())}`);
      setPillExpanded(false);
      pillClear();
    }
  }, [pillQuery, router, pillClear]);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* Category pills */}
      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-white/70 bg-white/8 border border-white/10 hover:bg-white/15 hover:text-white hover:border-white/20 transition-all duration-200"
          >
            <span className="mr-1.5">{cat.icon}</span>
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Search pill — identical to sticky nav bar */}
      <div
        ref={pillRef}
        className={cn(
          "relative flex items-center bg-white border border-border rounded-full py-2.5 pl-[22px] pr-2 shadow-sm transition-all duration-200 ease-out mx-auto",
          pillExpanded
            ? "max-w-[600px] shadow-lg"
            : "max-w-[420px] cursor-pointer hover:shadow-md"
        )}
        onClick={() => {
          if (!pillExpanded) setPillExpanded(true);
        }}
      >
        {pillExpanded ? (
          <>
            <Search className="size-4 text-text3 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={pillQuery}
              onChange={(e) => setPillQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePillSearch();
              }}
              placeholder="Search stays, experiences, destinations..."
              className="flex-1 text-[14px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
            />
            {pillQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pillClear();
                  inputRef.current?.focus();
                }}
                className="shrink-0 size-5 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors mr-1"
              >
                <X className="size-3 text-text3" />
              </button>
            )}
          </>
        ) : (
          <>
            <span className="flex-1 text-[14px] font-semibold text-text2">
              Anywhere
            </span>
            <span className="w-px h-4 bg-border mx-3" />
            <span className="text-[14px] font-semibold text-text2">
              Any time
            </span>
            <span className="w-px h-4 bg-border mx-3" />
            <span className="text-[14px] font-semibold text-text2">
              Any type
            </span>
          </>
        )}

        {/* Amber search button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (pillExpanded && pillQuery.trim()) {
              handlePillSearch();
            } else if (!pillExpanded) {
              setPillExpanded(true);
            }
          }}
          className="ml-2.5 size-9 rounded-full bg-amber flex items-center justify-center shrink-0 hover:shadow-md transition-shadow"
        >
          <Search className="size-4 text-white" strokeWidth={2.5} />
        </button>

        {/* Search dropdown — exact same as sticky nav */}
        {pillExpanded && (
          <SearchDropdown
            results={pillResults}
            isLoading={pillLoading}
            isOpen={pillSearchOpen}
            query={pillQuery}
            onClose={() => setPillSearchOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export { HeroSearchSimple };
