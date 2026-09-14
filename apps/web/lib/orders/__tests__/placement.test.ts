import { describe, it, expect } from "vitest";
import {
  distinctIds,
  requiredGroupsToEnforce,
  availableOptionCounts,
} from "@/lib/orders/placement";

describe("placement helpers", () => {
  it("collapses repeated item ids so a dish twice with different add-ons is one lookup", () => {
    expect(distinctIds(["a", "b", "a"])).toEqual(["a", "b"]);
    expect(distinctIds([])).toEqual([]);
  });

  it("only enforces required groups that still have an available option", () => {
    const groups = [
      { id: "size", menu_item_id: "pizza" },
      { id: "crust", menu_item_id: "pizza" },
    ];
    const counts = new Map([
      ["size", 0],
      ["crust", 2],
    ]);
    expect(requiredGroupsToEnforce(groups, counts).map((g) => g.id)).toEqual(["crust"]);
  });

  it("counts available options, treating null availability as available", () => {
    const counts = availableOptionCounts([
      { id: "g1", item_options: [{ is_available: true }, { is_available: false }, { is_available: null }] },
      { id: "g2", item_options: [] },
      { id: "g3", item_options: null },
    ]);
    expect(counts.get("g1")).toBe(2);
    expect(counts.get("g2")).toBe(0);
    expect(counts.get("g3")).toBe(0);
  });
});
