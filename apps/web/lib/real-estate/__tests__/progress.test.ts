import { describe, expect, it } from "vitest";
import {
  CONSTRUCTION_STAGES,
  clampPercent,
  computePercentage,
  formatStageMonth,
  mapConstructionProgress,
} from "../progress";

describe("CONSTRUCTION_STAGES", () => {
  it("weights sum to exactly 100", () => {
    const total = CONSTRUCTION_STAGES.reduce((sum, s) => sum + s.weight, 0);
    expect(total).toBe(100);
  });

  it("has eight stages with unique values", () => {
    expect(CONSTRUCTION_STAGES).toHaveLength(8);
    const values = CONSTRUCTION_STAGES.map((s) => s.value);
    expect(new Set(values).size).toBe(8);
  });
});

describe("computePercentage", () => {
  const all = (status: string) =>
    CONSTRUCTION_STAGES.map((s) => ({ stage: s.value, status }));

  it("returns null when there are no entries", () => {
    expect(computePercentage([])).toBeNull();
    expect(computePercentage(null)).toBeNull();
    expect(computePercentage(undefined)).toBeNull();
  });

  it("returns null when no entry names a known stage", () => {
    expect(
      computePercentage([{ stage: "landscaping", status: "done" }])
    ).toBeNull();
  });

  it("returns 0 when every stage is upcoming", () => {
    expect(computePercentage(all("upcoming"))).toBe(0);
  });

  it("returns 100 when every stage is done", () => {
    expect(computePercentage(all("done"))).toBe(100);
  });

  it("sums the weights of done stages", () => {
    // groundbreaking 5 + foundation 15 + superstructure 20 = 40
    expect(
      computePercentage([
        { stage: "groundbreaking", status: "done" },
        { stage: "foundation", status: "done" },
        { stage: "superstructure", status: "done" },
        { stage: "roofing", status: "upcoming" },
      ])
    ).toBe(40);
  });

  it("gives an in-progress stage half its weight", () => {
    // groundbreaking 5 done + foundation 15 half = 5 + 7.5 = 12.5, rounded 13
    expect(
      computePercentage([
        { stage: "groundbreaking", status: "done" },
        { stage: "foundation", status: "in-progress" },
      ])
    ).toBe(13);
  });

  it("ignores unknown stages instead of throwing", () => {
    expect(
      computePercentage([
        { stage: "foundation", status: "done" },
        { stage: "feng-shui", status: "done" },
      ])
    ).toBe(15);
  });

  it("does not double-count a repeated stage", () => {
    expect(
      computePercentage([
        { stage: "foundation", status: "done" },
        { stage: "foundation", status: "done" },
      ])
    ).toBe(15);
  });

  it("lets the last entry for a stage win", () => {
    expect(
      computePercentage([
        { stage: "foundation", status: "done" },
        { stage: "foundation", status: "upcoming" },
      ])
    ).toBe(0);
    expect(
      computePercentage([
        { stage: "foundation", status: "upcoming" },
        { stage: "foundation", status: "done" },
      ])
    ).toBe(15);
  });

  it("treats a missing or unrecognised status as upcoming", () => {
    expect(computePercentage([{ stage: "foundation" }])).toBe(0);
    expect(
      computePercentage([{ stage: "foundation", status: "halfway" }])
    ).toBe(0);
  });

  it("skips null or undefined entries in the array", () => {
    expect(
      computePercentage([null, { stage: "foundation", status: "done" }])
    ).toBe(15);
  });
});

describe("clampPercent", () => {
  it("treats NaN as 0", () => {
    expect(clampPercent(NaN)).toBe(0);
  });

  it("treats Infinity as 0", () => {
    expect(clampPercent(Infinity)).toBe(0);
  });

  it("treats -Infinity as 0", () => {
    expect(clampPercent(-Infinity)).toBe(0);
  });

  it("clamps a negative value to 0", () => {
    expect(clampPercent(-20)).toBe(0);
  });

  it("clamps a value above 100 to 100", () => {
    expect(clampPercent(140)).toBe(100);
  });

  it("rounds down below the half", () => {
    expect(clampPercent(62.4)).toBe(62);
  });

  it("rounds up at the half", () => {
    expect(clampPercent(62.5)).toBe(63);
  });
});

describe("mapConstructionProgress", () => {
  const photoUrl = (photo: unknown) =>
    `https://cdn.test/${(photo as { ref?: string })?.ref ?? "x"}.jpg`;

  it("returns null with no milestones and no fallback", () => {
    expect(mapConstructionProgress([], { photoUrl })).toBeNull();
    expect(mapConstructionProgress(null, { photoUrl })).toBeNull();
  });

  it("falls back to the manual percentage when there are no milestones", () => {
    const result = mapConstructionProgress([], {
      photoUrl,
      fallbackPercentage: 62,
    });
    expect(result).toEqual({ milestones: [], percentage: 62, source: "manual" });
  });

  it("clamps an out-of-range manual percentage", () => {
    expect(
      mapConstructionProgress([], { photoUrl, fallbackPercentage: 140 })
        ?.percentage
    ).toBe(100);
    expect(
      mapConstructionProgress([], { photoUrl, fallbackPercentage: -20 })
        ?.percentage
    ).toBe(0);
  });

  it("ignores the manual percentage once milestones exist", () => {
    const result = mapConstructionProgress(
      [{ stage: "foundation", status: "done" }],
      { photoUrl, fallbackPercentage: 99 }
    );
    expect(result?.source).toBe("computed");
    expect(result?.percentage).toBe(15);
  });

  it("returns all eight stages in canonical order whatever the input order", () => {
    const result = mapConstructionProgress(
      [
        { stage: "roofing", status: "done" },
        { stage: "foundation", status: "done" },
      ],
      { photoUrl }
    );
    expect(result?.milestones.map((m) => m.stage)).toEqual(
      CONSTRUCTION_STAGES.map((s) => s.value)
    );
  });

  it("fills unlisted stages as upcoming with no dates", () => {
    const result = mapConstructionProgress(
      [{ stage: "foundation", status: "done", completedDate: "2026-03-04" }],
      { photoUrl }
    );
    const handover = result?.milestones.find((m) => m.stage === "handover");
    expect(handover).toMatchObject({
      status: "upcoming",
      label: "Handover",
      photos: [],
    });
    expect(handover?.completedDate).toBeUndefined();
    expect(handover?.targetDate).toBeUndefined();
  });

  it("keeps completedDate only on done stages and targetDate only on the rest", () => {
    const result = mapConstructionProgress(
      [
        {
          stage: "foundation",
          status: "done",
          completedDate: "2026-03-04",
          targetDate: "2026-02-01",
        },
        {
          stage: "handover",
          status: "upcoming",
          completedDate: "2027-01-01",
          targetDate: "2026-12-01",
        },
      ],
      { photoUrl }
    );
    const foundation = result?.milestones.find((m) => m.stage === "foundation");
    const handover = result?.milestones.find((m) => m.stage === "handover");
    expect(foundation?.completedDate).toBe("2026-03-04");
    expect(foundation?.targetDate).toBeUndefined();
    expect(handover?.targetDate).toBe("2026-12-01");
    expect(handover?.completedDate).toBeUndefined();
  });

  it("builds photo urls through the injected resolver and drops assetless entries", () => {
    const result = mapConstructionProgress(
      [
        {
          stage: "roofing",
          status: "done",
          photos: [
            { asset: { _id: "a" }, ref: "one", alt: "New roof trusses" },
            { alt: "no asset, dropped" },
            { asset: { _id: "b" }, ref: "two" },
          ],
        },
      ],
      { photoUrl }
    );
    const roofing = result?.milestones.find((m) => m.stage === "roofing");
    expect(roofing?.photos).toEqual([
      { url: "https://cdn.test/one.jpg", alt: "New roof trusses" },
      { url: "https://cdn.test/two.jpg", alt: "Roofing progress photo" },
    ]);
  });

  it("drops an empty note rather than rendering a blank line", () => {
    const result = mapConstructionProgress(
      [{ stage: "finishes", status: "in-progress", note: "   " }],
      { photoUrl }
    );
    expect(
      result?.milestones.find((m) => m.stage === "finishes")?.note
    ).toBeUndefined();
  });

  it("keeps a manual percentage of zero rather than treating it as absent", () => {
    expect(mapConstructionProgress([], { photoUrl, fallbackPercentage: 0 })).toEqual({
      milestones: [],
      percentage: 0,
      source: "manual",
    });
  });

  it("rejects a non-finite manual percentage", () => {
    expect(
      mapConstructionProgress([], { photoUrl, fallbackPercentage: NaN })
    ).toBeNull();
    expect(
      mapConstructionProgress([], { photoUrl, fallbackPercentage: Infinity })
    ).toBeNull();
  });
});

describe("formatStageMonth", () => {
  it("keeps the first of a month in that month", () => {
    // Regression: "YYYY-MM-DD" parsed by new Date() is UTC midnight, which
    // toLocaleDateString shifts backwards on any host west of UTC. This
    // rendered as "November 2026" before the date was built from its parts.
    expect(formatStageMonth("2026-12-01")).toBe("December 2026");
    expect(formatStageMonth("2026-04-01")).toBe("April 2026");
    expect(formatStageMonth("2026-01-01")).toBe("January 2026");
  });

  it("formats a mid-month date as month and year", () => {
    expect(formatStageMonth("2026-03-04")).toBe("March 2026");
  });

  it("returns null for anything that is not a plain YYYY-MM-DD date", () => {
    expect(formatStageMonth("")).toBeNull();
    expect(formatStageMonth(null)).toBeNull();
    expect(formatStageMonth(undefined)).toBeNull();
    expect(formatStageMonth("not a date")).toBeNull();
    expect(formatStageMonth("2026-03-04T12:00:00Z")).toBeNull();
  });

  it("returns null rather than rolling an out-of-range month into next year", () => {
    expect(formatStageMonth("2026-13-01")).toBeNull();
    expect(formatStageMonth("2026-00-10")).toBeNull();
  });
});
