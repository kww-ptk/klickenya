import { describe, it, expect } from "vitest";
import { normaliseName, similarity, planReconcile } from "../reconcile";
import type { ExistingSection, IncomingSection } from "../reconcile";

/* Helpers ------------------------------------------------------- */

let seq = 0;
const item = (name: string, price = 100, extra: Partial<{ description: string | null; dietary_tags: string[] }> = {}) => ({
  id: `id-${++seq}`,
  name,
  description: extra.description ?? null,
  price_kes: price,
  dietary_tags: extra.dietary_tags ?? [],
  display_order: 0,
});

const section = (title: string, items: ReturnType<typeof item>[], display_order = 0): ExistingSection => ({
  id: `sec-${title}`,
  title,
  display_order,
  items: items.map((it, i) => ({ ...it, display_order: i })),
});

const incoming = (title: string, names: [string, number?][]): IncomingSection => ({
  title,
  items: names.map(([name, price]) => ({
    name,
    description: "",
    price_kes: price ?? 100,
    dietary_tags: [],
  })),
});

/* normaliseName ------------------------------------------------- */

describe("normaliseName", () => {
  it("folds case and collapses whitespace", () => {
    expect(normaliseName("  Gambas   Pil  Pil ")).toBe(normaliseName("gambas pil pil"));
  });

  it("treats curly and straight quotes as the same dish", () => {
    // The real case: Klickenya held the straight-quote spelling, the
    // restaurant's site the curly one. Different bytes, same dish.
    expect(normaliseName('Catch of the Day "En Papillote"'))
      .toBe(normaliseName("Catch of the Day “En Papillote”"));
  });

  it("folds en/em dashes to a hyphen", () => {
    expect(normaliseName("Surf – Turf")).toBe(normaliseName("Surf - Turf"));
  });

  it("folds accents so Rose and Rosé match", () => {
    expect(normaliseName("Rosé")).toBe(normaliseName("Rose"));
  });
});

/* similarity ---------------------------------------------------- */

describe("similarity", () => {
  it("is 1 for identical strings and 0 for nothing in common", () => {
    expect(similarity("beef burger", "beef burger")).toBe(1);
    expect(similarity("beef burger", "xyz")).toBe(0);
  });

  it("is symmetric", () => {
    expect(similarity("chicken burger", "peri-peri chicken burger"))
      .toBeCloseTo(similarity("peri-peri chicken burger", "chicken burger"));
  });

  it("handles single-character names without dividing by zero", () => {
    expect(similarity("a", "a")).toBe(1);
    expect(similarity("a", "b")).toBe(0);
    expect(similarity("", "")).toBe(0);
  });
});

/* planReconcile: the five real Tribal Table renames --------------- */

describe("planReconcile — rename detection", () => {
  // Every one of these actually happened. A name-match-only import would
  // have deleted each left-hand row and inserted the right-hand one,
  // cascading away its option groups and recipes.
  const RENAMES: [string, string][] = [
    ["Classic Beef Burger", "Classic Bacon & Beef Burger"],
    ["Chicken Burger", "Peri-Peri Chicken Burger"],
    ["Seared Yellowfin Tuna", "Sesame Crusted Yellowfin Tuna"],
    ["Garlic King Prawns", "Coastal Garlic Butter Prawns"],
    ["Roasted Butternut Tagliatelle", "Roasted Butternut & Feta Linguini"],
  ];

  it.each(RENAMES)("matches %s -> %s and keeps the id", (before, after) => {
    const existing = [section("Mains", [item(before, 1000)])];
    const plan = planReconcile(existing, [incoming("Mains", [[after, 1500]])]);

    const sec = plan.sections[0];
    expect(sec.deletes).toHaveLength(0);
    expect(sec.creates).toHaveLength(0);
    expect(sec.updates).toHaveLength(1);
    expect(sec.updates[0].renamed).toBe(true);
    expect(sec.updates[0].previousName).toBe(before);
    expect(sec.updates[0].patch.name).toBe(after);
    expect(sec.updates[0].patch.price_kes).toBe(1500);
    expect(sec.updates[0].id).toBe(existing[0].items[0].id);
  });

  it("does not invent a rename between two unrelated dishes", () => {
    const existing = [section("Mains", [item("Lobster & Chips", 4200)])];
    const plan = planReconcile(existing, [incoming("Mains", [["Swahili Paneer Curry", 1680]])]);

    expect(plan.sections[0].updates).toHaveLength(0);
    expect(plan.sections[0].creates.map((c) => c.name)).toEqual(["Swahili Paneer Curry"]);
    expect(plan.sections[0].deletes.map((d) => d.name)).toEqual(["Lobster & Chips"]);
  });

  it("prefers an exact match over a near one", () => {
    // "Beef Burger" must not be stolen by the fuzzy pass when it is
    // present verbatim on both sides.
    // Beef Burger gets a price change so it produces an update row we can
    // inspect — otherwise an unchanged exact match correctly emits nothing.
    const existing = [section("Burgers", [item("Beef Burger", 800), item("Chicken Burger", 700)])];
    const plan = planReconcile(existing, [
      incoming("Burgers", [["Beef Burger", 900], ["Peri-Peri Chicken Burger", 750]]),
    ]);

    const exact = plan.sections[0].updates.find((u) => u.previousName === "Beef Burger");
    expect(exact?.renamed).toBe(false);
    expect(exact?.patch.name).toBeUndefined();   // matched verbatim, name untouched
    const renamed = plan.sections[0].updates.find((u) => u.renamed);
    expect(renamed?.previousName).toBe("Chicken Burger");
    expect(plan.sections[0].deletes).toHaveLength(0);
  });

  it("pairs the best candidate first when several are close", () => {
    const existing = [section("Burgers", [item("Classic Beef Burger"), item("Chicken Burger")])];
    const plan = planReconcile(existing, [
      incoming("Burgers", [["Classic Bacon & Beef Burger"], ["Peri-Peri Chicken Burger"]]),
    ]);

    const pairs = plan.sections[0].updates.map((u) => [u.previousName, u.patch.name]);
    expect(pairs).toContainEqual(["Classic Beef Burger", "Classic Bacon & Beef Burger"]);
    expect(pairs).toContainEqual(["Chicken Burger", "Peri-Peri Chicken Burger"]);
    expect(plan.sections[0].deletes).toHaveLength(0);
  });
});

/* planReconcile: structure --------------------------------------- */

describe("planReconcile — sections", () => {
  it("treats an empty menu as a plain first import", () => {
    const plan = planReconcile([], [incoming("Starters", [["Nachos", 1680]])]);

    expect(plan.counts.sectionsCreated).toBe(1);
    expect(plan.counts.itemsCreated).toBe(1);
    expect(plan.counts.itemsDeleted).toBe(0);
    expect(plan.deletedSections).toHaveLength(0);
    expect(plan.sections[0].sectionId).toBeNull();
  });

  it("matches an existing section by title regardless of case", () => {
    const existing = [section("STARTERS", [item("Nachos", 1200)])];
    const plan = planReconcile(existing, [incoming("Starters", [["Nachos", 1680]])]);

    expect(plan.sections[0].sectionId).toBe("sec-STARTERS");
    expect(plan.counts.sectionsCreated).toBe(0);
    expect(plan.sections[0].updates[0].patch.price_kes).toBe(1680);
  });

  it("removes a section that is no longer on the menu, with its items", () => {
    const existing = [
      section("Starters", [item("Nachos")], 0),
      section("Specials", [item("Lobster & Chips"), item("Oysters")], 1),
    ];
    const plan = planReconcile(existing, [incoming("Starters", [["Nachos"]])]);

    expect(plan.deletedSections).toEqual([
      { id: "sec-Specials", title: "Specials", itemIds: expect.any(Array), itemCount: 2 },
    ]);
    expect(plan.counts.itemsDeleted).toBe(2);
  });

  it("renumbers sections to the incoming order", () => {
    const existing = [section("Mains", [item("Steak")], 0), section("Starters", [item("Nachos")], 1)];
    const plan = planReconcile(existing, [
      incoming("Starters", [["Nachos"]]),
      incoming("Mains", [["Steak"]]),
    ]);

    expect(plan.sections.map((s) => [s.title, s.displayOrder])).toEqual([
      ["Starters", 0],
      ["Mains", 1],
    ]);
    expect(plan.sections[0].sectionPatch).toEqual({ display_order: 0 });
  });

  it("reorders items inside a section without recreating them", () => {
    const existing = [section("Starters", [item("Nachos"), item("Calamari")])];
    const plan = planReconcile(existing, [incoming("Starters", [["Calamari"], ["Nachos"]])]);

    expect(plan.sections[0].creates).toHaveLength(0);
    expect(plan.sections[0].deletes).toHaveLength(0);
    const byName = Object.fromEntries(plan.sections[0].updates.map((u) => [u.previousName, u.patch.display_order]));
    expect(byName).toEqual({ Calamari: 0, Nachos: 1 });
  });
});

/* planReconcile: patches ----------------------------------------- */

describe("planReconcile — patches", () => {
  it("emits no update for an item that has not changed", () => {
    const existing = [
      section("Starters", [item("Nachos", 1680, { description: "Corn tortillas", dietary_tags: ["V"] })]),
    ];
    const plan = planReconcile(existing, [
      {
        title: "Starters",
        items: [{ name: "Nachos", description: "Corn tortillas", price_kes: 1680, dietary_tags: ["V"] }],
      },
    ]);

    expect(plan.sections[0].updates).toHaveLength(0);
    expect(plan.counts.itemsUpdated).toBe(0);
  });

  it("patches only the fields that actually differ", () => {
    const existing = [section("Starters", [item("Nachos", 1200, { description: "Same", dietary_tags: ["V"] })])];
    const plan = planReconcile(existing, [
      {
        title: "Starters",
        items: [{ name: "Nachos", description: "Same", price_kes: 1680, dietary_tags: ["V"] }],
      },
    ]);

    expect(Object.keys(plan.sections[0].updates[0].patch)).toEqual(["price_kes"]);
  });

  it("compares dietary tags as a set, not by order", () => {
    const existing = [section("Starters", [item("Pita", 790, { dietary_tags: ["VG", "V"] })])];
    const plan = planReconcile(existing, [
      { title: "Starters", items: [{ name: "Pita", description: "", price_kes: 790, dietary_tags: ["V", "VG"] }] },
    ]);

    expect(plan.sections[0].updates).toHaveLength(0);
  });

  it("stores an empty description as null, and does not churn on it", () => {
    const existing = [section("Starters", [item("Nachos", 100, { description: null })])];
    const plan = planReconcile(existing, [
      { title: "Starters", items: [{ name: "Nachos", description: "   ", price_kes: 100, dietary_tags: [] }] },
    ]);

    expect(plan.sections[0].updates).toHaveLength(0);
  });

  it("is idempotent — replanning against the result is a no-op", () => {
    const existing = [section("Mains", [item("Garlic King Prawns", 2400)])];
    const first = planReconcile(existing, [incoming("Mains", [["Coastal Garlic Butter Prawns", 2480]])]);

    // Apply the plan by hand, then replan.
    const applied: ExistingSection[] = [
      {
        ...existing[0],
        items: existing[0].items.map((it) => {
          const u = first.sections[0].updates.find((x) => x.id === it.id);
          return u ? { ...it, ...u.patch } : it;
        }),
      },
    ];
    const second = planReconcile(applied, [incoming("Mains", [["Coastal Garlic Butter Prawns", 2480]])]);

    expect(second.counts).toMatchObject({
      itemsCreated: 0,
      itemsUpdated: 0,
      itemsDeleted: 0,
      sectionsCreated: 0,
      sectionsDeleted: 0,
    });
  });
});

/* planReconcile: the wine-list hazard ---------------------------- */

describe("planReconcile — near-identical names", () => {
  // Real names from the Tribal Table drinks list. Bottle/Glass variants are
  // separate rows at different prices and score 0.93 against each other, so
  // fuzzy matching must never be what keeps them apart.
  const BTL = "Kumusha Sauvignon Blanc — Western Cape, SA Btl";
  const GLS = "Kumusha Sauvignon Blanc — Western Cape, SA Gls";

  it("keeps bottle and glass variants distinct when both are present", () => {
    const existing = [section("White Wine", [item(BTL, 4500), item(GLS, 900)])];
    const plan = planReconcile(existing, [incoming("White Wine", [[BTL, 4800], [GLS, 950]])]);

    expect(plan.sections[0].updates.every((u) => !u.renamed)).toBe(true);
    expect(plan.sections[0].creates).toHaveLength(0);
    expect(plan.sections[0].deletes).toHaveLength(0);
    const prices = Object.fromEntries(
      plan.sections[0].updates.map((u) => [u.previousName, u.patch.price_kes])
    );
    expect(prices[BTL]).toBe(4800);
    expect(prices[GLS]).toBe(950);
  });

  it("refuses to guess when two existing dishes compete for one newcomer", () => {
    // Both wines are dropped and a third arrives. It resembles BOTH of them
    // almost equally — the shared "San Felipe … - Argentina (Bottle)"
    // boilerplate alone scores ~0.9. Picking either is a coin flip that would
    // silently rewrite one wine into another, so decline and let the owner
    // see an explicit removal and addition.
    const existing = [
      section("Red Wine", [
        item("San Felipe Oak Malbec - Argentina (Bottle)", 4200),
        item("San Felipe Malbec Rosé - Argentina (Bottle)", 4100),
      ]),
    ];
    const plan = planReconcile(existing, [
      incoming("Red Wine", [["San Felipe Malbec Reserva - Argentina (Bottle)", 5200]]),
    ]);

    expect(plan.sections[0].updates.filter((u) => u.renamed)).toHaveLength(0);
    expect(plan.sections[0].creates.map((c) => c.name)).toEqual([
      "San Felipe Malbec Reserva - Argentina (Bottle)",
    ]);
    expect(plan.sections[0].deletes).toHaveLength(2);
  });

  it("marks a weak rename as low confidence so the owner can reject it", () => {
    const existing = [section("Mains", [item("Garlic King Prawns", 2400)])];
    const plan = planReconcile(existing, [incoming("Mains", [["Coastal Garlic Butter Prawns", 2480]])]);

    const u = plan.sections[0].updates[0];
    expect(u.renamed).toBe(true);
    expect(u.confidence).toBeGreaterThan(0);
    expect(u.confidence).toBeLessThan(1);
    // Below the "obvious" bar, so the UI must surface it for confirmation.
    expect(u.needsReview).toBe(true);
  });

  it("does not ask for review on an obvious rename", () => {
    const existing = [section("Burgers", [item("Classic Beef Burger", 1700)])];
    const plan = planReconcile(existing, [incoming("Burgers", [["Classic Bacon & Beef Burger", 1900]])]);

    expect(plan.sections[0].updates[0].needsReview).toBe(false);
  });

  it("still pairs when one candidate is clearly the best", () => {
    const existing = [
      section("Red Wine", [
        item("San Felipe Oak Malbec - Argentina (Bottle)", 4200),
        item("Rickety Bridge Pinotage - South Africa", 5000),
      ]),
    ];
    const plan = planReconcile(existing, [
      incoming("Red Wine", [
        ["San Felipe Oak Malbec Reserve - Argentina (Bottle)", 4600],
        ["Rickety Bridge Pinotage - South Africa", 5000],
      ]),
    ]);

    const renamed = plan.sections[0].updates.filter((u) => u.renamed);
    expect(renamed).toHaveLength(1);
    expect(renamed[0].previousName).toBe("San Felipe Oak Malbec - Argentina (Bottle)");
    expect(plan.sections[0].deletes).toHaveLength(0);
  });

  it("never pairs across sections", () => {
    // "Aperol Spritz" genuinely appears in both Cocktails and Signature
    // Drinks. Dropping it from one must not rewrite the other.
    const existing = [
      section("Cocktails", [item("Aperol Spritz", 1500)], 0),
      section("Signature Drinks", [item("Aperol Spritz", 1600)], 1),
    ];
    const plan = planReconcile(existing, [
      incoming("Cocktails", [["Negroni", 1700]]),
      incoming("Signature Drinks", [["Aperol Spritz", 1600]]),
    ]);

    const cocktails = plan.sections.find((s) => s.title === "Cocktails")!;
    const signature = plan.sections.find((s) => s.title === "Signature Drinks")!;
    expect(cocktails.deletes.map((d) => d.name)).toEqual(["Aperol Spritz"]);
    expect(cocktails.creates.map((c) => c.name)).toEqual(["Negroni"]);
    expect(signature.updates).toHaveLength(0);   // untouched
    expect(signature.deletes).toHaveLength(0);
  });

  it("treats a corrected spelling as a rename, not a new dish", () => {
    // Their list actually carries both "Lagavullin 16" and "Lagavulin 16".
    // If they fix the typo, that is the same whisky.
    const existing = [section("Whiskey", [item("Lagavullin 16", 1800)])];
    const plan = planReconcile(existing, [incoming("Whiskey", [["Lagavulin 16", 1800]])]);

    expect(plan.sections[0].updates[0].renamed).toBe(true);
    expect(plan.sections[0].deletes).toHaveLength(0);
  });
});
