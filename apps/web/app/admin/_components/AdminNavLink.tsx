"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  external?: boolean;
}

export function AdminNavLink({
  href,
  label,
  icon,
  badge,
  external,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-[#9C9485] hover:text-white transition-colors"
      >
        <span className="shrink-0 size-5">{icon}</span>
        <span className="hidden lg:inline truncate">{label}</span>
        <svg
          className="hidden lg:block ml-auto size-3.5 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H21m0 0v7.5m0-7.5l-9 9"
          />
        </svg>
        {/* Tooltip for collapsed sidebar */}
        <span className="lg:hidden absolute left-full ml-2 px-2 py-1 rounded bg-[#2A2520] text-white text-[12px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
          {label}
        </span>
      </a>
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
      {/* Mobile badge dot */}
      {badge !== undefined && badge > 0 && (
        <span className="lg:hidden absolute top-1.5 right-2 size-2 rounded-full bg-[#E8A020]" />
      )}
      {/* Tooltip for collapsed sidebar */}
      <span className="lg:hidden absolute left-full ml-2 px-2 py-1 rounded bg-[#2A2520] text-white text-[12px] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
        {label}
        {badge !== undefined && badge > 0 && ` (${badge})`}
      </span>
    </Link>
  );
}
