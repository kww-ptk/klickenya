import { cache } from "react";
import { adminClient } from "@/lib/supabase/admin";
import { isAllowedImageHost } from "@/lib/images/remoteHost";

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

/**
 * Dish tags, matched against item names.
 *
 * Section titles are free text and inconsistent ("Mains", "Main Courses",
 * "Main Menu", "sandwiches", "Burger" vs "Burgers"), and half of them are
 * course names rather than food types. Item names are the more reliable
 * signal for "does this kitchen do pizza".
 */
export const FOOD_TAGS: { tag: string; re: RegExp }[] = [
  { tag: "Pizza", re: /\b(pizza|calzone|margherita)/i },
  { tag: "Burgers", re: /\bburger/i },
  { tag: "Pasta", re: /\b(pasta|spaghetti|lasagn|penne|tagliatell|ravioli|gnocchi|linguin)/i },
  { tag: "Sushi", re: /\b(sushi|sashimi|maki|nigiri)/i },
  { tag: "Seafood", re: /\b(prawn|shrimp|octopus|calamari|squid|snapper|lobster|crab|fish|tuna|seafood|oyster)/i },
  { tag: "Grills", re: /\b(grill|bbq|steak|wagyu|fillet|ribs|skewer)/i },
  { tag: "Salads", re: /\bsalad/i },
  { tag: "Desserts", re: /\b(dessert|gelato|tiramis|cake|ice ?cream|brownie|panna)/i },
  { tag: "Vegetarian", re: /\b(vegetarian|vegan|veggie)/i },
  { tag: "Drinks", re: /\b(cocktail|mojito|juice|coffee|beer|wine|smoothie|dawa)/i },
];

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


/**
 * Does this text belong to a dish tag?
 *
 * Used both to build the tags and, later, to find which menu section a chosen
 * tag refers to. Section titles are free text — "Pizza", "Burger", "Burgers",
 * "sandwiches" — so a title is checked against the same pattern as item names
 * rather than compared literally.
 */
export function matchesFoodTag(text: string, tag: string): boolean {
  const entry = FOOD_TAGS.find((t) => t.tag === tag);
  if (!entry) return false;
  return entry.re.test(text);
}
