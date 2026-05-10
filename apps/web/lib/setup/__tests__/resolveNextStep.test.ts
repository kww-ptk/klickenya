import { describe, expect, test } from "vitest";
import { resolveNextStep, type SetupState } from "../resolveNextStep";

const fresh = (overrides: Partial<SetupState> = {}): SetupState => ({
  is_published: false,
  reservations_decided_at: null,
  table_ordering: false,
  table_ordering_decided_at: null,
  stock_decided_at: null,
  setup_completed_at: null,
  setup_dismissed_at: null,
  has_tables: false,
  has_staff: false,
  ...overrides,
});

describe("resolveNextStep", () => {
  test("fresh menu (just claimed) routes to step 1", () => {
    expect(resolveNextStep(fresh())).toBe("menu");
  });

  test("published, no other flags decided → step 2", () => {
    expect(resolveNextStep(fresh({ is_published: true }))).toBe("reservations");
  });

  test("published + reservations decided + table_ordering decided + no tables, owner said NO to ordering → skips POS, routes to stock", () => {
    const state = fresh({
      is_published: true,
      reservations_decided_at: "2026-05-10T10:00:00Z",
      table_ordering: false,
      table_ordering_decided_at: "2026-05-10T10:01:00Z",
    });
    expect(resolveNextStep(state)).toBe("stock");
  });

  test("published + reservations decided + table_ordering decided + no tables, owner said YES to ordering → routes to POS (step 4)", () => {
    const state = fresh({
      is_published: true,
      reservations_decided_at: "2026-05-10T10:00:00Z",
      table_ordering: true,
      table_ordering_decided_at: "2026-05-10T10:01:00Z",
      has_tables: false,
      has_staff: false,
    });
    expect(resolveNextStep(state)).toBe("pos");
  });

  test("table_ordering = true with tables but no staff → still on step 4", () => {
    const state = fresh({
      is_published: true,
      reservations_decided_at: "2026-05-10T10:00:00Z",
      table_ordering: true,
      table_ordering_decided_at: "2026-05-10T10:01:00Z",
      has_tables: true,
      has_staff: false,
    });
    expect(resolveNextStep(state)).toBe("pos");
  });

  test("table_ordering = true with tables + staff but stock undecided → step 5", () => {
    const state = fresh({
      is_published: true,
      reservations_decided_at: "2026-05-10T10:00:00Z",
      table_ordering: true,
      table_ordering_decided_at: "2026-05-10T10:01:00Z",
      has_tables: true,
      has_staff: true,
    });
    expect(resolveNextStep(state)).toBe("stock");
  });

  test("all flags decided (no completion timestamp) → returns null (banner hidden)", () => {
    const state = fresh({
      is_published: true,
      reservations_decided_at: "2026-05-10T10:00:00Z",
      table_ordering: false,
      table_ordering_decided_at: "2026-05-10T10:01:00Z",
      stock_decided_at: "2026-05-10T10:02:00Z",
    });
    expect(resolveNextStep(state)).toBeNull();
  });

  test("setup_completed_at set → returns null regardless of flag state", () => {
    const state = fresh({ setup_completed_at: "2026-05-10T10:03:00Z" });
    expect(resolveNextStep(state)).toBeNull();
  });

  test("setup_dismissed_at set → returns null regardless of flag state", () => {
    const state = fresh({ setup_dismissed_at: "2026-05-10T10:03:00Z" });
    expect(resolveNextStep(state)).toBeNull();
  });

  test("dismissed wins even when other flags are mid-flow", () => {
    const state = fresh({
      is_published: false,
      setup_dismissed_at: "2026-05-10T10:03:00Z",
    });
    expect(resolveNextStep(state)).toBeNull();
  });
});
