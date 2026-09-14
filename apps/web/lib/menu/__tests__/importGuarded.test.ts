import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every `action` the import route accepts must check that the caller owns the
 * menu. This repo has shipped unauthenticated write routes before — five of
 * them, including claim-approve — because a guard was assumed rather than
 * asserted. "replace" can now delete a restaurant's entire menu, so assert it.
 */
describe("/api/menu/import is guarded", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/menu/import/route.ts"),
    "utf-8"
  );

  it("rejects anonymous callers before doing any work", () => {
    const authAt = source.indexOf("getMenuAuth()");
    const firstAction = source.indexOf('if (action === "');
    expect(authAt).toBeGreaterThan(-1);
    expect(authAt).toBeLessThan(firstAction);
    expect(source).toMatch(/if \(!userId\)[\s\S]{0,80}401/);
  });

  it("checks menu ownership inside every action branch", () => {
    const branches = [...source.matchAll(/if \(action === "(\w+)"\) \{/g)];
    expect(branches.length).toBeGreaterThanOrEqual(3);   // parse, plan, commit

    for (const [i, m] of branches.entries()) {
      const start = m.index!;
      const end = i + 1 < branches.length ? branches[i + 1].index! : source.length;
      const body = source.slice(start, end);
      expect(
        body.includes("verifyMenuAccess"),
        `action "${m[1]}" does not call verifyMenuAccess`
      ).toBe(true);
      expect(body, `action "${m[1]}" does not return 403`).toMatch(/403/);
    }
  });

  it("never trusts row ids supplied by the client", () => {
    // The commit path must re-plan server-side. If a menu_item id ever
    // appears in the request schema, a caller could edit another menu's rows.
    const schemas = source.slice(0, source.indexOf("/* ── POST handler"));
    expect(schemas).not.toMatch(/item_id|menu_item_id|section_id/);
  });
});
