import crypto from "crypto";
import { describe, it, expect } from "vitest";
import {
  makePinHash,
  verifyPin,
  signRiderSession,
  verifyRiderSession,
} from "@/lib/rider/auth";

process.env.JWT_SECRET ||= "test-secret-for-rider-sessions";

describe("rider PIN", () => {
  it("accepts the right PIN and rejects the wrong one", () => {
    const { hash, salt } = makePinHash("4821");
    expect(verifyPin("4821", hash, salt)).toBe(true);
    expect(verifyPin("4822", hash, salt)).toBe(false);
    expect(verifyPin("", hash, salt)).toBe(false);
  });

  it("never stores the PIN itself", () => {
    const { hash, salt } = makePinHash("4821");
    expect(hash).not.toContain("4821");
    expect(salt).not.toContain("4821");
  });

  it("salts, so the same PIN hashes differently for two riders", () => {
    expect(makePinHash("4821").hash).not.toBe(makePinHash("4821").hash);
  });

  it("survives a malformed stored hash instead of throwing", () => {
    expect(verifyPin("4821", "not-hex", "salt")).toBe(false);
    expect(verifyPin("4821", "", "")).toBe(false);
  });
});

describe("rider session", () => {
  it("round-trips a valid session", () => {
    const token = signRiderSession({ rider_id: "r-1", name: "Juma" });
    const session = verifyRiderSession(token);
    expect(session?.rider_id).toBe("r-1");
    expect(session?.name).toBe("Juma");
  });

  it("rejects a tampered payload", () => {
    const token = signRiderSession({ rider_id: "r-1", name: "Juma" });
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ rider_id: "r-2", name: "Mallory", exp: 9e9 }),
    ).toString("base64url");
    expect(verifyRiderSession(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects rubbish and empty tokens", () => {
    expect(verifyRiderSession(undefined)).toBeNull();
    expect(verifyRiderSession("")).toBeNull();
    expect(verifyRiderSession("nodot")).toBeNull();
    expect(verifyRiderSession("a.b")).toBeNull();
  });

  it("rejects an expired shift", () => {
    const expired = Buffer.from(
      JSON.stringify({ rider_id: "r-1", name: "Juma", exp: 1 }),
    ).toString("base64url");
    // Signed correctly, but the shift ended — must still be refused.
    const sig = crypto
      .createHmac("sha256", process.env.JWT_SECRET)
      .update(expired)
      .digest()
      .toString("base64url");
    expect(verifyRiderSession(`${expired}.${sig}`)).toBeNull();
  });
});
