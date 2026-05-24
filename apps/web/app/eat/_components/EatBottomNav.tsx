"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BarChart3, Inbox, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  href: string;
  label: string;
  Icon: typeof Building2;
}

const TABS: TabItem[] = [
  { href: "/eat/listings", label: "Restaurants", Icon: Building2 },
  { href: "/eat/stats", label: "Stats", Icon: BarChart3 },
  { href: "/eat/inbox", label: "Inbox", Icon: Inbox },
  { href: "/eat/settings", label: "Settings", Icon: Settings },
];

/**
 * Mobile-only 4-icon bar at the bottom of /eat/*. Mirrors DashboardBottomNav
 * but with the restaurant-only set.
 */
export function EatBottomNav({ enquiryCount = 0 }: { enquiryCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#16130C] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px] transition-colors",
                isActive && "bg-[#E8A020]/15",
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  isActive ? "text-[#E8A020]" : "text-white/50",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  isActive ? "text-[#E8A020]" : "text-white/50",
                )}
              >
                {label}
              </span>
              {href === "/eat/inbox" && enquiryCount > 0 && (
                <span className="absolute top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E8A020] text-[#16130C] text-[9px] font-bold flex items-center justify-center">
                  {enquiryCount > 99 ? "99+" : enquiryCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
