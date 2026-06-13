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
  /**
   * Optional override for the "overview" route (the one that needs exact-
   * match active detection). Defaults to /dashboard/listings/<id> for the
   * legacy command center; the /eat preview passes /eat/listings/<id>.
   */
  overviewHref?: string;
}

export function ListingTabNav({ listingId, tabs, overviewHref: overviewHrefProp }: ListingTabNavProps) {
  const pathname = usePathname();

  // Active detection: exact match for overview (no trailing segment),
  // prefix match for sub-routes.
  const overviewHref = overviewHrefProp ?? `/dashboard/listings/${listingId}`;

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
                ? "bg-dark text-white"
                : "bg-white border border-border text-text2 hover:border-text3 hover:text-dark"
              }
            `}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge !== 0 && (
              <span className={`
                inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                rounded-full text-[10px] font-bold
                ${active ? "bg-white/20 text-white" : "bg-amber/15 text-amber"}
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
