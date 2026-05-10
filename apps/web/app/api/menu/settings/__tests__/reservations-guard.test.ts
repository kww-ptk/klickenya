/**
 * Forward safety guard: PATCH /api/menu/settings cannot persist
 * reservations_enabled = true when zero active reservation_time_windows
 * exist for the menu.
 *
 * Strategy: mock the Supabase admin client. The route's PATCH handler is
 * imported and invoked directly with a fake NextRequest. We assert on the
 * response status + body and on which Supabase calls did and did not fire.
 *
 * Notes on the converse guard (DB trigger): see
 *   __tests__/integration/reservations-trigger.test.ts
 * which exercises the trigger against a real Postgres. That suite is gated
 * by RUN_DB_INTEGRATION=1 so this test runs in pure CI without a database.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";

// ── Mock Supabase admin ──────────────────────────────────────────────────
// The admin client is queried in three shapes inside the PATCH handler:
//   1. .from("menus").select(...).eq("id", menu_id).maybeSingle()      → menu lookup
//   2. .from("reservation_time_windows").select(..., { count, head }).eq().eq() → active count
//   3. .from("menus").update(...).eq("id", menu_id)                    → write
//
// vi.hoisted is required because vi.mock factories run before module-top
// variable declarations.

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() } as { from: ReturnType<typeof vi.fn> },
}));

vi.mock("@/lib/supabase/admin", () => ({ adminClient: mockSupabase }));

vi.mock("@/app/api/menu/_lib/auth", () => ({
  getMenuAuth: vi.fn(async () => ({
    userId: "owner-1",
    isAdmin: false,
    supabase: mockSupabase,
  })),
  verifyMenuAccess: vi.fn(async () => ({ id: "menu-1", business_id: "owner-1" })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/sanity/client", () => ({ sanityClient: { fetch: vi.fn().mockResolvedValue(null) } }));

import { PATCH } from "../route";

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/menu/settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/menu/settings — reservations forward guard", () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  test("rejects reservations_enabled = true when zero active windows exist", async () => {
    // 1st call: menu lookup → returns a menu with reservations_enabled = false
    // 2nd call: active windows count → returns 0
    // 3rd call (update): MUST NOT be reached
    const updateSpy = vi.fn();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "menus") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "menu-1",
                  slug: "kivukoni",
                  listing_slug: "kivukoni",
                  reservations_enabled: false,
                },
                error: null,
              }),
            }),
          }),
          update: updateSpy,
        };
      }
      if (table === "reservation_time_windows") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ count: 0, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await PATCH(makeReq({ menu_id: "menu-1", reservations_enabled: true }) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("no_active_windows");
    expect(body.message).toMatch(/at least one active time window/i);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test("accepts reservations_enabled = true when ≥1 active window exists", async () => {
    const updateSpy = vi.fn(() => ({ eq: async () => ({ error: null }) }));

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "menus") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "menu-1",
                  slug: "kivukoni",
                  listing_slug: "kivukoni",
                  reservations_enabled: false,
                },
                error: null,
              }),
            }),
          }),
          update: updateSpy,
        };
      }
      if (table === "reservation_time_windows") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ count: 1, error: null }),
            }),
          }),
        };
      }
      if (table === "restaurant_areas") {
        return {
          select: () => ({
            eq: () => ({ count: 2, error: null }),
          }),
          insert: async () => ({ error: null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await PATCH(makeReq({ menu_id: "menu-1", reservations_enabled: true }) as never);

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

  test("rejects reservations_enabled = true when guard fires on a menu that already has it true (re-enable with no windows)", async () => {
    // Edge case: trigger flipped reservations_enabled false earlier (last
    // window deleted), and a stale client tries to flip it back on without
    // re-creating a window. Expect 400 even though the menu row currently
    // shows true — the active-windows count is the source of truth.
    const updateSpy = vi.fn();

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "menus") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "menu-1",
                  slug: "kivukoni",
                  listing_slug: "kivukoni",
                  reservations_enabled: true,
                },
                error: null,
              }),
            }),
          }),
          update: updateSpy,
        };
      }
      if (table === "reservation_time_windows") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ count: 0, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const res = await PATCH(makeReq({ menu_id: "menu-1", reservations_enabled: true }) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("no_active_windows");
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
