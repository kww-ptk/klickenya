import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import { isAllowedImageHost } from "@/lib/images/remoteHost";
import { FOOD_TAGS } from "./foodTags";

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
  /** Number that receives orders over WhatsApp; "" when none is set. */
  whatsappPhone: string;
  canBook: boolean; // table reservations are live
  canDeliver: boolean; // delivery — dormant until P0 ships
};

type MenuRow = {
  slug: string | null;
  business_id: string | null;
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
          "slug, listing_slug, ordering_enabled, table_ordering, takeaway_enabled, delivery_enabled, reservations_enabled, business_id",
        )
        .eq("is_published", true);

      if (error) {
        console.error("[eat/menus] query failed:", error.message);
        return map;
      }

      const rows = (data ?? []) as MenuRow[];

      // menus.whatsapp_phone arrives in migration 086 and is read in its OWN
      // query on purpose. Folding it into the select above would mean that,
      // on any database where the migration has not run yet, PostgREST fails
      // the whole request and every capability silently disappears — the exact
      // column-drift failure CLAUDE.md documents. Here a missing column costs
      // only the phone numbers.
      const menuPhones = new Map<string, string>();
      {
        const { data: phoneRows, error: phoneErr } = await adminClient
          .from("menus")
          .select("listing_slug, whatsapp_phone")
          .eq("is_published", true);
        if (phoneErr) {
          console.warn(
            "[eat/menus] whatsapp_phone unavailable (migration 086 not applied?):",
            phoneErr.message,
          );
        } else {
          for (const r of (phoneRows ?? []) as {
            listing_slug: string | null;
            whatsapp_phone: string | null;
          }[]) {
            if (r.listing_slug && r.whatsapp_phone?.trim()) {
              menuPhones.set(r.listing_slug.trim(), r.whatsapp_phone.trim());
            }
          }
        }
      }

      // Fallback only: the account holder's personal number, shared across all
      // their listings. Used when a menu has not set its own.
      const ownerPhones = new Map<string, string>();
      const ownerIds = [...new Set(rows.map((r) => r.business_id).filter(Boolean))] as string[];
      if (ownerIds.length > 0) {
        const { data: hosts } = await adminClient
          .from("host_profiles")
          .select("user_id, phone")
          .in("user_id", ownerIds);
        for (const h of (hosts ?? []) as { user_id: string; phone: string | null }[]) {
          if (h.phone) ownerPhones.set(h.user_id, h.phone);
        }
      }

      for (const row of rows) {
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
          whatsappPhone:
            menuPhones.get(key) ||
            (row.business_id ? (ownerPhones.get(row.business_id) ?? "") : ""),
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

/* ── Menus with items ───────────────────────────────────── */

export type MenuItemLite = {
  /** menu_items.id — required by POST /api/orders. */
  id: string;
  name: string;
  priceKes: number;
  description: string;
  photo: string; // "" when absent or from a host we will not serve
};

export type MenuSectionLite = { title: string; items: MenuItemLite[] };

export type RestaurantMenu = {
  /** menus.id — POST /api/orders keys on the uuid, not the slug. */
  menuId: string;
  menuSlug: string;
  sections: MenuSectionLite[];
  /** Dish tags derived from item names — pizza, sushi, burgers and so on. */
  foodTags: string[];
};


type ItemRow = {
  id: string | null;
  name: string | null;
  price_kes: number | null;
  description: string | null;
  photo_url: string | null;
  display_order: number | null;
  menu_sections: {
    title: string | null;
    display_order: number | null;
    menus: { id: string | null; slug: string | null; listing_slug: string | null } | null;
  } | null;
};

/**
 * Every published menu's items, grouped by listing slug.
 *
 * One query for the lot — there are ~160 available items in total, so paging
 * per restaurant would be far more expensive than fetching everything once.
 * Photos are filtered through the host allowlist here rather than at render:
 * a hotlinked URL took a whole menu page down in production once already.
 */
export const getMenusWithItems = cache(
  async (): Promise<Map<string, RestaurantMenu>> => {
    const out = new Map<string, RestaurantMenu>();

    try {
      const { data, error } = await adminClient
        .from("menu_items")
        .select(
          "id, name, price_kes, description, photo_url, display_order, menu_sections!inner(title, display_order, menus!inner(id, slug, listing_slug, is_published))",
        )
        .eq("is_available", true)
        .eq("menu_sections.menus.is_published", true);

      if (error) {
        console.error("[eat/menu-items] query failed:", error.message);
        return out;
      }

      const rows = (data ?? []) as unknown as ItemRow[];

      for (const row of rows) {
        const menu = row.menu_sections?.menus;
        const key = menu?.listing_slug?.trim();
        if (!key || !row.name || !row.id) continue;

        let entry = out.get(key);
        if (!entry) {
          entry = {
            menuId: menu?.id ?? "",
            menuSlug: menu?.slug ?? "",
            sections: [],
            foodTags: [],
          };
          out.set(key, entry);
        }

        const title = row.menu_sections?.title?.trim() || "Menu";
        let section = entry.sections.find((s) => s.title === title);
        if (!section) {
          section = { title, items: [] };
          entry.sections.push(section);
        }

        section.items.push({
          id: row.id,
          name: row.name,
          priceKes: row.price_kes ?? 0,
          description: row.description ?? "",
          photo: isAllowedImageHost(row.photo_url) ? row.photo_url! : "",
        });

        for (const { tag, re } of FOOD_TAGS) {
          if (!entry.foodTags.includes(tag) && re.test(row.name)) {
            entry.foodTags.push(tag);
          }
        }
      }

      for (const entry of out.values()) {
        entry.sections.sort((a, b) => a.title.localeCompare(b.title));
        entry.foodTags.sort();
      }
    } catch (err) {
      console.error("[eat/menu-items] unexpected error:", err);
    }

    return out;
  },
);

/* ── Who earns a place on /eat ──────────────────────────── */

/**
 * Should this restaurant appear on the eat surfaces?
 *
 * The marketplace lists everywhere worth knowing about. /eat is for places a
 * guest can act on right now, so a restaurant needs a published menu AND at
 * least one live capability behind it. That takes the list from 38 to 6 and
 * removes cards that do nothing when tapped.
 *
 * The intent is to gate on delivery. Today `delivery_enabled` is false on
 * every published menu and `takeaway_enabled` is too, so gating on either
 * would render an empty page — not a filter, an outage. The gate therefore
 * accepts booking as well, and tightens on its own as restaurants switch
 * things on:
 *
 *   delivery only  → change the body to `Boolean(cap?.canDeliver)`
 *   ordering only  → `Boolean(cap?.canOrder || cap?.canDeliver)`
 *
 * Both are one line, and both are correct the day the data supports them.
 */
export function isEatEligible(cap: MenuCapability | undefined): boolean {
  if (!cap) return false; // no published menu linked to this listing
  return cap.canDeliver || cap.canOrder || cap.canOrderAtTable || cap.canBook;
}



/* ── Reservation settings ───────────────────────────────── */

export type ReservationConfig = {
  menuId: string;
  menuName: string;
  leadTimeHours: number;
  maxPartySize: number;
  maxAdvanceDays: number;
  areas: {
    id: string;
    name: string;
    capacity_total: number;
    color_hex: string | null;
    display_order: number;
  }[];
  timeWindows: { open_time: string; close_time: string; is_active?: boolean }[];
  restaurantPhone: string | null;
};

/**
 * Everything ReservationSheet needs, for every restaurant that takes bookings,
 * keyed by listing slug.
 *
 * Fetched up front with the rest of the flow so booking can open in place
 * rather than sending the guest to the listing page. Three queries for the
 * whole set beats one per restaurant on tap, and the panel then opens with no
 * spinner.
 *
 * Only menus with reservations_enabled are included — there is nothing to
 * configure for the others and no reason to pay for their rows.
 */
export const getReservationConfigs = cache(
  async (): Promise<Map<string, ReservationConfig>> => {
    const out = new Map<string, ReservationConfig>();

    try {
      const { data: menus, error } = await adminClient
        .from("menus")
        .select(
          "id, name, listing_slug, business_id, reservations_lead_time_hours, reservations_max_party_size, reservations_max_advance_days",
        )
        .eq("is_published", true)
        .eq("reservations_enabled", true);

      if (error) {
        console.error("[eat/reservations] query failed:", error.message);
        return out;
      }

      const rows = (menus ?? []) as {
        id: string;
        name: string | null;
        listing_slug: string | null;
        business_id: string | null;
        reservations_lead_time_hours: number | null;
        reservations_max_party_size: number | null;
        reservations_max_advance_days: number | null;
      }[];
      if (rows.length === 0) return out;

      const menuIds = rows.map((r) => r.id);
      const ownerIds = [...new Set(rows.map((r) => r.business_id).filter(Boolean))] as string[];

      const [areasRes, windowsRes, hostsRes] = await Promise.all([
        adminClient
          .from("restaurant_areas")
          .select("id, name, capacity_total, color_hex, display_order, menu_id")
          .in("menu_id", menuIds)
          .eq("is_active", true),
        adminClient
          .from("reservation_time_windows")
          .select("menu_id, open_time, close_time, is_active")
          .in("menu_id", menuIds),
        ownerIds.length
          ? adminClient.from("host_profiles").select("user_id, phone").in("user_id", ownerIds)
          : Promise.resolve({ data: [] as { user_id: string; phone: string | null }[] }),
      ]);

      const areasByMenu = new Map<string, ReservationConfig["areas"]>();
      for (const a of (areasRes.data ?? []) as (ReservationConfig["areas"][number] & {
        menu_id: string;
      })[]) {
        const list = areasByMenu.get(a.menu_id) ?? [];
        list.push({
          id: a.id,
          name: a.name,
          capacity_total: a.capacity_total ?? 0,
          color_hex: a.color_hex ?? null,
          display_order: a.display_order ?? 0,
        });
        areasByMenu.set(a.menu_id, list);
      }

      const windowsByMenu = new Map<string, ReservationConfig["timeWindows"]>();
      for (const w of (windowsRes.data ?? []) as (ReservationConfig["timeWindows"][number] & {
        menu_id: string;
      })[]) {
        const list = windowsByMenu.get(w.menu_id) ?? [];
        list.push({ open_time: w.open_time, close_time: w.close_time, is_active: w.is_active });
        windowsByMenu.set(w.menu_id, list);
      }

      const phones = new Map<string, string>();
      for (const h of ((hostsRes as { data?: { user_id: string; phone: string | null }[] })
        .data ?? [])) {
        if (h.phone) phones.set(h.user_id, h.phone);
      }

      for (const r of rows) {
        const key = r.listing_slug?.trim();
        if (!key || out.has(key)) continue;
        out.set(key, {
          menuId: r.id,
          menuName: r.name ?? "",
          leadTimeHours: r.reservations_lead_time_hours ?? 2,
          maxPartySize: r.reservations_max_party_size ?? 12,
          maxAdvanceDays: r.reservations_max_advance_days ?? 30,
          areas: areasByMenu.get(r.id) ?? [],
          timeWindows: windowsByMenu.get(r.id) ?? [],
          restaurantPhone: r.business_id ? (phones.get(r.business_id) ?? null) : null,
        });
      }
    } catch (err) {
      console.error("[eat/reservations] unexpected error:", err);
    }

    return out;
  },
);
