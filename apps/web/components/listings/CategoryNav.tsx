"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  icon: string;
  label: string;
  href: string;
}

const CATEGORIES: Category[] = [
  { id: "all", icon: "✨", label: "All", href: "/" },
  { id: "stays", icon: "🏠", label: "Stays", href: "/stays" },
  { id: "experiences", icon: "🎒", label: "Experiences", href: "/experiences" },
  { id: "events", icon: "🎟️", label: "Events", href: "/events" },
  { id: "services", icon: "⭐", label: "Services", href: "/services" },
  { id: "real-estate", icon: "🏢", label: "Real Estate", href: "/real-estate" },
];

// Map pathname to category id
function getActiveCategory(pathname: string): string {
  if (pathname === "/") return "all";
  if (pathname.startsWith("/rentals") || pathname.startsWith("/restaurants")) return "services";
  const match = CATEGORIES.find(
    (cat) => cat.href !== "/" && pathname.startsWith(cat.href)
  );
  return match?.id ?? "all";
}

interface CategoryNavProps {
  onCategoryChange?: (categoryId: string) => void;
  onFiltersClick?: () => void;
  className?: string;
}

function CategoryNav({
  onFiltersClick,
  className,
}: CategoryNavProps) {
  const pathname = usePathname();
  const active = getActiveCategory(pathname);

  /* ── Hide on scroll down, show on scroll up ── */
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      // Always show near the top
      if (currentY < 100) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        // Scrolling down
        setVisible(false);
      } else if (currentY < lastScrollY.current - 5) {
        // Scrolling up
        setVisible(true);
      }
      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-[67px] z-[100] bg-white/97 backdrop-blur-[20px] border-b border-border hidden md:block transition-transform duration-300",
        !visible && "-translate-y-full",
        className
      )}
    >
      <div className="relative">
        <div className="flex items-center gap-0 px-5 md:px-10 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = active === cat.id;
            return (
              <Link
                key={cat.id}
                href={cat.href}
                className={cn(
                  "shrink-0 flex flex-col items-center gap-[7px] px-5 py-3.5 border-b-2 transition-all duration-200 cursor-pointer min-w-[72px]",
                  isActive
                    ? "border-amber opacity-100"
                    : "border-transparent opacity-50 hover:opacity-[0.85]"
                )}
              >
                <span className="text-[22px] leading-none">{cat.icon}</span>
                <span
                  className={cn(
                    "text-[11.5px] font-semibold whitespace-nowrap transition-colors",
                    isActive ? "text-amber" : "text-text"
                  )}
                >
                  {cat.label}
                </span>
              </Link>
            );
          })}

          {/* Filters button */}
          <button
            onClick={onFiltersClick}
            className="shrink-0 ml-auto flex items-center gap-[7px] px-4 py-2.5 rounded-[10px] border border-border text-[13px] font-semibold whitespace-nowrap transition-all duration-200 hover:shadow-sm hover:border-amber hover:text-amber"
          >
            <SlidersHorizontal className="size-[15px]" />
            Filters
          </button>
        </div>

        {/* Scroll fade indicator (mobile only) */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden" />
      </div>
    </div>
  );
}

export { CategoryNav };
