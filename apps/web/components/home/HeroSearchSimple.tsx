"use client";

import { useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
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
  const barRef = useRef<HTMLDivElement>(null);

  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useSearch();

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      clear();
    }
  }, [query, router, clear]);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* Category pills */}
      <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
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

      {/* Search bar */}
      <div ref={barRef} className="relative">
        <div className="flex items-center bg-white rounded-full shadow-lg pl-5 pr-2 py-2">
          <Search className="size-5 text-text3 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Search stays, experiences, destinations..."
            className="flex-1 text-[15px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
          />
          {query && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clear();
                inputRef.current?.focus();
              }}
              className="shrink-0 size-6 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors mr-1"
            >
              <X className="size-3.5 text-text3" />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="shrink-0 size-10 rounded-full bg-amber flex items-center justify-center hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ml-1"
          >
            <Search className="size-4.5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Dropdown rendered with fixed positioning via anchorRef */}
      <SearchDropdown
        results={results}
        isLoading={isLoading}
        isOpen={isOpen}
        query={query}
        onClose={() => setIsOpen(false)}
        anchorRef={barRef}
      />
    </div>
  );
}

export { HeroSearchSimple };
