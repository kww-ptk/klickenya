"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

/**
 * Persistent header for the kitchen terminal. Standalone version of
 * PosHeader — the kitchen shell doesn't have PosShellProvider so we pass
 * staff/menu info via props from the server page.
 */
interface KitchenHeaderProps {
  slug:      string;
  menuName:  string;
  staffName: string;
  role:      "kitchen" | "manager" | "waiter" | "cashier" | "bar";
}

export function KitchenHeader({ slug, menuName, staffName, role }: KitchenHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const stationLabel =
    role === "bar" ? "Bar" :
    role === "manager" ? "Station" :
    "Kitchen";
  const labelClass = role === "bar" ? "text-teal-400" : "text-[#E8A020]";

  const handleSwitch = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/pos/auth", { method: "DELETE" });
    } catch {
      /* network — cookie still expires server-side */
    }
    router.replace(`/kitchen/${slug}`);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0F0D08]/95 backdrop-blur border-b border-[#2A2520]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`text-[10px] uppercase tracking-[0.18em] ${labelClass} font-bold`}>{stationLabel}</span>
          <p className="text-[12px] text-[#9C9485] truncate">{menuName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[14px] font-semibold text-white">{staffName}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-[#2A2520] text-[#9C9485]">
            {role}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSwitch}
          disabled={signingOut}
          className="shrink-0 h-10 px-3 rounded-full text-[12px] font-semibold bg-[#252019] text-[#F4F1EC] hover:bg-[#3A342B] disabled:opacity-50 flex items-center gap-1.5"
          aria-label="Switch staff"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Switch staff</span>
        </button>
      </div>
    </header>
  );
}
