import { describe, it, expect } from "vitest";
import {
  isSimpleDescription,
  descriptionToRows,
  applyDescriptionParts,
  descriptionToText,
  textToDescription,
  rowsWordCount,
  type DescriptionPart,
} from "@/lib/listings/description";

/** Shape produced by the seed scripts (apps/web/scripts/seed-restaurants.ts):
 *  a Quick Facts card, an h2, prose, an h3, prose, a Tip Card. */
const seededDescription = [
  { _type: "quickFactsBlock", _key: "qf1", title: "✦ Restaurant Info", items: [{ _key: "a", icon: "📍", label: "Location", value: "Garoda" }] },
  { _type: "block", _key: "h2a", style: "h2", markDefs: [], children: [{ _type: "span", _key: "s1", text: "Mannis Restaurant", marks: [] }] },
  { _type: "block", _key: "p1", style: "normal", markDefs: [], children: [{ _type: "span", _key: "s2", text: "Tucked inside the Palm Garden.", marks: [] }] },
  { _type: "block", _key: "h3a", style: "h3", markDefs: [], children: [{ _type: "span", _key: "s3", text: "The Cocktail Bar", marks: [] }] },
  { _type: "block", _key: "p2", style: "normal", markDefs: [], children: [{ _type: "span", _key: "s4", text: "An impressive collection.", marks: [] }] },
  { _type: "tipCardBlock", _key: "tc1", variant: "tip", icon: "📞", label: "Reservations", text: "Book ahead in high season." },
];

const plainDescription = [
  { _type: "block", _key: "p1", style: "normal", markDefs: [], children: [{ _type: "span", _key: "s1", text: "One.", marks: [] }] },
  { _type: "block", _key: "p2", style: "normal", markDefs: [], children: [{ _type: "span", _key: "s2", text: "Two.", marks: [] }] },
];

/** A paragraph carrying a link — text cannot be round-tripped without losing the mark. */
const markedDescription = [
  {
    _type: "block", _key: "pm", style: "normal",
    markDefs: [{ _key: "l1", _type: "link", href: "https://example.com" }],
    children: [
      { _type: "span", _key: "s1", text: "Book on ", marks: [] },
      { _type: "span", _key: "s2", text: "our site", marks: ["l1"] },
    ],
  },
];

describe("isSimpleDescription", () => {
  it("is true for an empty description so new listings use the plain textarea", () => {
    expect(isSimpleDescription(undefined)).toBe(true);
    expect(isSimpleDescription([])).toBe(true);
  });

  it("is true for unstyled, unmarked paragraphs", () => {
    expect(isSimpleDescription(plainDescription)).toBe(true);
  });

  it("is false for the seeded shape — that is what forced hosts into Sanity Studio", () => {
    expect(isSimpleDescription(seededDescription)).toBe(false);
  });

  it("is false for a bulleted list, which the plain textarea would silently flatten", () => {
    expect(isSimpleDescription([
      { _type: "block", _key: "b1", style: "normal", listItem: "bullet", markDefs: [], children: [{ _type: "span", _key: "s", text: "Item", marks: [] }] },
    ])).toBe(false);
  });
});

describe("descriptionToRows", () => {
  it("gives every prose block its own editable row and keeps the cards as fixed rows", () => {
    const rows = descriptionToRows(seededDescription);
    expect(rows.map((r) => r.kind)).toEqual(["fixed", "text", "text", "text", "text", "fixed"]);
    expect(rows.map((r) => r.key)).toEqual(["qf1", "h2a", "p1", "h3a", "p2", "tc1"]);
    const h2 = rows[1];
    if (h2.kind !== "text") throw new Error("expected text row");
    expect(h2.style).toBe("h2");
    expect(h2.text).toBe("Mannis Restaurant");
  });

  it("labels custom blocks from their Sanity type", () => {
    const rows = descriptionToRows(seededDescription);
    expect(rows[0]).toMatchObject({ kind: "fixed", label: "Quick facts" });
    expect(rows[5]).toMatchObject({ kind: "fixed", label: "Tip card" });
  });

  it("keeps a linked paragraph fixed rather than offering to flatten its link away", () => {
    const rows = descriptionToRows(markedDescription);
    expect(rows[0].kind).toBe("fixed");
    if (rows[0].kind !== "fixed") throw new Error("expected fixed row");
    expect(rows[0].label).toBe("Formatted paragraph");
    expect(rows[0].detail).toContain("Book on our site");
  });

  it("counts the words a host can actually edit", () => {
    expect(rowsWordCount(descriptionToRows(plainDescription))).toBe(2);
  });
});

describe("applyDescriptionParts", () => {
  const keepAll = (): DescriptionPart[] =>
    descriptionToRows(seededDescription).map((r) => ({ op: "keep" as const, key: r.key }));

  it("edits one paragraph and leaves every card byte-identical", () => {
    const parts = keepAll();
    parts[2] = { op: "edit", key: "p1", text: "Tucked inside the Palm Garden Boutique Hotel." };
    const out = applyDescriptionParts(seededDescription, parts);

    expect(out).toHaveLength(6);
    expect(out[0]).toEqual(seededDescription[0]);
    expect(out[5]).toEqual(seededDescription[5]);
    const edited = out[2] as Record<string, unknown>;
    expect(edited._key).toBe("p1");
    expect(edited.style).toBe("normal");
    expect(descriptionToText([edited])).toBe("Tucked inside the Palm Garden Boutique Hotel.");
  });

  it("keeps the heading style when a heading is retitled", () => {
    const parts = keepAll();
    parts[1] = { op: "edit", key: "h2a", text: "Manni's Restaurant & Cocktail Bar" };
    const out = applyDescriptionParts(seededDescription, parts) as Record<string, unknown>[];
    expect(out[1].style).toBe("h2");
    expect(descriptionToText([out[1]])).toBe("Manni's Restaurant & Cocktail Bar");
  });

  it("refuses to rewrite a block the editor never offered as editable", () => {
    const out = applyDescriptionParts(markedDescription, [{ op: "edit", key: "pm", text: "hijacked" }]);
    expect(out).toEqual(markedDescription);
  });

  it("ignores an unknown key instead of inventing a block", () => {
    const out = applyDescriptionParts(seededDescription, [
      { op: "keep", key: "qf1" },
      { op: "edit", key: "does-not-exist", text: "nope" },
    ]);
    expect(out).toEqual([seededDescription[0]]);
  });

  it("never emits the same _key twice", () => {
    const out = applyDescriptionParts(seededDescription, [
      { op: "keep", key: "p1" },
      { op: "keep", key: "p1" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("drops a paragraph the host removed, and one they cleared to blank", () => {
    const parts: DescriptionPart[] = [
      { op: "keep", key: "qf1" },
      { op: "edit", key: "p1", text: "   " },
    ];
    const out = applyDescriptionParts(seededDescription, parts);
    expect(out).toEqual([seededDescription[0]]);
  });

  it("appends a paragraph the host added", () => {
    const out = applyDescriptionParts(seededDescription, [
      { op: "keep", key: "qf1" },
      { op: "add", text: "New closing line." },
    ]) as Record<string, unknown>[];
    expect(out).toHaveLength(2);
    expect(out[1]._type).toBe("block");
    expect(out[1].style).toBe("normal");
    expect(out[1]._key).toEqual(expect.any(String));
    expect(descriptionToText([out[1]])).toBe("New closing line.");
  });

  it("splits a blank line inside one box into two blocks of the same style", () => {
    const out = applyDescriptionParts(seededDescription, [
      { op: "edit", key: "p1", text: "First half.\n\nSecond half." },
    ]) as Record<string, unknown>[];
    expect(out).toHaveLength(2);
    expect(out[0]._key).toBe("p1");
    expect(out[1]._key).not.toBe("p1");
    expect(out.every((b) => b.style === "normal")).toBe(true);
    expect(descriptionToText(out)).toBe("First half.\n\nSecond half.");
  });

  it("survives a stored description that is not an array", () => {
    expect(applyDescriptionParts("just a string", [{ op: "add", text: "Hi." }])).toHaveLength(1);
    expect(applyDescriptionParts(undefined, [{ op: "keep", key: "x" }])).toEqual([]);
  });
});

describe("plain-mode round trip is unchanged", () => {
  it("still joins and splits on blank lines", () => {
    expect(descriptionToText(plainDescription)).toBe("One.\n\nTwo.");
    expect(descriptionToText(textToDescription("One.\n\nTwo."))).toBe("One.\n\nTwo.");
  });
});
