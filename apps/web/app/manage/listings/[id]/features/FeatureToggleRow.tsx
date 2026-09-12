"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/Toggle";

interface FeatureToggleRowProps {
  menuId: string;
  /** Column on the menus table to write — e.g. 'reservations_enabled' */
  column: string;
  initialValue: boolean;
}

/**
 * Inline on/off toggle for a feature flag on the menus table. PATCHes
 * /api/menu/settings with a single field, refreshes the route on success so
 * the surrounding badges/labels reflect the new state.
 *
 * Optimistic: flip the UI immediately, revert on error. Keeps the rest of
 * the page (which is server-rendered) accurate via router.refresh().
 */
export function FeatureToggleRow({
  menuId,
  column,
  initialValue,
}: FeatureToggleRowProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  async function handleChange(next: boolean) {
    const prev = value;
    setValue(next); // optimistic
    try {
      const res = await fetch("/api/menu/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId, [column]: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Refresh server components so badges + tabs update from the source.
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("[FeatureToggleRow] PATCH failed:", err);
      setValue(prev); // rollback
    }
  }

  return <Toggle checked={value} onChange={() => handleChange(!value)} disabled={pending} />;
}
