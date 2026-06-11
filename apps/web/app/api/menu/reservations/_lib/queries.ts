/**
 * queries.ts — Shared reservation query helper used by both:
 *   - GET /api/menu/reservations (owner API endpoint)
 *   - /dashboard/listings/[id]/reservations/page.tsx (server component initial fetch)
 *
 * Single source of truth for the V1 reservation row shape and default window.
 */

import { adminClient } from "@/lib/supabase/admin";

export interface ReservationRow {
  id: string;
  menu_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  party_size: number;
  reserved_for: string;
  duration_minutes: number;
  area_id: string | null;
  status: string;
  source: string;
  source_origin: string | null;
  source_ref: string | null;
  guest_message: string | null;
  owner_note: string | null;
  decline_reason: string | null;
  approved_at: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
  // Flattened from area join
  area_name: string | null;
  area_color_hex: string | null;
}

const SELECT_FIELDS = [
  "id",
  "menu_id",
  "guest_name",
  "guest_phone",
  "guest_email",
  "party_size",
  "reserved_for",
  "duration_minutes",
  "area_id",
  "status",
  "source",
  "source_origin",
  "source_ref",
  "guest_message",
  "owner_note",
  "decline_reason",
  "approved_at",
  "checked_in_at",
  "created_at",
  "updated_at",
  // Area join — flattened to area_name / area_color_hex below
  "area:restaurant_areas!area_id(name, color_hex)",
].join(", ");

type RawArea = { name: string; color_hex: string | null } | null;
type RawRow = Record<string, unknown> & { area: RawArea };

/**
 * Fetch reservations for a menu.
 *
 * @param menuId  UUID of the menu to fetch reservations for.
 * @param since   Optional ISO timestamp. When provided, only rows with
 *                updated_at >= since are returned (incremental sync).
 *                When omitted, returns the default 30-day window (reserved_for
 *                >= 30 days ago, capturing all future reservations too).
 */
export async function fetchReservations(
  menuId: string,
  since?: string,
): Promise<ReservationRow[]> {
  let query = adminClient
    .from("reservations")
    .select(SELECT_FIELDS)
    .eq("menu_id", menuId)
    .order("reserved_for", { ascending: true });

  if (since) {
    // Incremental sync: rows changed since the caller's last poll timestamp
    query = query.gte("updated_at", since);
  } else {
    // Default window: last 30 days + all future reservations.
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gte("reserved_for", thirtyDaysAgo);
  }

  // TODO V2: Add cursor pagination when historical window extends beyond 30 days.

  const { data, error } = await query;

  if (error) throw error;

  return ((data ?? []) as unknown as RawRow[]).map(({ area, ...rest }) => ({
    ...rest,
    area_name: area?.name ?? null,
    area_color_hex: area?.color_hex ?? null,
  })) as ReservationRow[];
}
