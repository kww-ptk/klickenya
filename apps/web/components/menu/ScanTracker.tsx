"use client";

import { useEffect } from "react";

export function ScanTracker({ menuId }: { menuId: string }) {
  useEffect(() => {
    fetch("/api/menu/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_id: menuId }),
    }).catch(() => {});
  }, [menuId]);

  return null;
}
