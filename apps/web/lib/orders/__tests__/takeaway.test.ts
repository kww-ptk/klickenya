import { describe, it, expect } from "vitest";
import { pickupWaMeLink } from "../takeaway";

describe("pickupWaMeLink", () => {
  it("builds a wa.me link with digits-only phone and encoded message", () => {
    const url = pickupWaMeLink("+254712345678", "Alice", "AB12CD34");
    expect(url.startsWith("https://wa.me/254712345678?text=")).toBe(true);
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toBe("Hi Alice, your order #AB12CD34 is ready for pickup!");
  });
  it("omits the name gracefully when null", () => {
    const url = pickupWaMeLink("+254712345678", null, "AB12CD34");
    const text = decodeURIComponent(url.split("?text=")[1]);
    expect(text).toBe("Hi, your order #AB12CD34 is ready for pickup!");
  });
});
