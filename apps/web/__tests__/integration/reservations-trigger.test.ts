/**
 * Integration test for the converse safety guard (DB trigger).
 *
 * Migration 071 installs trg_reservation_windows_invariant. After any
 * UPDATE or DELETE on reservation_time_windows, if zero active windows
 * remain for that menu_id, reservations_enabled flips to false.
 *
 * This test exercises the trigger against a real Postgres. It requires:
 *   RUN_DB_INTEGRATION=1
 *   SUPABASE_TEST_URL=postgresql://...      (e.g. local supabase-cli stack)
 *   SUPABASE_TEST_SERVICE_ROLE_KEY=...
 *
 * See TESTING.md for the local Supabase setup walkthrough.
 *
 * Pure CI runs (no env vars) skip this suite cleanly.
 */

import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SHOULD_RUN =
  process.env.RUN_DB_INTEGRATION === "1" &&
  !!process.env.SUPABASE_TEST_URL &&
  !!process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;

const d = SHOULD_RUN ? describe : describe.skip;

d("reservation_time_windows trigger — flips reservations_enabled false when last window goes", () => {
  let client: SupabaseClient;
  let menuId: string;
  let businessId: string;

  beforeAll(async () => {
    client = createClient(
      process.env.SUPABASE_TEST_URL!,
      process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    // Seed a fake auth user (service role lets us insert directly into auth.users via admin API).
    const { data: authUser, error: authErr } = await client.auth.admin.createUser({
      email: `trigger-test-${Date.now()}@example.test`,
      email_confirm: true,
    });
    if (authErr || !authUser.user) throw authErr ?? new Error("no user");
    businessId = authUser.user.id;

    // Seed a menu with reservations_enabled = true and one active window.
    const { data: menu, error: menuErr } = await client
      .from("menus")
      .insert({
        slug: `trigger-test-${Date.now()}`,
        business_id: businessId,
        name: "Trigger Test",
        reservations_enabled: true,
      })
      .select("id")
      .single();
    if (menuErr || !menu) throw menuErr ?? new Error("no menu");
    menuId = menu.id;

    const { error: winErr } = await client.from("reservation_time_windows").insert({
      menu_id: menuId,
      open_time: "12:00",
      close_time: "15:00",
      label: "Lunch",
      is_active: true,
      display_order: 0,
    });
    if (winErr) throw winErr;
  });

  afterAll(async () => {
    if (menuId) await client.from("menus").delete().eq("id", menuId);
    if (businessId) await client.auth.admin.deleteUser(businessId);
  });

  test("deleting the last active window flips reservations_enabled to false in the same transaction", async () => {
    const { data: before } = await client
      .from("menus")
      .select("reservations_enabled")
      .eq("id", menuId)
      .single();
    expect(before?.reservations_enabled).toBe(true);

    const { error: delErr } = await client
      .from("reservation_time_windows")
      .delete()
      .eq("menu_id", menuId);
    expect(delErr).toBeNull();

    const { data: after } = await client
      .from("menus")
      .select("reservations_enabled")
      .eq("id", menuId)
      .single();
    expect(after?.reservations_enabled).toBe(false);
  });

  test("flipping the last is_active = false also fires the trigger", async () => {
    // Re-add a window and re-enable.
    await client.from("reservation_time_windows").insert({
      menu_id: menuId,
      open_time: "18:00",
      close_time: "22:00",
      label: "Dinner",
      is_active: true,
      display_order: 0,
    });
    await client.from("menus").update({ reservations_enabled: true }).eq("id", menuId);

    const { error: updErr } = await client
      .from("reservation_time_windows")
      .update({ is_active: false })
      .eq("menu_id", menuId);
    expect(updErr).toBeNull();

    const { data: after } = await client
      .from("menus")
      .select("reservations_enabled")
      .eq("id", menuId)
      .single();
    expect(after?.reservations_enabled).toBe(false);
  });
});
