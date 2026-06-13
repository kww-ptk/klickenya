"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BellRing, History } from "lucide-react";
import { usePosShell } from "./_shell/PosShellProvider";

export function PosTabBar() {
  const { menu } = usePosShell();
  const pathname = usePathname();
  const slug = menu.slug;

  const tabs = [
    { id: "tables",  href: `/pos/${slug}/tables`,  icon: LayoutGrid, label: "Tables"  },
    // "Ready" replaces the old Kitchen link for waiters: a curated view of
    // orders that have come back from the kitchen and need to be picked up.
    // Kitchen-role staff have their own dedicated /kitchen/[slug] terminal.
    { id: "ready",   href: `/pos/${slug}/ready`,   icon: BellRing,   label: "Ready"   },
    { id: "history", href: `/pos/${slug}/history`, icon: History,    label: "History" },
  ] as const;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#0F0D08]/95 backdrop-blur border-t border-[#2A2520]">
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 h-16 flex items-stretch justify-around gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.id === "tables"  ? pathname.startsWith(`/pos/${slug}/tables`)  :
            tab.id === "ready"   ? pathname.startsWith(`/pos/${slug}/ready`)   :
            tab.id === "history" ? pathname.startsWith(`/pos/${slug}/history`) :
            false;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 max-w-[140px] flex flex-col items-center justify-center gap-0.5 rounded-xl mx-0.5 my-2 text-[11px] font-semibold transition-colors ${
                active
                  ? "bg-[#252019] text-amber"
                  : "text-text3 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
