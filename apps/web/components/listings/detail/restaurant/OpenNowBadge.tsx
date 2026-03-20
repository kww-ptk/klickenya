"use client";

import { useState, useEffect } from "react";

interface OpenNowBadgeProps {
  /** Raw opening hours string from Sanity, e.g. "Daily 8:00 AM – 10:30 PM" */
  openingHours: string;
}

/**
 * Attempts to parse common time patterns from the opening hours string
 * and determine if the restaurant is currently open.
 *
 * Handles patterns like:
 *   "Daily 8:00 AM – 10:30 PM"
 *   "Mon–Sat 11:00 AM - 9:00 PM"
 *   "Breakfast 7:30 AM – 11:00 AM; Lunch & Dinner 11:00 AM – 10:00 PM"
 *   "Wednesday – Monday, 10:00 AM – 9:00 PM. Closed Tuesdays."
 *
 * Falls back to hiding the badge if parsing fails.
 */
function parseIsOpen(text: string): boolean | null {
  // Normalise dashes and whitespace
  const normalised = text.replace(/\u2013|\u2014/g, "-").replace(/\s+/g, " ");

  // Check if explicitly "Closed" today
  const dayNames = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
  ];
  const today = dayNames[new Date().getDay()];
  const closedPattern = new RegExp(`closed\\s+${today}s?`, "i");
  if (closedPattern.test(normalised)) return false;

  // Extract all time ranges (e.g. "8:00 AM - 10:30 PM")
  const timeRangeRegex =
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi;
  const matches = [...normalised.matchAll(timeRangeRegex)];

  if (matches.length === 0) return null; // Can't parse

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const match of matches) {
    const open = toMinutes(match[1]);
    const close = toMinutes(match[2]);
    if (open === null || close === null) continue;

    // Handle overnight ranges (e.g. 6:00 PM – 2:00 AM)
    if (close < open) {
      if (currentMinutes >= open || currentMinutes <= close) return true;
    } else {
      if (currentMinutes >= open && currentMinutes <= close) return true;
    }
  }

  return false;
}

function toMinutes(timeStr: string): number | null {
  const match = timeStr
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function OpenNowBadge({ openingHours }: OpenNowBadgeProps) {
  const [status, setStatus] = useState<boolean | null>(null);

  useEffect(() => {
    setStatus(parseIsOpen(openingHours));
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
