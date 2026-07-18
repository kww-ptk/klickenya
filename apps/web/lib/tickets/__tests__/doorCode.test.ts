import { describe, it, expect } from "vitest";
import { generateDoorCode, hashDoorCode, DOOR_CODE_RE } from "../doorCode";

describe("generateDoorCode", () => {
  it("produces 6-char base32 codes matching the regex", () => {
    for (let i = 0; i < 100; i++) expect(generateDoorCode()).toMatch(DOOR_CODE_RE);
  });
  it("excludes ambiguous chars I L O U", () => {
    for (let i = 0; i < 200; i++) expect(generateDoorCode()).not.toMatch(/[ILOU]/);
  });
});

describe("hashDoorCode", () => {
  it("is stable and case/space-insensitive", () => {
    expect(hashDoorCode("k7m2qx")).toBe(hashDoorCode(" K7M2QX "));
  });
  it("differs for different codes and is 64 hex chars", () => {
    expect(hashDoorCode("ABC123")).not.toBe(hashDoorCode("ABC124"));
    expect(hashDoorCode("ABC123")).toMatch(/^[0-9a-f]{64}$/);
  });
});
