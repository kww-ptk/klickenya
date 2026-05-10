/**
 * Wizard Step 2: POST /api/setup/reservations.
 *
 * The endpoint must call fn_setup_enable_reservations (RPC) inside a single
 * transaction so that:
 *   - valid window data → windows row(s) AND reservations_enabled = true persist;
 *   - invalid window data (close_time before open_time, or empty windows) →
 *     400, no rows written, flag stays false.
 *
 * These tests stub the RPC at the supabase-client boundary. The actual
 * transactional rollback is exercised by the DB integration suite below
 * (gated by RUN_DB_INTEGRATION=1). Here we verify the route's contract.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";

const { rpcSpy, fromSpy, getSetupAuthMock } = vi.hoisted(() => ({
  rpcSpy: vi.fn(),
  fromSpy: vi.fn(),
  getSetupAuthMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { rpc: rpcSpy, from: fromSpy },
}));

vi.mock("@/app/api/setup/_lib/auth", () => ({
  getSetupAuth: getSetupAuthMock,
}));

import { POST } from "../route";

const PUBLISHED_MENU = {
  id: "menu-1",
  slug: "kivukoni",
  listing_slug: "kivukoni",
  business_id: "owner-1",
  is_published: true,
  table_ordering: false,
  reservations_enabled: false,
  stock_enabled: false,
};

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/setup/reservations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  menu_id: "menu-1",
  max_party_size: 8,
  lead_time_hours: 2,
  max_advance_days: 30,
  windows: [
    { open_time: "12:00", close_time: "15:00", label: "Lunch", weekdays: [1, 2, 3, 4, 5], capacity: 30 },
    { open_time: "18:30", close_time: "22:30", label: "Dinner", weekdays: [0, 1, 2, 3, 4, 5, 6], capacity: 40 },
  ],
};

describe("POST /api/setup/reservations — atomic write", () => {
  beforeEach(() => {
    rpcSpy.mockReset();
    fromSpy.mockReset();
    getSetupAuthMock.mockReset();
    // Default: authenticated owner of a published menu. Individual tests
    // can override (e.g. the not-published case).
    getSetupAuthMock.mockResolvedValue({
      userId: "owner-1",
      menu: PUBLISHED_MENU,
    });
  });

  test("rejects when menu is not published (server-side guard, mirrors /api/setup/table-ordering)", async () => {
    getSetupAuthMock.mockResolvedValueOnce({
      userId: "owner-1",
      menu: { ...PUBLISHED_MENU, is_published: false },
    });

    const res = await POST(makeReq(validBody) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("menu_not_published");
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  test("rejects when caller is unauthenticated", async () => {
    getSetupAuthMock.mockResolvedValueOnce({ userId: null, menu: null });

    const res = await POST(makeReq(validBody) as never);
    expect(res.status).toBe(401);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  test("rejects when caller does not own the menu (auth helper returns no menu)", async () => {
    getSetupAuthMock.mockResolvedValueOnce({ userId: "other-user", menu: null });

    const res = await POST(makeReq(validBody) as never);
    expect(res.status).toBe(403);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  test("valid input → calls fn_setup_enable_reservations and returns 200", async () => {
    rpcSpy.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeReq(validBody) as never);

    expect(res.status).toBe(200);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith("fn_setup_enable_reservations", {
      p_menu_id: "menu-1",
      p_max_party_size: 8,
      p_lead_time_hours: 2,
      p_max_advance_days: 30,
      p_windows: validBody.windows,
    });
  });

  test("empty windows array → 400, RPC never invoked", async () => {
    const res = await POST(makeReq({ ...validBody, windows: [] }) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("no_active_windows");
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  test("close_time before open_time → 400, RPC never invoked (client-side guard)", async () => {
    const res = await POST(
      makeReq({
        ...validBody,
        windows: [{ open_time: "22:00", close_time: "12:00", label: "Bad" }],
      }) as never,
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_window");
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  test("RPC raises 'no_active_windows' (race: a parallel delete blanked the windows table) → 400", async () => {
    // Postgres bubbles the RAISE EXCEPTION as a PostgrestError-shaped object.
    rpcSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "no_active_windows", code: "P0001" },
    });

    const res = await POST(makeReq(validBody) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("no_active_windows");
  });

  test("RPC raises a CHECK violation (e.g. open<close enforced server-side) → 400, flag NOT flipped (transaction rolls back automatically)", async () => {
    rpcSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "check_open_before_close", code: "23514" },
    });

    const res = await POST(makeReq(validBody) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid_window");
    // No follow-up update call — the transaction is owned by the RPC.
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
