"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  exact?: boolean;
}

export function DashboardNavLink({
  href,
  label,
  icon,
  badge,
  disabled,
  exact,
}: DashboardNavLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  if (disabled) {
    return (
      <div className="group relative flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-[#9C9485]/50 cursor-not-allowed">
        <span className="shrink-0 size-5">{icon}</span>
        <span className="hidden lg:inline truncate">{label}</span>
        <span className="hidden lg:inline ml-auto text-[10px] text-[#9C9485]/40 uppercase tracking-wider">Soon</span>
        <span className="lg:hidden absolute left-full ml-2 px-2 py-1 rounded bg-[#2A2520] text-white text-[12px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
          {label} · Coming soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium transition-colors ${
        isActive
          ? "text-[#E8A020] border-l-[3px] border-[#E8A020] pl-[13px]"
          : "text-[#9C9485] hover:text-white"
      }`}
    >
      <span className="shrink-0 size-5">{icon}</span>
      <span className="hidden lg:inline truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto hidden lg:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#E8A020] text-[#16130C] text-[11px] font-bold">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="lg:hidden absolute top-1.5 right-2 size-2 rounded-full bg-[#E8A020]" />
      )}
      <span className="lg:hidden absolute left-full ml-2 px-2 py-1 rounded bg-[#2A2520] text-white text-[12px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {label}
        {badge !== undefined && badge > 0 && ` (${badge})`}
      </span>
    </Link>
  );
}
