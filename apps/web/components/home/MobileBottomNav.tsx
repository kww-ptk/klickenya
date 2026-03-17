"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, CalendarDays, Building2, BookOpen, Map } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "explore",     label: "Explore",     icon: Compass,      href: "/stays",                      match: ["/stays"] },
  { id: "events",      label: "Events",      icon: CalendarDays, href: "/events",                     match: ["/events"] },
  { id: "experiences", label: "Experiences", icon: Map,          href: "/stays?category=experiences", match: [] },
  { id: "property",    label: "Property",    icon: Building2,    href: "/real-estate",                match: ["/real-estate"] },
  { id: "journal",     label: "Journal",     icon: BookOpen,     href: "/journal",                    match: ["/journal"] },
] as const;

// Routes where the bottom nav should be hidden
const HIDDEN_ROUTES = ["/admin", "/studio", "/api"];

function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] md:hidden bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match.some((m) => pathname === m || pathname.startsWith(m + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive && "bg-purple-dim"
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-colors",
                  isActive ? "text-purple" : "text-text3"
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-purple" : "text-text3"
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
