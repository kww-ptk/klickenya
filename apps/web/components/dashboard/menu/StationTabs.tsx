// apps/web/components/dashboard/menu/StationTabs.tsx
"use client";

import Link from "next/link";

interface Props {
  activeStation: "kitchen" | "bar";
  hasBarStation: boolean;
  /** e.g. "/dashboard/menu/abc/orders" or "/kitchen/slug/orders" */
  baseHref: string;
  /**
   * Which tabs the viewer is allowed to operate. Set by the page wrapper
   * based on the signed-in user's role:
   *   - owner / manager → ["kitchen", "bar"] (full control)
   *   - kitchen staff   → ["kitchen"]
   *   - bar staff       → ["bar"]
   * Anything else falls back to ["kitchen", "bar"] for safety on owner pages.
   * Hiding the tab matches the API-level station-scope check: kitchen/bar
   * staff can only advance their own station's items (see
   * api/menu/order-items/[id] set_station_status branch). Without this,
   * staff would see tabs they can't actually operate and clicking would
   * 403 then snap back — confusing.
   */
  allowedStations?: ReadonlyArray<"kitchen" | "bar">;
}

export function StationTabs({
  activeStation,
  hasBarStation,
  baseHref,
  allowedStations = ["kitchen", "bar"],
}: Props) {
  if (!hasBarStation) return null;
  // If the viewer can only operate one station, no tab strip is needed at all
  // — the page is already rendering that single station.
  if (allowedStations.length < 2) return null;

  return (
    <div className="inline-flex rounded-full border border-border overflow-hidden text-[13px] font-bold mb-4">
      {allowedStations.includes("kitchen") && (
        <Link
          href={`${baseHref}?station=kitchen`}
          className={`px-4 h-[36px] inline-flex items-center transition-colors ${
            activeStation === "kitchen"
              ? "bg-amber text-dark"
              : "bg-white text-text2 hover:bg-[#FAF6EE]"
          }`}
        >
          🍳 Kitchen
        </Link>
      )}
      {allowedStations.includes("bar") && (
        <Link
          href={`${baseHref}?station=bar`}
          className={`px-4 h-[36px] inline-flex items-center transition-colors ${
            activeStation === "bar"
              ? "bg-teal-500 text-white"
              : "bg-white text-text2 hover:bg-[#EEF7F6]"
          }`}
        >
          🍹 Bar
        </Link>
      )}
    </div>
  );
}
