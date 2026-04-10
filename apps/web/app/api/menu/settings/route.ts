import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { revalidateTag, revalidatePath } from "next/cache";
import { getMenuAuth, verifyMenuAccess } from "../_lib/auth";

/* ── PATCH — update menu settings ──────────────────────────────────────────
 *
 * Supported fields (all optional, only provided fields are updated):
 *   table_ordering                 boolean
 *   reservations_enabled           boolean
 *   default_reservation_duration   int  (15–240 minutes)
 *   reservations_lead_time_hours   int  (0–168)
 *   reservations_max_party_size    int  (1–50)
 *   reservations_max_advance_days  int  (1–365)
 *
 * Optional body field:
 *   listing_city   string — city slug used to revalidatePath for the listing page.
 *                           Required to bust ISR cache when reservations_enabled changes.
 *   // TODO: Store listing_city on the menus table so future PATCH calls don't
 *   //       need to be told where their own listing lives.
 *
 * Also returns open_order_count when table_ordering is being set to false,
 * so the client can warn before confirming.
 *
 * Seed behaviour: if reservations_enabled is flipping false → true AND the menu
 * has zero restaurant_areas, two default areas are inserted (Indoor 30, Terrace 20).
 */

export async function PATCH(req: NextRequest) {
  try {
    const { userId, isAdmin, supabase } = await getMenuAuth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      menu_id,
      table_ordering,
      reservations_enabled,
      default_reservation_duration,
      reservations_lead_time_hours,
      reservations_max_party_size,
      reservations_max_advance_days,
      listing_city,
    } = body;

    if (!menu_id) {
      return NextResponse.json({ error: "menu_id required" }, { status: 400 });
    }

    // Verify ownership (returns id, slug only)
    const accessCheck = await verifyMenuAccess(supabase, menu_id, userId, isAdmin);
    if (!accessCheck) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch current menu state for seed + revalidatePath logic
    const { data: menu } = await adminClient
      .from("menus")
      .select("id, slug, listing_slug, reservations_enabled")
      .eq("id", menu_id)
      .single();
    if (!menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 });
    }

    // Build update payload — only include fields that were provided
    const updates: Record<string, unknown> = {};

    if (typeof table_ordering === "boolean") {
      updates.table_ordering = table_ordering;
    }
    if (typeof reservations_enabled === "boolean") {
      updates.reservations_enabled = reservations_enabled;
    }
    if (typeof default_reservation_duration === "number") {
      const v = Math.round(default_reservation_duration);
      if (v < 15 || v > 240) {
        return NextResponse.json(
          { error: "default_reservation_duration must be 15–240 minutes" },
          { status: 400 },
        );
      }
      updates.default_reservation_duration = v;
    }
    if (typeof reservations_lead_time_hours === "number") {
      const v = Math.round(reservations_lead_time_hours);
      if (v < 0 || v > 168) {
        return NextResponse.json(
          { error: "reservations_lead_time_hours must be 0–168" },
          { status: 400 },
        );
      }
      updates.reservations_lead_time_hours = v;
    }
    if (typeof reservations_max_party_size === "number") {
      const v = Math.round(reservations_max_party_size);
      if (v < 1 || v > 50) {
        return NextResponse.json(
          { error: "reservations_max_party_size must be 1–50" },
          { status: 400 },
        );
      }
      updates.reservations_max_party_size = v;
    }
    if (typeof reservations_max_advance_days === "number") {
      const v = Math.round(reservations_max_advance_days);
      if (v < 1 || v > 365) {
        return NextResponse.json(
          { error: "reservations_max_advance_days must be 1–365" },
          { status: 400 },
        );
      }
      updates.reservations_max_advance_days = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Check if reservations_enabled is flipping false → true (needed for seed logic)
    const isEnablingReservations =
      updates.reservations_enabled === true && menu.reservations_enabled === false;

    const { error } = await adminClient
      .from("menus")
      .update(updates)
      .eq("id", menu_id);

    if (error) {
      console.error("[menu/settings PATCH] error:", error);
      return NextResponse.json({ error: "Failed to update settings." }, { status: 500 });
    }

    // ── Seed default areas when enabling reservations for the first time ──
    // If reservations_enabled is flipping false → true and the menu has zero areas,
    // insert two defaults: Indoor (30 covers) and Terrace (20 covers).
    // (Alternative was a DB trigger; chosen here for visibility and easy override.)
    let seededAreas = false;
    if (isEnablingReservations) {
      const { count } = await adminClient
        .from("restaurant_areas")
        .select("id", { count: "exact", head: true })
        .eq("menu_id", menu_id);

      if ((count ?? 0) === 0) {
        await adminClient.from("restaurant_areas").insert([
          { menu_id, name: "Indoor", capacity_total: 30, display_order: 0 },
          { menu_id, name: "Terrace", capacity_total: 20, display_order: 1 },
        ]);
        seededAreas = true;
      }
    }

    // ── If disabling table ordering, return count of open orders for client warning ──
    let open_order_count: number | null = null;
    if (table_ordering === false) {
      const { count } = await adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("menu_id", menu_id)
        .in("status", ["new", "preparing"]);
      open_order_count = count ?? 0;
    }

    // ── Cache invalidation ──
    revalidateTag(`menu:${menu_id}`, "default");
    revalidatePath(`/m/${menu.slug}`);

    // Bust the listing page ISR cache when reservations_enabled changes
    if ("reservations_enabled" in updates && listing_city && menu.listing_slug) {
      const citySlug = String(listing_city).toLowerCase().replace(/\s+/g, "-");
      revalidatePath(`/restaurants/${citySlug}/${menu.listing_slug}`);
    }

    return NextResponse.json({
      success: true,
      ...updates,
      open_order_count,
      seeded_areas: seededAreas,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
