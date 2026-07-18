// Pure occurrence-date math for recurring events. No Date.now() — callers pass
// the reference date. Dates are "YYYY-MM-DD" parsed as UTC to avoid TZ drift.

export const OCCURRENCE_SENTINEL = "2000-01-01"; // counter key for non-recurring inventory

type ScheduleRow = { day?: string; startTime?: string; endTime?: string };

const DAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

function parseUTC(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Scheduled weekday indices (0=Sun..6=Sat), deduped. */
function scheduledDayIndices(schedule: ScheduleRow[]): Set<number> {
  const set = new Set<number>();
  for (const r of schedule) {
    const idx = r.day ? DAY_INDEX[r.day.toLowerCase()] : undefined;
    if (idx !== undefined) set.add(idx);
  }
  return set;
}

/** The next `count` calendar dates (YYYY-MM-DD) on/after `fromISO` whose weekday
 *  is in the schedule. Empty schedule → []. */
export function nextOccurrences(schedule: ScheduleRow[], fromISO: string, count: number): string[] {
  const days = scheduledDayIndices(schedule);
  if (days.size === 0 || count <= 0) return [];
  const out: string[] = [];
  const cur = parseUTC(fromISO);
  for (let i = 0; i < 371 && out.length < count; i++) {
    if (days.has(cur.getUTCDay())) out.push(toISO(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Is `dateISO` a valid occurrence: a scheduled weekday, on/after `nowISO`? */
export function isValidOccurrence(schedule: ScheduleRow[], dateISO: string, nowISO: string): boolean {
  if (dateISO < nowISO) return false;
  const days = scheduledDayIndices(schedule);
  return days.has(parseUTC(dateISO).getUTCDay());
}
