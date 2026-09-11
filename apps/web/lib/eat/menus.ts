import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";

/**
 * What a restaurant can actually do right now, keyed by its Sanity listing slug.
 *
 * /eat promises "book it or order it", so the cards have to reflect real
 * capability rather than assuming every restaurant is orderable. Everything
 * here comes from the Supabase `menus` row the host controls.
 */
export type MenuCapability = {
  menuSlug: string;
  canOrder: boolean; // takeaway or in-venue ordering is live
  canBook: boolean; // table reservations are live
  canDeliver: boolean; // delivery — dormant until P0 ships
};

type MenuRow = {
  slug: string | null;
  listing_slug: string | null;
  ordering_enabled: boolean | null;
  table_ordering: boolean | null;
  takeaway_enabled: boolean | null;
  delivery_enabled: boolean | null;
  reservations_enabled: boolean | null;
};

/**
 * One query for every published menu, mapped by listing slug.
 *
 * React-cached so a page rendering both a grid and a hero pays for it once.
 * Returns an empty map on failure — /eat degrades to "no ordering badges"
 * rather than failing to render.
 *
 * Note: `listing_slug` is not unique in practice. A listing with two menu rows
 * is a known data fault (it silently breaks the restaurant dashboard too), so
 * first row wins here and the duplicate is logged rather than hidden.
 */
export const getMenuCapabilities = cache(
  async (): Promise<Map<string, MenuCapability>> => {
    const map = new Map<string, MenuCapability>();

    try {
      const { data, error } = await adminClient
        .from("menus")
        .select(
          "slug, listing_slug, ordering_enabled, table_ordering, takeaway_enabled, delivery_enabled, reservations_enabled",
        )
        .eq("is_published", true);

      if (error) {
        console.error("[eat/menus] query failed:", error.message);
        return map;
      }

      for (const row of (data ?? []) as MenuRow[]) {
        const key = row.listing_slug?.trim();
        if (!key) continue;
        if (map.has(key)) {
          console.warn(`[eat/menus] duplicate menu for listing_slug "${key}" — using the first`);
          continue;
        }
        map.set(key, {
          menuSlug: row.slug ?? "",
          canOrder: Boolean(row.takeaway_enabled || row.ordering_enabled || row.table_ordering),
          canBook: Boolean(row.reservations_enabled),
          canDeliver: Boolean(row.delivery_enabled),
        });
      }
    } catch (err) {
      console.error("[eat/menus] unexpected error:", err);
    }

    return map;
  },
);
