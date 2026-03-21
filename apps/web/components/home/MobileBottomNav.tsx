"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, Compass, CalendarDays, Star, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    id: "stays",
    label: "Stays",
    icon: Home,
    href: "/stays",
    match: ["/stays", "/"],
  },
  {
    id: "experiences",
    label: "Experiences",
    icon: Compass,
    href: "/experiences",
    match: ["/experiences"],
  },
  {
    id: "events",
    label: "Events",
    icon: CalendarDays,
    href: "/events",
    match: ["/events"],
  },
  {
    id: "services",
    label: "Services",
    icon: Star,
    href: "/services",
    match: ["/services", "/rentals", "/restaurants"],
  },
  {
    id: "real-estate",
    label: "Real Estate",
    icon: Building2,
    href: "/real-estate",
    match: ["/real-estate"],
  },
] as const;

// Routes where the bottom nav should be hidden
const HIDDEN_ROUTES = ["/admin", "/studio", "/api"];

// Pattern: /<type>/<city>/<slug> — listing detail pages have 3+ segments
function isListingDetail(path: string): boolean {
  const types = [
    "stays",
    "experiences",
    "events",
    "rentals",
    "services",
    "restaurants",
  ];
  const segments = path.split("/").filter(Boolean);
  return segments.length >= 3 && types.includes(segments[0]);
}

// Property detail pages: /real-estate/<category>/<city>/<slug>
function isPropertyDetail(path: string): boolean {
  const segments = path.split("/").filter(Boolean);
  return segments[0] === "real-estate" && segments.length >= 3;
}

function MobileBottomNav() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  const isHome = pathname === "/";

  // On homepage, hide until scrolled past the hero
  useEffect(() => {
    if (!isHome) { setVisible(true); return; }
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.85);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;
  if (isListingDetail(pathname)) return null;
  if (isPropertyDetail(pathname)) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[200] md:hidden bg-white border-t border-border pb-[env(safe-area-inset-bottom)] transition-transform duration-300",
        !visible && "translate-y-full"
      )}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.some(
            (m) => pathname === m || pathname.startsWith(m + "/")
          );
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive && "bg-amber/10"
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-colors",
                  isActive ? "text-amber" : "text-text3"
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-amber" : "text-text3"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export { MobileBottomNav };
