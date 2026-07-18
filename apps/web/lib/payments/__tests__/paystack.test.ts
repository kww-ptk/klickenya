import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyPaystackSignature, kesToSubunits } from "../paystack";

describe("verifyPaystackSignature", () => {
  const secret = "sk_test_abc";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ord-1" } });
  const goodSig = crypto.createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a valid HMAC-SHA512 signature", () => {
    expect(verifyPaystackSignature(body, goodSig, secret)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyPaystackSignature(body + "x", goodSig, secret)).toBe(false);
  });
  it("rejects a malformed signature without throwing", () => {
    expect(verifyPaystackSignature(body, "nothex", secret)).toBe(false);
    expect(verifyPaystackSignature(body, "", secret)).toBe(false);
  });
});

describe("kesToSubunits", () => {
  it("converts whole KES to *100 subunits", () => {
    expect(kesToSubunits(7000)).toBe(700000);
  });
  it("rejects non-integer or negative amounts", () => {
    expect(() => kesToSubunits(10.5)).toThrow();
    expect(() => kesToSubunits(-1)).toThrow();
  });
});
