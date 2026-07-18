import { describe, it, expect } from "vitest";
import { buildEventIcs } from "../ics";

describe("buildEventIcs", () => {
  it("builds a valid VEVENT with escaped text", () => {
    const ics = buildEventIcs({
      uid: "tick-123@klickenya.com",
      title: "Beach Party; Watamu",
      start: new Date("2026-08-01T18:00:00+03:00"),
      end: null,
      location: "Ocean Bar, Watamu",
      url: "https://klickenya.com/t/ABC",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Beach Party\\; Watamu");
    expect(ics).toContain("DTSTART:20260801T150000Z");
    expect(ics).toContain("DTEND:20260801T180000Z");
    expect(ics).toContain("URL:https://klickenya.com/t/ABC");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toContain("\n\n");
  });
});
