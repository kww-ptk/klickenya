import { describe, it, expect } from "vitest";
import { confirmPhraseMatches, DELETE_CONFIRM_PHRASE, MAX_BULK_DELETE } from "@/lib/orders/deletion";

describe("delete confirmation", () => {
  it("accepts only the exact phrase", () => {
    expect(confirmPhraseMatches(DELETE_CONFIRM_PHRASE)).toBe(true);
    expect(confirmPhraseMatches("deletekes!!!")).toBe(true);
  });

  it("rejects near misses — the whole point is a deliberate act", () => {
    expect(confirmPhraseMatches("deletekes!!")).toBe(false);   // one ! short
    expect(confirmPhraseMatches("deletekes!!!!")).toBe(false); // one too many
    expect(confirmPhraseMatches("DELETEKES!!!")).toBe(false);  // case matters
    expect(confirmPhraseMatches(" deletekes!!! ")).toBe(false); // not trimmed
    expect(confirmPhraseMatches("delete")).toBe(false);
    expect(confirmPhraseMatches("")).toBe(false);
  });

  it("rejects anything that is not a string", () => {
    // A JSON body can carry true, a number, an object — none of which should
    // ever satisfy a confirmation.
    expect(confirmPhraseMatches(true)).toBe(false);
    expect(confirmPhraseMatches(1)).toBe(false);
    expect(confirmPhraseMatches(null)).toBe(false);
    expect(confirmPhraseMatches(undefined)).toBe(false);
    expect(confirmPhraseMatches({})).toBe(false);
    expect(confirmPhraseMatches([DELETE_CONFIRM_PHRASE])).toBe(false);
  });

  it("caps bulk deletes at something a person can notice", () => {
    expect(MAX_BULK_DELETE).toBeGreaterThan(0);
    expect(MAX_BULK_DELETE).toBeLessThanOrEqual(500);
  });
});
