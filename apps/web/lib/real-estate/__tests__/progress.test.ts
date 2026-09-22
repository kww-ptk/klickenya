import { describe, expect, it } from "vitest";
import { CONSTRUCTION_STAGES, clampPercent, computePercentage } from "../progress";

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
