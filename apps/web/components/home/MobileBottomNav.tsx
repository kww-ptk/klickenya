"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, CalendarDays, Building2, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "explore", label: "Explore", icon: Compass, href: "/stays" },
  { id: "events", label: "Events", icon: CalendarDays, href: "/events" },
  { id: "property", label: "Property", icon: Building2, href: "/property" },
  { id: "journal", label: "Journal", icon: BookOpen, href: "/journal" },
  { id: "profile", label: "Profile", icon: User, href: "/profile" },
] as const;

function MobileBottomNav() {
  const [active, setActive] = useState("explore");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[200] md:hidden bg-white border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setActive(item.id)}
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
