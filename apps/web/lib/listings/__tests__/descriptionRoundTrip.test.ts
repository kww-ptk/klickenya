import { describe, it, expect } from "vitest";
import { sanityDocToForm, inputToSanityFields, listingInputSchema } from "@/lib/listings/listingFields";
import {
  applyDescriptionParts,
  descriptionToText,
  newRowKey,
  originalRowText,
  rowsToParts,
  type DescriptionRow,
} from "@/lib/listings/description";

/** The full path a host walks: Sanity doc → editor rows → edits → parts →
 *  server rebuild. Guards against the editor and the server disagreeing about
 *  which blocks are editable. */

const richDoc = {
  title: "Mannis",
  slug: { current: "mannis" },
  type: "experience",
  subcategory: "restaurants",
  city: "Watamu",
  status: "published",
  description: [
    { _type: "quickFactsBlock", _key: "qf1", title: "✦ Restaurant Info", items: [{ _key: "a", label: "Phone", value: "+254" }] },
    { _type: "block", _key: "h2a", style: "h2", markDefs: [], children: [{ _type: "span", _key: "s1", text: "Mannis Restaurant", marks: [] }] },
    { _type: "block", _key: "p1", style: "normal", markDefs: [], children: [{ _type: "span", _key: "s2", text: "Old opening line.", marks: [] }] },
    { _type: "photoRowBlock", _key: "pr1", layout: "cols-2", photos: [{ _key: "x" }, { _key: "y" }] },
  ],
};

const plainDoc = {
  title: "Simple",
  slug: { current: "simple" },
  type: "stay",
  city: "Diani",
  status: "published",
  description: [
    { _type: "block", _key: "p1", style: "normal", markDefs: [], children: [{ _type: "span", _key: "s", text: "Just prose.", marks: [] }] },
  ],
};

describe("host edits a rich description end to end", () => {
  it("puts the prose in editable rows instead of pointing the host at Sanity Studio", () => {
    const form = sanityDocToForm(richDoc);
    expect(form.descriptionRows).not.toBeNull();
    expect(form.descriptionRows!.filter((r) => r.kind === "text")).toHaveLength(2);
  });

  it("saves the edited paragraph and leaves the Quick Facts and Photo Row alone", () => {
    const form = sanityDocToForm(richDoc);
    const loaded = originalRowText(form.descriptionRows!);

    // Host retypes one paragraph and appends another.
    const edited: DescriptionRow[] = [
      ...form.descriptionRows!.map((r) =>
        r.kind === "text" && r.key === "p1" ? { ...r, text: "New opening line." } : r,
      ),
      { kind: "text", key: newRowKey(), style: "normal", text: "And a closing line." },
    ];

    const parts = rowsToParts(edited, loaded);
    expect(parts.map((p) => p.op)).toEqual(["keep", "keep", "edit", "keep", "add"]);

    const saved = applyDescriptionParts(richDoc.description, parts) as Record<string, unknown>[];
    expect(saved).toHaveLength(5);
    expect(saved[0]).toEqual(richDoc.description[0]);
    expect(saved[1]).toEqual(richDoc.description[1]);
    expect(saved[3]).toEqual(richDoc.description[3]);
    expect(descriptionToText([saved[2]])).toBe("New opening line.");
    expect(descriptionToText([saved[4]])).toBe("And a closing line.");
  });

  it("writes nothing at all when the host saves without touching the description", () => {
    const form = sanityDocToForm(richDoc);
    const parts = rowsToParts(form.descriptionRows!, originalRowText(form.descriptionRows!));
    expect(parts.every((p) => p.op === "keep")).toBe(true);
    expect(applyDescriptionParts(richDoc.description, parts)).toEqual(richDoc.description);
  });

  it("keeps `description` out of the patch so the server rebuild wins", () => {
    const data = listingInputSchema.parse({
      title: "Mannis", slug: "mannis", type: "experience", city: "Watamu", status: "published",
      descriptionParts: [{ op: "keep", key: "qf1" }],
    });
    expect("description" in inputToSanityFields(data)).toBe(false);
  });
});

describe("plain descriptions keep the single textarea", () => {
  it("loads as text with no rows", () => {
    const form = sanityDocToForm(plainDoc);
    expect(form.descriptionRows).toBeNull();
    expect(form.description).toBe("Just prose.");
  });

  it("still patches description from the textarea", () => {
    const data = listingInputSchema.parse({
      title: "Simple", slug: "simple", type: "stay", city: "Diani", status: "published",
      description: "Rewritten prose.",
    });
    const fields = inputToSanityFields(data);
    expect(descriptionToText(fields.description)).toBe("Rewritten prose.");
  });

  it("a brand new listing starts in textarea mode", () => {
    expect(sanityDocToForm({ description: undefined }).descriptionRows).toBeNull();
  });
});
