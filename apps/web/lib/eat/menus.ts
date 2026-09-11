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
  /** Can a guest order from home? Takeaway only.
   *  NOT table_ordering — that is QR ordering while already seated in the
   *  venue, which is a different product and must never be advertised as
   *  "order online" to someone browsing from their sofa. */
  canOrder: boolean;
  /** QR ordering at a table inside the restaurant. */
  canOrderAtTable: boolean;
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
          canOrder: Boolean(row.takeaway_enabled),
          canOrderAtTable: Boolean(row.table_ordering || row.ordering_enabled),
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

/* ── Dishes ─────────────────────────────────────────────── */

export type Dish = {
  name: string;
  priceKes: number;
  section: string;
  restaurant: string;
  menuSlug: string;
  /** Sanity listing slug, so callers can attach the restaurant's photo,
   *  opening hours and verified status to the dish. */
  listingSlug: string;
  /** The dish's own photo, when the kitchen uploaded one. Only 2 of 162
   *  items currently have one, so callers must have a fallback. */
  photoUrl: string;
};

type DishRow = {
  name: string | null;
  price_kes: number | null;
  photo_url: string | null;
  menu_sections: {
    title: string | null;
    menus: {
      slug: string | null;
      name: string | null;
      listing_slug: string | null;
    } | null;
  } | null;
};

/**
 * Real dishes off live menus, for the "what people are eating" section.
 *
 * Deliberately typographic rather than photo-led: of 162 available items only
 * two carry a photo and none are flagged featured, so a photo grid would show
 * two dishes. Names and prices are the honest, and better, material — they are
 * also the long-tail search terms people actually type.
 *
 * Spreads across restaurants so one large menu cannot fill the section, and
 * skips the very top of the price range so it reads as "dinner here" rather
 * than a list of the most expensive things on the coast.
 */
export const getSampleDishes = cache(async (limit = 12): Promise<Dish[]> => {
  try {
    const { data, error } = await adminClient
      .from("menu_items")
      .select(
        "name, price_kes, photo_url, menu_sections!inner(title, menus!inner(slug, name, listing_slug, is_published))",
      )
      .eq("is_available", true)
      .eq("menu_sections.menus.is_published", true)
      .gt("price_kes", 0)
      .order("price_kes", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[eat/dishes] query failed:", error.message);
      return [];
    }

    const rows = (data ?? []) as unknown as DishRow[];
    const usable = rows.filter(
      (r) => r.name && r.price_kes && r.menu_sections?.menus?.slug,
    );

    // Drop the top decile — the outliers skew the whole section expensive.
    const trimmed = usable.slice(Math.floor(usable.length * 0.1));

    // Round-robin by restaurant so no single menu dominates.
    // A dish with its own photo is the only case where the image truly shows
    // the dish, so those sort to the front of each restaurant's queue.
    const ordered = [...trimmed].sort(
      (a, b) => Number(Boolean(b.photo_url)) - Number(Boolean(a.photo_url)),
    );

    const byRestaurant = new Map<string, DishRow[]>();
    for (const r of ordered) {
      const key = r.menu_sections!.menus!.slug!;
      const list = byRestaurant.get(key);
      if (list) list.push(r);
      else byRestaurant.set(key, [r]);
    }

    const out: Dish[] = [];
    let round = 0;
    while (out.length < limit) {
      let added = false;
      for (const list of byRestaurant.values()) {
        const row = list[round];
        if (!row) continue;
        out.push({
          name: row.name!,
          priceKes: row.price_kes!,
          section: row.menu_sections?.title ?? "",
          // Menu rows are often named "<Restaurant> Menu"; the suffix is noise
          // on a dish card, which already sits under an "On the menu" heading.
          restaurant: (row.menu_sections!.menus!.name ?? "")
            .replace(/\s+menu$/i, "")
            .trim(),
          menuSlug: row.menu_sections!.menus!.slug!,
          listingSlug: row.menu_sections!.menus!.listing_slug ?? "",
          photoUrl: row.photo_url ?? "",
        });
        added = true;
        if (out.length >= limit) break;
      }
      if (!added) break; // every menu exhausted
      round += 1;
    }

    return out;
  } catch (err) {
    console.error("[eat/dishes] unexpected error:", err);
    return [];
  }
});
