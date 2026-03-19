"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Compass } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const [exploreOpen, setExploreOpen] = useState(false);

  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useSearch();

  // Close explore dropdown on click outside
  useEffect(() => {
    if (!exploreOpen) return;
    function handleClick(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setExploreOpen(false);
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [exploreOpen]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      clear();
    }
  }, [query, router, clear]);

  return (
    <div className="w-full max-w-[680px] mx-auto">
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

      {/* Split search bar: Location | Explore */}
      <div className="relative">
        <div className="flex items-center bg-white rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.18)] p-1.5">
          {/* ── Location field ─────────────────── */}
          <div className="flex-1 flex items-center min-w-0 pl-4 pr-2">
            <div className="flex flex-col flex-1 min-w-0 py-1">
              <span className="text-[10px] font-bold text-text3 uppercase tracking-[0.06em] leading-none mb-1">
                Location
              </span>
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => {
                    setExploreOpen(false);
                    if (results) setIsOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Try 'Watamu' or 'Kilifi'..."
                  className="flex-1 text-[15px] text-text bg-transparent outline-none placeholder:text-text3/60 min-w-0"
                />
                {query && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clear();
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 size-5 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors"
                  >
                    <X className="size-3 text-text3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <span className="w-px h-8 bg-border shrink-0" />

          {/* ── Explore field ──────────────────── */}
          <div ref={exploreRef} className="relative shrink-0">
            <button
              onClick={() => {
                setIsOpen(false);
                setExploreOpen(!exploreOpen);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full hover:bg-surface transition-colors"
            >
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-text3 uppercase tracking-[0.06em] leading-none mb-1">
                  Explore
                </span>
                <span className="text-[15px] text-text2 whitespace-nowrap">
                  All categories
                </span>
              </div>
              <Compass className="size-4 text-text3" />
            </button>

            {/* Explore dropdown */}
            {exploreOpen && (
              <div
                className="absolute top-[calc(100%+12px)] right-0 z-[400] bg-white border border-border rounded-2xl shadow-2xl p-4 w-[220px]"
                style={{ animation: "searchDropdown 0.15s ease-out both" }}
              >
                <p className="text-[10px] font-bold text-text3 uppercase tracking-[0.06em] mb-2 px-1">
                  Categories
                </p>
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium text-text hover:bg-surface transition-colors"
                  >
                    <span className="text-[16px]">{cat.icon}</span>
                    {cat.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="shrink-0 size-11 rounded-full bg-amber flex items-center justify-center shadow-[0_4px_14px_rgba(232,160,32,0.35)] hover:shadow-[0_6px_20px_rgba(232,160,32,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <Search className="size-[18px] text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* Search dropdown — solid background, high z-index */}
        <div className="relative z-[350]">
          <SearchDropdown
            results={results}
            isLoading={isLoading}
            isOpen={isOpen}
            query={query}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

export { HeroSearchSimple };
