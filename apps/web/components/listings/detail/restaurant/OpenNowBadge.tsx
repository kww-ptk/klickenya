"use client";

import { useState, useEffect } from "react";
import { isOpenNow } from "@/lib/listings/openingHours";

interface OpenNowBadgeProps {
  /** Raw opening hours string from Sanity, e.g. "Daily 8:00 AM – 10:30 PM" */
  openingHours: string;
}

function OpenNowBadge({ openingHours }: OpenNowBadgeProps) {
  const [status, setStatus] = useState<boolean | null>(null);

  useEffect(() => {
    setStatus(isOpenNow(openingHours));
  }, [openingHours]);

  if (status === null) return null;

  return (
    <span
      className={
        status
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[12px] font-bold text-emerald-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[12px] font-bold text-red-600"
      }
    >
      <span
        className={
          status
            ? "size-2 rounded-full bg-emerald-500 animate-pulse"
            : "size-2 rounded-full bg-red-400"
        }
      />
      {status ? "Open now" : "Closed"}
    </span>
  );
}

export { OpenNowBadge };
