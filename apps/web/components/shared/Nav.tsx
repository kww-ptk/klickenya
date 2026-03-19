"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useSearch } from "@/hooks/useSearch";
import { SearchDropdown } from "@/components/search/SearchDropdown";
import { Button } from "@/components/ui/Button";
import {
  SUBCATEGORIES_BY_TYPE,
  SUBCATEGORY_LABELS,
  SUBCATEGORY_ICONS,
} from "@/lib/constants/subcategories";

interface NavProps {
  transparent?: boolean;
}

/* ── Mega-menu data ──────────────────────────── */

const EXPLORE_CATEGORIES = [
  { type: "stay", label: "Stays", icon: "🏠", href: "/stays" },
  { type: "experience", label: "Experiences", icon: "🎒", href: "/experiences" },
  { type: "event", label: "Events", icon: "🎟️", href: "/events" },
  { type: "service", label: "Services", icon: "⭐", href: "/services" },
  { type: "real_estate", label: "Real Estate", icon: "🏢", href: "/real-estate" },
];

const NAV_LINKS: Array<{ href: string; label: string; badge?: string }> = [
  { href: "/destinations", label: "Destinations" },
  { href: "/journal", label: "Journal" },
];

function Nav({ transparent = false }: NavProps) {
  const router = useRouter();
  const scrolled = useScrollPosition(50);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [pillExpanded, setPillExpanded] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaDropRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const pillInputRef = useRef<HTMLInputElement>(null);
  const megaTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  // Search hook for the pill
  const { query: pillQuery, setQuery: setPillQuery, results: pillResults, isLoading: pillLoading, isOpen: pillSearchOpen, setIsOpen: setPillSearchOpen, clear: pillClear } = useSearch();

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
    setPillExpanded(false);
    pillClear();
  }, [pathname, pillClear]);

  // Close mega menu when clicking outside (delayed to avoid same-click race)
  useEffect(() => {
    if (!megaOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = megaRef.current?.contains(target);
      const inDrop = megaDropRef.current?.contains(target);
      if (!inTrigger && !inDrop) {
        setMegaOpen(false);
      }
    }
    const id = requestAnimationFrame(() => {
      document.addEventListener("mousedown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [megaOpen]);

  const solid = !transparent || scrolled;

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

  // Close pill on Escape
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

  // Auto-focus input when pill expands
  useEffect(() => {
    if (pillExpanded) {
      setTimeout(() => pillInputRef.current?.focus(), 50);
    }
  }, [pillExpanded]);

  const handlePillSearch = useCallback(() => {
    if (pillQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(pillQuery.trim())}`);
      setPillExpanded(false);
      pillClear();
    }
  }, [pillQuery, router, pillClear]);

  const handleMegaEnter = () => {
    clearTimeout(megaTimeout.current);
    setMegaOpen(true);
  };
  const handleMegaLeave = () => {
    megaTimeout.current = setTimeout(() => setMegaOpen(false), 200);
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-[200] h-[68px] flex items-center px-5 md:px-10 transition-all duration-300 border-b",
          solid
            ? "bg-white/96 backdrop-blur-[24px] backdrop-saturate-[180%] border-border shadow-[0_1px_0_var(--color-border)]"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="w-full flex items-center justify-between gap-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo-profile.jpg"
              alt="Klickenya"
              width={36}
              height={36}
              className="size-9 rounded-[10px] object-cover shrink-0"
            />
            <span
              className={cn(
                "text-[17px] font-bold tracking-[-0.03em]",
                solid ? "text-text" : "text-white"
              )}
            >
              Klic<span className="text-amber">K</span>enya
            </span>
          </Link>

          {/* Condensed search pill — visible on scroll */}
          <div
            ref={pillRef}
            className={cn(
              "hidden md:flex relative items-center bg-white border border-border rounded-full py-2 pl-[18px] pr-2 shadow-sm transition-all duration-200 ease-out",
              pillExpanded
                ? "flex-1 max-w-[560px] shadow-md"
                : "flex-1 max-w-[340px] cursor-pointer hover:shadow-md",
              solid
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-1.5 pointer-events-none"
            )}
            onClick={() => {
              if (!pillExpanded) setPillExpanded(true);
            }}
          >
            {pillExpanded ? (
              /* ── Expanded: input mode ─────────── */
              <>
                <input
                  ref={pillInputRef}
                  type="text"
                  value={pillQuery}
                  onChange={(e) => setPillQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePillSearch();
                  }}
                  placeholder="Search stays, experiences, destinations..."
                  className="flex-1 text-[13px] text-text bg-transparent outline-none placeholder:text-text3 min-w-0"
                />
                {pillQuery && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pillClear();
                      pillInputRef.current?.focus();
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
                <span
                  className="flex-1 text-[13px] font-semibold text-text2 hover:text-text transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPillExpanded(true);
                  }}
                >
                  Anywhere
                </span>
                <span className="w-px h-4 bg-border mx-2.5" />
                <span
                  className="text-[13px] font-semibold text-text2 hover:text-text transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMegaOpen(true);
                  }}
                >
                  Any time
                </span>
                <span className="w-px h-4 bg-border mx-2.5" />
                <span
                  className="text-[13px] font-semibold text-text2 hover:text-text transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMegaOpen(true);
                  }}
                >
                  Any type
                </span>
              </>
            )}

            {/* Amber search button — always visible */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (pillExpanded && pillQuery.trim()) {
                  handlePillSearch();
                } else if (!pillExpanded) {
                  setPillExpanded(true);
                }
              }}
              className="ml-2 size-8 rounded-full bg-amber flex items-center justify-center shrink-0 hover:shadow-md transition-shadow"
            >
              <Search className="size-3.5 text-white" strokeWidth={2.5} />
            </button>

            {/* Search dropdown */}
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

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Explore trigger */}
            <div
              ref={megaRef}
              onMouseEnter={handleMegaEnter}
              onMouseLeave={handleMegaLeave}
            >
              <button
                onClick={() => setMegaOpen(!megaOpen)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200 flex items-center gap-1",
                  solid
                    ? "text-text2 hover:bg-surface hover:text-text"
                    : "text-white/80 hover:bg-white/12 hover:text-white"
                )}
              >
                Explore
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    megaOpen && "rotate-180"
                  )}
                />
              </button>
            </div>

            {/* Other nav links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200 flex items-center gap-1.5",
                  solid
                    ? "text-text2 hover:bg-surface hover:text-text"
                    : "text-white/80 hover:bg-white/12 hover:text-white"
                )}
              >
                {link.label}
                {link.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-amber/12 border border-amber/25 text-[10.5px] font-bold text-amber">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link href="/how-it-works">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "border",
                  solid
                    ? "border-border text-text hover:border-dark"
                    : "border-white/25 text-white/85 hover:bg-white/12 hover:border-white/40"
                )}
              >
                List your space
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className={cn(
                solid
                  ? "bg-dark text-white"
                  : "bg-white text-text"
              )}
            >
              Sign in
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={cn(
              "md:hidden flex size-9 items-center justify-center rounded-full border",
              solid ? "border-border text-text" : "border-white/30 text-white"
            )}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
        </div>
      </nav>

      {/* Mega menu — rendered outside nav to escape stacking context */}
      {megaOpen && (
        <div
          ref={megaDropRef}
          className="fixed left-1/2 -translate-x-1/2 w-[720px] rounded-2xl border border-border shadow-2xl p-6 animate-fade-in z-[250] hidden md:block"
          style={{ top: 68, backgroundColor: '#ffffff' }}
          onMouseEnter={handleMegaEnter}
          onMouseLeave={handleMegaLeave}
        >
          <div className="grid grid-cols-5 gap-5">
            {EXPLORE_CATEGORIES.map((cat) => {
              const subs = SUBCATEGORIES_BY_TYPE[cat.type] ?? [];
              return (
                <div key={cat.type}>
                  <Link
                    href={cat.href}
                    className="flex items-center gap-1.5 mb-3 group"
                  >
                    <span className="text-[18px]">{cat.icon}</span>
                    <span className="text-[13px] font-bold text-dark group-hover:text-amber transition-colors">
                      {cat.label}
                    </span>
                  </Link>
                  <div className="flex flex-col gap-1">
                    {subs.map((sub) => (
                      <Link
                        key={sub}
                        href={`${cat.href}?sub=${sub}`}
                        className="text-[12px] text-text2 hover:text-amber transition-colors py-0.5 flex items-center gap-1.5"
                      >
                        <span className="text-[12px]">
                          {SUBCATEGORY_ICONS[sub]}
                        </span>
                        {SUBCATEGORY_LABELS[sub] ?? sub}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[199] pt-[68px] bg-white md:hidden animate-fade-in overflow-y-auto">
          <div className="flex flex-col p-6 gap-1">
            {/* Categories with subcategories */}
            {EXPLORE_CATEGORIES.map((cat) => {
              const subs = SUBCATEGORIES_BY_TYPE[cat.type] ?? [];
              return (
                <div key={cat.type}>
                  <Link
                    href={cat.href}
                    className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    <span className="text-[18px]">{cat.icon}</span>
                    {cat.label}
                  </Link>
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {subs.map((sub) => (
                      <Link
                        key={sub}
                        href={`${cat.href}?sub=${sub}`}
                        className="text-[11.5px] text-text3 bg-surface px-2.5 py-1 rounded-full hover:bg-amber/10 hover:text-amber transition-colors"
                      >
                        {SUBCATEGORY_ICONS[sub]} {SUBCATEGORY_LABELS[sub] ?? sub}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            <hr className="my-3 border-border" />

            {/* Other links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text hover:bg-surface transition-colors flex items-center gap-2"
              >
                {link.label}
              </Link>
            ))}

            <hr className="my-3 border-border" />
            <Link
              href="/how-it-works"
              className="px-4 py-3 rounded-xl text-[16px] font-semibold text-text2 hover:bg-surface transition-colors"
            >
              List your space
            </Link>
            <div className="mt-4 pb-24">
              <Button variant="primary" size="lg" className="w-full">
                Sign in
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { Nav };
