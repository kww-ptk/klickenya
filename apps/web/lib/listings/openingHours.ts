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
 *   "Open daily: 09:00 - 21:00"          (24-hour, the common case in our data)
 *   "Daily except Tuesday. Lunch from 12:00"
 *   "Daily 8:00 AM - 10:30 PM"
 *   "Mon-Sat 11:00 AM - 9:00 PM"
 *   "Breakfast 7:30 AM - 11:00 AM; Lunch & Dinner 11:00 AM - 10:00 PM"
 *   "Wednesday - Monday, 10:00 AM - 9:00 PM. Closed Tuesdays."
 *
 * Evaluates against the viewer's local clock, so it must only ever run in the
 * browser — a statically cached page would otherwise bake in a stale answer.
 */

function toMinutes(timeStr: string): number | null {
  const t = timeStr.trim();

  const twelve = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (twelve) {
    let hours = parseInt(twelve[1], 10);
    const minutes = twelve[2] ? parseInt(twelve[2], 10) : 0;
    const period = twelve[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFour = t.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hours = parseInt(twentyFour[1], 10);
    const minutes = parseInt(twentyFour[2], 10);
    // 24:00 is a legitimate way to write midnight-close.
    if (hours > 24 || minutes > 59) return null;
    return (hours === 24 ? 0 : hours) * 60 + minutes;
  }

  return null;
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
  // "Closed Tuesdays" and "Daily except Tuesday" both mean the same thing and
  // both appear in the data.
  if (new RegExp(`closed\\s+${today}s?`, "i").test(normalised)) return false;
  if (new RegExp(`except\\s+${today}s?`, "i").test(normalised)) return false;

  // 12-hour first, since "8:00 PM" is unambiguous. Most of our data is
  // 24-hour ("09:00 - 21:00"), which the 12-hour pattern cannot see at all —
  // that is why every restaurant with hours set was reporting "unknown".
  const twelveHour =
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi;
  let matches = [...normalised.matchAll(twelveHour)];

  if (matches.length === 0) {
    // 24-hour. HH:MM on both sides is required — a bare "12 - 20" is too
    // easily a price, a party size or a date range.
    const twentyFourHour = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g;
    matches = [...normalised.matchAll(twentyFourHour)];
  }

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
