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
  const [expanded, setExpanded] = useState(false);

  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useSearch();

  // Close pill when clicking outside
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setExpanded(false);
        clear();
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [expanded, clear]);

  // Close on Escape
  useEffect(() => {
    if (!expanded) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setExpanded(false);
        clear();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [expanded, clear]);

  // Auto-focus input when expanded
  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [expanded]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setExpanded(false);
      clear();
    }
  }, [query, router, clear]);

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

      {/* Search pill — same as sticky nav bar */}
      <div
        ref={pillRef}
        className={cn(
          "relative flex items-center bg-white border border-border rounded-full py-2.5 pl-[22px] pr-2 shadow-sm transition-all duration-200 ease-out mx-auto",
          expanded
            ? "max-w-[600px] shadow-lg"
            : "max-w-[420px] cursor-pointer hover:shadow-md"
        )}
        onClick={() => {
          if (!expanded) setExpanded(true);
        }}
      >
        {expanded ? (
          /* ── Expanded: input mode ─────────── */
          <>
            <Search className="size-4 text-text3 shrink-0 mr-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search stays, experiences, destinations..."
              className="flex-1 text-[14px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
            />
            {query && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                  inputRef.current?.focus();
                }}
                className="shrink-0 size-5 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors mr-1"
              >
                <X className="size-3 text-text3" />
              </button>
            )}
          </>
        ) : (
          /* ── Collapsed: static labels ─────── */
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
            if (expanded && query.trim()) {
              handleSearch();
            } else if (!expanded) {
              setExpanded(true);
            }
          }}
          className="ml-2.5 size-9 rounded-full bg-amber flex items-center justify-center shrink-0 hover:shadow-md transition-shadow"
        >
          <Search className="size-4 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Search dropdown — fixed position */}
      <SearchDropdown
        results={results}
        isLoading={isLoading}
        isOpen={expanded && isOpen}
        query={query}
        onClose={() => setIsOpen(false)}
        anchorRef={pillRef}
      />
    </div>
  );
}

export { HeroSearchSimple };
