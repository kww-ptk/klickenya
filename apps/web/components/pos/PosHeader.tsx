"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { usePosShell } from "./_shell/PosShellProvider";
import { posFetch } from "./_shell/posFetch";
import { PosStatusChip } from "./PosStatusChip";

/**
 * Persistent POS header. Reads slug + menu name + signed-in staff from the
 * shell context, so individual pages don't have to thread props through.
 *
 * Renders the connection-status chip on the right so the waiter can see at a
 * glance whether the terminal is online + responsive.
 */
export function PosHeader() {
  const { menu, staff } = usePosShell();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSwitch = async () => {
    setSigningOut(true);
    try {
      await posFetch("/api/pos/auth", { method: "DELETE" });
    } catch {
      /* network — cookie still expires server-side */
    }
    router.replace(`/pos/${menu.slug}`);
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0F0D08]/95 backdrop-blur border-b border-[#2A2520]">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <p className="text-[12px] text-text3 truncate flex-1 min-w-0">{menu.name}</p>
        {staff && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[14px] font-semibold text-white">{staff.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-[#2A2520] text-text3">
              {staff.role}
            </span>
          </div>
        )}
        <PosStatusChip />
        {staff && (
          <button
            type="button"
            onClick={handleSwitch}
            disabled={signingOut}
            className="shrink-0 h-10 px-3 rounded-full text-[12px] font-semibold bg-[#252019] text-surface hover:bg-[#3A342B] disabled:opacity-50 flex items-center gap-1.5"
            aria-label="Switch staff"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Switch staff</span>
          </button>
        )}
      </div>
    </header>
  );
}
