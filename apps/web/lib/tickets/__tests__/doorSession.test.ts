import { describe, it, expect, beforeAll } from "vitest";
import { signDoorSession, verifyDoorSession } from "../doorSession";

beforeAll(() => { process.env.POS_JWT_SECRET = "test-secret-door"; });

describe("door session sign/verify", () => {
  it("round-trips a valid session", () => {
    const { token } = signDoorSession({ event_sanity_id: "evt_1", label: "Main gate" });
    const s = verifyDoorSession(token);
    expect(s?.event_sanity_id).toBe("evt_1");
    expect(s?.label).toBe("Main gate");
  });
  it("rejects a tampered token", () => {
    const { token } = signDoorSession({ event_sanity_id: "evt_1", label: null });
    expect(verifyDoorSession(token + "x")).toBeNull();
    expect(verifyDoorSession("garbage.token")).toBeNull();
    expect(verifyDoorSession(null)).toBeNull();
  });
  it("rejects an expired session", () => {
    const { token } = signDoorSession({ event_sanity_id: "evt_1", label: null, ttlSeconds: -10 });
    expect(verifyDoorSession(token)).toBeNull();
  });
});
