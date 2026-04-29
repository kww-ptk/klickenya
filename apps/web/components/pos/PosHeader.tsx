"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

interface PosHeaderProps {
  slug:       string;
  menuName:   string;
  staffName:  string;
  staffRole:  "waiter" | "manager" | "cashier";
}

export function PosHeader({ slug, menuName, staffName, staffRole }: PosHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSwitch = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/pos/auth", { method: "DELETE" });
    } catch {
      /* ignore */
    }
    router.replace(`/pos/${slug}`);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0F0D08]/95 backdrop-blur border-b border-[#2A2520]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <p className="text-[12px] text-[#9C9485] truncate flex-1 min-w-0">{menuName}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[14px] font-semibold text-white">{staffName}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-[#2A2520] text-[#9C9485]">
            {staffRole}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSwitch}
          disabled={signingOut}
          className="shrink-0 h-10 px-3 rounded-full text-[12px] font-semibold bg-[#252019] text-[#F4F1EC] hover:bg-[#3A342B] disabled:opacity-50 flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Switch staff</span>
        </button>
      </div>
    </header>
  );
}
