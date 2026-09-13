import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Every /api/admin route must guard itself.
 *
 * Middleware does NOT protect them. Its check is
 * `pathname.startsWith("/admin")`, which matches the /admin PAGES and never
 * /api/admin/*. Five routes were therefore answering unauthenticated callers
 * in production — including the claim-approve route, the only path that sets
 * isVerified, and a delete endpoint for seven tables.
 *
 * A guard that lives in each handler is easy to forget when adding a route,
 * so this test does the remembering.
 */

const ADMIN_API = join(process.cwd(), "app", "api", "admin");

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (entry === "route.ts" || entry === "route.tsx") out.push(full);
  }
  return out;
}

describe("/api/admin routes", () => {
  const files = routeFiles(ADMIN_API);

  it("finds the admin routes at all (guards against a silent empty pass)", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files.map((f) => [f.slice(f.indexOf("app/api/admin")), f]))(
    "%s calls assertAdmin",
    (_label, file) => {
      const src = readFileSync(file as string, "utf8");
      // Only routes that actually export a handler need a guard.
      const exportsHandler = /export async function (GET|POST|PATCH|PUT|DELETE)/.test(src);
      if (!exportsHandler) return;
      expect(src).toContain("assertAdmin");
    },
  );
});
