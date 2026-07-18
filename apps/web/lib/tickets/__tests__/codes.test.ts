import { describe, it, expect } from "vitest";
import { generateTicketCode, TICKET_CODE_RE } from "../codes";

describe("generateTicketCode", () => {
  it("produces 20-char Crockford-base32 codes", () => {
    const code = generateTicketCode();
    expect(code).toHaveLength(20);
    expect(code).toMatch(TICKET_CODE_RE);
  });
  it("never repeats across 10k draws", () => {
    const seen = new Set(Array.from({ length: 10_000 }, generateTicketCode));
    expect(seen.size).toBe(10_000);
  });
  it("excludes ambiguous chars I L O U", () => {
    for (let i = 0; i < 200; i++) expect(generateTicketCode()).not.toMatch(/[ILOU]/);
  });
});
