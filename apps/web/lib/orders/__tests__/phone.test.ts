import { describe, it, expect } from "vitest";
import { normalizeKenyanPhone } from "../phone";

describe("normalizeKenyanPhone", () => {
  it("accepts 07XX local format and normalizes to +254", () => {
    expect(normalizeKenyanPhone("0712345678")).toBe("+254712345678");
  });
  it("accepts 01XX local format (Airtel/Telkom ranges)", () => {
    expect(normalizeKenyanPhone("0112345678")).toBe("+254112345678");
  });
  it("accepts +254 international format as-is", () => {
    expect(normalizeKenyanPhone("+254712345678")).toBe("+254712345678");
  });
  it("accepts 254 without plus and adds it", () => {
    expect(normalizeKenyanPhone("254712345678")).toBe("+254712345678");
  });
  it("strips spaces, dashes and parentheses", () => {
    expect(normalizeKenyanPhone("0712 345-678")).toBe("+254712345678");
  });
  it("passes through non-Kenyan international numbers", () => {
    expect(normalizeKenyanPhone("+393331234567")).toBe("+393331234567");
  });
  it("rejects garbage", () => {
    expect(normalizeKenyanPhone("hello")).toBeNull();
    expect(normalizeKenyanPhone("071234")).toBeNull(); // too short
    expect(normalizeKenyanPhone("")).toBeNull();
  });
});
