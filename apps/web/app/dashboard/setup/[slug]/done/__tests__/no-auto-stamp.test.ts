/**
 * The done page must NOT stamp setup_completed_at on view. Auto-stamping
 * would silently complete setup for any owner who lands on /done via deep
 * link, browser history, or a stale tab.
 *
 * The contract is: the only path that writes setup_completed_at is the
 * Finish setup → button (CompleteButton.tsx → POST /api/setup/complete).
 * This test enforces that contract by source inspection — brittle but
 * cheap, and a future refactor that adds a useEffect or a server-side
 * `update` to done/page.tsx will trip it loudly.
 */

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DONE_PAGE = resolve(__dirname, "../page.tsx");
const COMPLETE_BUTTON = resolve(__dirname, "../../_components/CompleteButton.tsx");

describe("done page — no auto-stamp", () => {
  test("done/page.tsx does not import adminClient (no server-side writes at render)", () => {
    const src = readFileSync(DONE_PAGE, "utf8");
    expect(src).not.toMatch(/adminClient/);
    expect(src).not.toMatch(/from\s+["']@\/lib\/supabase\/admin["']/);
  });

  test("done/page.tsx does not write setup_completed_at directly (no .update call)", () => {
    const src = readFileSync(DONE_PAGE, "utf8");
    expect(src).not.toMatch(/setup_completed_at\s*[:=]/);
    expect(src).not.toMatch(/\.update\(/);
  });

  test("done/page.tsx does not auto-fire a fetch / effect on mount", () => {
    const src = readFileSync(DONE_PAGE, "utf8");
    // No useEffect, no top-level fetch — done is a server component that
    // renders a recap. The only network call lives inside CompleteButton's
    // onClick handler.
    expect(src).not.toMatch(/useEffect/);
    expect(src).not.toMatch(/await fetch\(/);
  });

  test("CompleteButton calls /api/setup/complete from inside an onClick handler only", () => {
    const src = readFileSync(COMPLETE_BUTTON, "utf8");
    // The fetch must exist (otherwise nothing stamps setup_completed_at).
    expect(src).toMatch(/\/api\/setup\/complete/);
    // It must be wrapped in an onClick — not a useEffect or top-level await.
    expect(src).toMatch(/onClick=\{onClick\}/);
    expect(src).not.toMatch(/useEffect/);
  });
});
