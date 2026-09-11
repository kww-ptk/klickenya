import { describe, it, expect } from "vitest";
import { sanityDocToForm, inputToSanityFields, listingInputSchema, emptyListingForm } from "@/lib/listings/listingFields";

/** Opening the editor and saving must not write fields the document never had.
 *  La Pamy Hair Studio had no priceUnit; a description edit set it to "night". */

function saveUntouched(doc: Record<string, unknown>) {
  const form = sanityDocToForm(doc);
  const data = listingInputSchema.parse({
    title: form.title || "x", slug: form.slug || "x", type: form.type,
    city: form.city || "Watamu", status: form.status,
    bookingType: form.bookingType || undefined,
    priceUnit: form.priceUnit || undefined,
    rentingType: form.rentingType || undefined,
  });
  return inputToSanityFields(data);
}

const bare = {
  title: "La Pamy Hair Studio", slug: { current: "la-pamy-hair-studio" },
  type: "service", city: "Watamu", status: "published",
};

describe("a round trip through the editor invents nothing", () => {
  it("leaves bookingType, priceUnit and rentingType unset", () => {
    const fields = saveUntouched(bare);
    expect(fields.bookingType).toBeUndefined();
    expect(fields.priceUnit).toBeUndefined();
    expect(fields.rentingType).toBeUndefined();
  });

  it("keeps values the document does have", () => {
    const fields = saveUntouched({ ...bare, bookingType: "instant", priceUnit: "person" });
    expect(fields.bookingType).toBe("instant");
    expect(fields.priceUnit).toBe("person");
  });

  it("surfaces the absence to the form as empty, not as a fake default", () => {
    const form = sanityDocToForm(bare);
    expect(form.bookingType).toBe("");
    expect(form.priceUnit).toBe("");
    expect(form.rentingType).toBe("");
  });

  it("still gives a brand new listing sensible defaults", () => {
    expect(emptyListingForm.bookingType).toBe("contact_form");
    expect(emptyListingForm.priceUnit).toBe("night");
    expect(emptyListingForm.rentingType).toBe("entire_place");
  });
});
