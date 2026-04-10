import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
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

/* ── Time helpers ────────────────────────────────────────────────────────── */

function timeToMinutes(t: string): number {
  const parts = t.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function normalizeTime(t: string): string {
  return t.slice(0, 5); // "12:00:00" → "12:00"
}

// Parse Sanity opening hours string for bookable hours derivation
function parseSanityHoursForBookable(str: string): { openTime: string; closeTime: string } | null {
  const timeRe = /(\d{1,2}(?::\d{2})?)\s*(am|pm)\s*[–\-\u2013]\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)/i;
  const m = str.match(timeRe);
  if (!m) return null;

  function parse12h(timeStr: string, ampm: string): string {
    const [hRaw, mRaw] = timeStr.split(":");
    let h = parseInt(hRaw, 10);
    const min = mRaw ? parseInt(mRaw, 10) : 0;
    if (ampm.toUpperCase() === "PM" && h !== 12) h += 12;
    if (ampm.toUpperCase() === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  const openTime = parse12h(m[1], m[2]);
  const rawClose = parse12h(m[3], m[4]);

  // Apply 90-minute kitchen buffer to close time
  const closeMins = timeToMinutes(rawClose) - 90;
  if (closeMins <= timeToMinutes(openTime)) return null; // sanity check
  const closeTime = `${String(Math.floor(closeMins / 60)).padStart(2, "0")}:${String(closeMins % 60).padStart(2, "0")}`;

  return { openTime, closeTime };
}

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
      reservations_open_time,
      reservations_close_time,
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
      .select("id, slug, listing_slug, reservations_enabled, reservations_open_time, reservations_close_time")
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

    // Time fields — validate merged state (open < close)
    if (typeof reservations_open_time === "string" || typeof reservations_close_time === "string") {
      const effectiveOpen = normalizeTime(
        typeof reservations_open_time === "string"
          ? reservations_open_time
          : (menu.reservations_open_time ?? "12:00:00"),
      );
      const effectiveClose = normalizeTime(
        typeof reservations_close_time === "string"
          ? reservations_close_time
          : (menu.reservations_close_time ?? "21:00:00"),
      );
      if (timeToMinutes(effectiveClose) <= timeToMinutes(effectiveOpen)) {
        return NextResponse.json(
          { error: "Last booking time must be after Open from." },
          { status: 400 },
        );
      }
      if (typeof reservations_open_time === "string") updates.reservations_open_time = effectiveOpen;
      if (typeof reservations_close_time === "string") updates.reservations_close_time = effectiveClose;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Check if reservations_enabled is flipping false → true (needed for seed logic)
    const isEnablingReservations =
      updates.reservations_enabled === true && menu.reservations_enabled === false;

    // ── Pre-update: Derive bookable hours from Sanity on first enable ──
    if (isEnablingReservations) {
      const currentOpen = normalizeTime(menu.reservations_open_time ?? "12:00:00");
      const currentClose = normalizeTime(menu.reservations_close_time ?? "21:00:00");
      if (
        currentOpen === "12:00" && currentClose === "21:00" && menu.listing_slug
        && !updates.reservations_open_time && !updates.reservations_close_time
      ) {
        try {
          const sanityListing = await sanityClient.fetch<{ openingHours?: string | null } | null>(
            `*[_type == "listing" && slug.current == $slug][0]{ openingHours }`,
            { slug: menu.listing_slug },
          );
          if (sanityListing?.openingHours) {
            const derived = parseSanityHoursForBookable(sanityListing.openingHours);
            if (derived) {
              updates.reservations_open_time = derived.openTime;
              updates.reservations_close_time = derived.closeTime;
            }
          }
        } catch {
          // Non-blocking — if Sanity is unavailable, keep migration defaults
        }
      }
    }

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

    // Bust the listing page ISR cache when reservations_enabled changes.
    // Prefer listing_city from the request body; fall back to a Sanity lookup so
    // the revalidation fires even when the client didn't send the city.
    if ("reservations_enabled" in updates && menu.listing_slug) {
      let resolvedCity: string | null = listing_city
        ? String(listing_city).toLowerCase().replace(/\s+/g, "-")
        : null;

      if (!resolvedCity) {
        try {
          const sanityListing = await sanityClient.fetch<{ city: string } | null>(
            `*[_type == "listing" && slug.current == $slug][0]{ city }`,
            { slug: menu.listing_slug },
          );
          if (sanityListing?.city) {
            resolvedCity = sanityListing.city.toLowerCase().replace(/\s+/g, "-");
          }
        } catch {
          // Non-blocking — continue without revalidating listing page
        }
      }

      if (resolvedCity) {
        revalidatePath(`/restaurants/${resolvedCity}/${menu.listing_slug}`);
      }
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
