// apps/web/lib/tickets/__tests__/occurrences.test.ts
import { describe, it, expect } from "vitest";
import { nextOccurrences, isValidOccurrence, OCCURRENCE_SENTINEL } from "../occurrences";

const sched = [{ day: "saturday" }, { day: "sunday" }];

describe("nextOccurrences", () => {
  it("returns the next N dates matching scheduled weekdays from a given date", () => {
    // 2026-08-05 is a Wednesday → next Sat 08-08, Sun 08-09, Sat 08-15, Sun 08-16
    expect(nextOccurrences(sched, "2026-08-05", 4)).toEqual(["2026-08-08", "2026-08-09", "2026-08-15", "2026-08-16"]);
  });
  it("includes the from-date itself when it is a scheduled day", () => {
    // 2026-08-08 is a Saturday
    expect(nextOccurrences(sched, "2026-08-08", 1)).toEqual(["2026-08-08"]);
  });
  it("returns [] for an empty schedule", () => {
    expect(nextOccurrences([], "2026-08-05", 4)).toEqual([]);
  });
  it("dedupes duplicate schedule days", () => {
    expect(nextOccurrences([{ day: "saturday" }, { day: "saturday" }], "2026-08-05", 2)).toEqual(["2026-08-08", "2026-08-15"]);
  });
});

describe("isValidOccurrence", () => {
  it("true for a scheduled weekday on/after now", () => {
    expect(isValidOccurrence(sched, "2026-08-15", "2026-08-05")).toBe(true); // future Saturday
    expect(isValidOccurrence(sched, "2026-08-08", "2026-08-08")).toBe(true); // today, a Saturday
  });
  it("false for a non-scheduled weekday or a past date", () => {
    expect(isValidOccurrence(sched, "2026-08-12", "2026-08-05")).toBe(false); // Wednesday
    expect(isValidOccurrence(sched, "2026-08-01", "2026-08-05")).toBe(false); // past
  });
});

describe("OCCURRENCE_SENTINEL", () => {
  it("is the non-recurring counter date", () => {
    expect(OCCURRENCE_SENTINEL).toBe("2000-01-01");
  });
});
