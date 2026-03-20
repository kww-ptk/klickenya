"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { Button } from "@/components/ui/Button";
import { SearchEngine, EXPLORE_CATEGORIES } from "@/components/search/SearchEngine";
import {
  SUBCATEGORIES_BY_TYPE,
  SUBCATEGORY_LABELS,
  SUBCATEGORY_ICONS,
} from "@/lib/constants/subcategories";

interface NavProps {
  transparent?: boolean;
}

const NAV_LINKS: Array<{ href: string; label: string; badge?: string }> = [
  { href: "/destinations", label: "Destinations" },
  { href: "/journal", label: "Journal" },
];

/* ── Explore hover menu (link-based, independent from SearchEngine) ── */

function ExploreHoverMenu({
  dropRef,
  triggerRef,
  onMouseEnter,
  onMouseLeave,
}: {
  dropRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    function update() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setPos({ left: 12, width: window.innerWidth - 24 });
      } else {
        const maxW = 720;
        const availRight = window.innerWidth - rect.left - 16;
        setPos({ left: rect.left, width: Math.min(maxW, availRight) });
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [triggerRef]);

  if (!pos) return null;

  return (
    <div
      ref={dropRef}
      className="fixed rounded-2xl border border-border shadow-2xl p-4 sm:p-6 animate-fade-in z-[250] max-h-[70vh] overflow-y-auto"
      style={{ top: 68, left: pos.left, width: pos.width, backgroundColor: "#ffffff" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5">
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
  );
}

function Nav({ transparent = false }: NavProps) {
  const scrolled = useScrollPosition(50);
  const [pastHero, setPastHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const exploreDropRef = useRef<HTMLDivElement>(null);
  const exploreTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  // On transparent pages (hero), delay search pill on mobile until past the hero
  useEffect(() => {
    if (!transparent) { setPastHero(true); return; }
    const handleScroll = () => {
      const vh = window.innerHeight;
      setPastHero(window.scrollY > vh * 0.75);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [transparent]);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setExploreOpen(false);
  }, [pathname]);

  // Close explore menu when clicking outside
  useEffect(() => {
    if (!exploreOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inTrigger = exploreRef.current?.contains(target);
      const inDrop = exploreDropRef.current?.contains(target);
      if (!inTrigger && !inDrop) {
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

  const solid = !transparent || scrolled;

  const handleExploreEnter = () => {
    clearTimeout(exploreTimeout.current);
    setExploreOpen(true);
  };
  const handleExploreLeave = () => {
    exploreTimeout.current = setTimeout(() => setExploreOpen(false), 200);
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

          {/* Search pill — SearchEngine nav variant */}
          <div
            className={cn(
              "flex-1 flex justify-center transition-all duration-300",
              solid
                ? // Desktop: show as soon as scrolled; Mobile: only after hero
                  pastHero
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "md:opacity-100 md:translate-y-0 md:pointer-events-auto opacity-0 -translate-y-1.5 pointer-events-none"
                : "opacity-0 -translate-y-1.5 pointer-events-none"
            )}
          >
            <SearchEngine variant="nav" />
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Explore trigger */}
            <div
              ref={exploreRef}
              onMouseEnter={handleExploreEnter}
              onMouseLeave={handleExploreLeave}
            >
              <button
                onClick={() => setExploreOpen(!exploreOpen)}
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
                    exploreOpen && "rotate-180"
                  )}
                />
              </button>
            </div>

            {/* Other nav links — hidden below xl to give pill room */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hidden xl:flex px-3.5 py-2 rounded-full text-[14px] font-medium transition-colors duration-200 items-center gap-1.5",
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

      {/* Explore hover menu — link-based, independent */}
      {exploreOpen && (
        <ExploreHoverMenu
          dropRef={exploreDropRef}
          triggerRef={exploreRef}
          onMouseEnter={handleExploreEnter}
          onMouseLeave={handleExploreLeave}
        />
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
