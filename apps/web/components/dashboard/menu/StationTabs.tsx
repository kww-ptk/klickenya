// apps/web/components/dashboard/menu/StationTabs.tsx
"use client";

import Link from "next/link";

interface Props {
  activeStation: "kitchen" | "bar";
  hasBarStation: boolean;
  /** e.g. "/dashboard/menu/abc/orders" or "/kitchen/slug/orders" */
  baseHref: string;
}

export function StationTabs({ activeStation, hasBarStation, baseHref }: Props) {
  if (!hasBarStation) return null;
  return (
    <div className="inline-flex rounded-full border border-[#E2DDD5] overflow-hidden text-[13px] font-bold mb-4">
      <Link
        href={`${baseHref}?station=kitchen`}
        className={`px-4 h-[36px] inline-flex items-center transition-colors ${
          activeStation === "kitchen"
            ? "bg-[#E8A020] text-[#16130C]"
            : "bg-white text-[#5E5848] hover:bg-[#FAF6EE]"
        }`}
      >
        🍳 Kitchen
      </Link>
      <Link
        href={`${baseHref}?station=bar`}
        className={`px-4 h-[36px] inline-flex items-center transition-colors ${
          activeStation === "bar"
            ? "bg-teal-500 text-white"
            : "bg-white text-[#5E5848] hover:bg-[#EEF7F6]"
        }`}
      >
        🍹 Bar
      </Link>
    </div>
  );
}
