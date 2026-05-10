/**
 * Server-side precondition: stock_enabled = true requires is_published.
 * Mirrors the table-ordering and reservations guards. Locks the behaviour
 * in so a future refactor can't quietly relax it.
 */

import { describe, expect, test, vi, beforeEach } from "vitest";

const { updateSpy, fromSpy, getSetupAuthMock } = vi.hoisted(() => {
  const updateSpy = vi.fn(() => ({ eq: async () => ({ error: null }) }));
  return {
    updateSpy,
    fromSpy: vi.fn(() => ({ update: updateSpy })),
    getSetupAuthMock: vi.fn(),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: { from: fromSpy },
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
  return new Request("http://localhost/api/setup/stock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/setup/stock — is_published guard", () => {
  beforeEach(() => {
    updateSpy.mockClear();
    fromSpy.mockClear();
    getSetupAuthMock.mockReset();
  });

  test("rejects when menu is not published", async () => {
    getSetupAuthMock.mockResolvedValueOnce({
      userId: "owner-1",
      menu: { ...PUBLISHED_MENU, is_published: false },
    });

    const res = await POST(makeReq({ menu_id: "menu-1" }) as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("menu_not_published");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  test("accepts when published; flips stock_enabled and stamps decided_at", async () => {
    getSetupAuthMock.mockResolvedValueOnce({
      userId: "owner-1",
      menu: PUBLISHED_MENU,
    });

    const res = await POST(makeReq({ menu_id: "menu-1" }) as never);

    expect(res.status).toBe(200);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        stock_enabled: true,
        stock_decided_at: expect.any(String),
      }),
    );
  });

  test("rejects unauthenticated", async () => {
    getSetupAuthMock.mockResolvedValueOnce({ userId: null, menu: null });

    const res = await POST(makeReq({ menu_id: "menu-1" }) as never);
    expect(res.status).toBe(401);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
