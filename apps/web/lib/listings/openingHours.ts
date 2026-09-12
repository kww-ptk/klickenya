/**
 * Opening-hours parsing for restaurant listings.
 *
 * `openingHours` is free text authored in Sanity, so this is best-effort by
 * design: it returns `null` when it cannot parse, and callers must treat that
 * as "unknown" rather than "closed". Extracted from OpenNowBadge when the /eat
 * city hubs needed the same logic for their "Open now" filter — one parser,
 * two callers, rather than two that drift.
 *
 * Handles patterns like:
 *   "Daily 8:00 AM - 10:30 PM"
 *   "Mon-Sat 11:00 AM - 9:00 PM"
 *   "Breakfast 7:30 AM - 11:00 AM; Lunch & Dinner 11:00 AM - 10:00 PM"
 *   "Wednesday - Monday, 10:00 AM - 9:00 PM. Closed Tuesdays."
 *
 * Evaluates against the viewer's local clock, so it must only ever run in the
 * browser — a statically cached page would otherwise bake in a stale answer.
 */

function toMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/** `true` open, `false` closed, `null` when the text cannot be parsed. */
export function isOpenNow(text: string | null | undefined): boolean | null {
  if (!text) return null;

  const normalised = text.replace(/–|—/g, "-").replace(/\s+/g, " ");

  const dayNames = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
  ];
  const today = dayNames[new Date().getDay()];
  const closedPattern = new RegExp(`closed\\s+${today}s?`, "i");
  if (closedPattern.test(normalised)) return false;

  const timeRangeRegex =
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi;
  const matches = [...normalised.matchAll(timeRangeRegex)];
  if (matches.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const match of matches) {
    const open = toMinutes(match[1]);
    const close = toMinutes(match[2]);
    if (open === null || close === null) continue;

    // Overnight ranges, e.g. 6:00 PM - 2:00 AM
    if (close < open) {
      if (currentMinutes >= open || currentMinutes <= close) return true;
    } else {
      if (currentMinutes >= open && currentMinutes <= close) return true;
    }
  }

  return false;
}
