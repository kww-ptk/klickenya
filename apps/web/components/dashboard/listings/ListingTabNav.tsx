"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TabItem {
  label: string;
  href: string;
  badge?: number | string;
}

interface ListingTabNavProps {
  listingId: string;
  tabs: TabItem[];
}

export function ListingTabNav({ listingId, tabs }: ListingTabNavProps) {
  const pathname = usePathname();

  // Active detection: exact match for overview (no trailing segment),
  // prefix match for sub-routes.
  const overviewHref = `/dashboard/listings/${listingId}`;

  function isActive(href: string): boolean {
    if (href === overviewHref) {
      // Overview is active only when exactly on /dashboard/listings/[id]
      return pathname === overviewHref;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`
              shrink-0 flex items-center gap-1.5 h-[34px] px-4 rounded-full text-[13px] font-semibold
              transition-colors whitespace-nowrap
              ${active
                ? "bg-[#16130C] text-white"
                : "bg-white border border-[#E2DDD5] text-[#5E5848] hover:border-[#9C9485] hover:text-[#16130C]"
              }
            `}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span className={`
                inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                rounded-full text-[10px] font-bold
                ${active ? "bg-white/20 text-white" : "bg-[#E8A020]/15 text-[#E8A020]"}
              `}>
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
