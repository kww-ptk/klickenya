"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/eat", label: "Overview" },
  { href: "/admin/eat/orders", label: "Orders" },
  { href: "/admin/eat/riders", label: "Riders" },
  { href: "/admin/eat/restaurants", label: "Restaurants" },
];

export function EatAdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-zinc-200 mb-6 -mx-4 px-4 lg:mx-0 lg:px-0">
      {TABS.map((t) => {
        const active =
          t.href === "/admin/eat" ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 px-4 py-2.5 text-[13.5px] font-bold border-b-2 -mb-px transition-colors ${
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
