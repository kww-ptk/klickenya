"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Building2,
  BarChart3,
  Inbox,
  Settings,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardSignOut } from "../../dashboard/_components/DashboardSignOut";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof Building2;
  badge?: number;
}

interface EatSidebarProps {
  displayName: string;
  initials: string;
  photoUrl: string | null;
  enquiryCount: number;
  email: string | null;
  planTier: string;
}

/**
 * EatSidebar — slim 4-item restaurant-only navigation.
 *
 * Mirror of DashboardNavLink + DashboardSignOut but consolidated into one
 * client component so we don't have to thread the active-state logic through
 * an RSC. The "eat" subdomain preview is intentionally narrow — anything
 * stays/PMS/events related lives back on /dashboard.
 */
export function EatSidebar({
  displayName,
  initials,
  photoUrl,
  enquiryCount,
  email,
  planTier,
}: EatSidebarProps) {
  const pathname = usePathname();

  const NAV: NavItem[] = [
    { href: "/eat/listings", label: "Restaurants", Icon: Building2 },
    { href: "/eat/stats", label: "Stats", Icon: BarChart3 },
    { href: "/eat/inbox", label: "Inbox", Icon: Inbox, badge: enquiryCount },
    { href: "/eat/settings", label: "Settings", Icon: Settings },
  ];

  const planColor =
    planTier === "pro" || planTier === "agency"
      ? "bg-[#6B2D8B]/15 text-[#6B2D8B]"
      : planTier === "grow"
      ? "bg-[#0D7377]/15 text-[#0D7377]"
      : "bg-[#E8A020]/15 text-[#E8A020]";

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[240px] bg-[#16130C] flex-col">
      {/* Back to website */}
      <Link
        href="/"
        className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 text-[#9C9485] hover:text-white transition-colors"
      >
        <Globe className="size-5 shrink-0" />
        <span className="text-[13px] font-medium">Back to Klickenya</span>
      </Link>

      {/* Eat brand mark — visually distinct from /dashboard so the host
          knows they're in the restaurant-only experience. */}
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-[18px] font-display font-bold tracking-[-0.02em] text-white leading-none">
          eat<span className="text-[#E8A020]">.</span>
        </p>
        <p className="text-[10px] uppercase tracking-wider text-[#9C9485] mt-1">
          Restaurant command center
        </p>
      </div>

      {/* Host profile */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="shrink-0 size-10 rounded-full bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[14px] font-bold overflow-hidden">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={displayName}
              width={40}
              height={40}
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-white truncate">
            {displayName}
          </p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${planColor}`}>
            {planTier}
          </span>
        </div>
      </div>

      {/* Navigation — 4 items only */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, Icon, badge }) => {
          const active =
            href === "/eat"
              ? pathname === "/eat"
              : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-colors",
                active
                  ? "bg-[#E8A020]/15 text-[#E8A020]"
                  : "text-[#9C9485] hover:text-white hover:bg-white/5",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-[13px] font-medium flex-1">{label}</span>
              {typeof badge === "number" && badge > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-[#E8A020] text-[#16130C] text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: email + sign out */}
      <div className="border-t border-white/10 px-4 py-4 space-y-3">
        {email && (
          <p className="text-[12px] text-[#9C9485] truncate" title={email}>
            {email}
          </p>
        )}
        <DashboardSignOut />
      </div>
    </aside>
  );
}
