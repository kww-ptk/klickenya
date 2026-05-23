/**
 * Cached server-side read helpers for menu-related data.
 *
 * All helpers use `adminClient` (service-role, singleton) — never
 * `createClient()` which owns per-request cookie state.
 *
 * Tag scheme:
 *   owner:{ownerId}        — whole-business scope
 *   menu:{menuId}          — one menu tree
 *   menu:{menuId}:tables   — restaurant_tables for one menu
 */

import { unstable_cache } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type MenuRow = {
  id: string;
  slug: string;
  display_name: string | null;
  listing_slug: string | null;
  is_published: boolean;
  created_at: string;
  table_ordering: boolean | null;
};

/* ------------------------------------------------------------------ */
/*  1. getMenusForOwner                                               */
/* ------------------------------------------------------------------ */

export const getMenusForOwner = (ownerId: string) =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from("menus")
        .select(
          "id, slug, display_name, listing_slug, is_published, created_at, table_ordering",
        )
        .eq("business_id", ownerId)
        .order("listing_slug")
        .order("created_at", { ascending: true });
      return (data ?? []) as MenuRow[];
    },
    ["owner", ownerId, "menus"],
    { tags: [`owner:${ownerId}`] },
  )();

/* ------------------------------------------------------------------ */
/*  2. getMenuTree                                                    */
/* ------------------------------------------------------------------ */

export const getMenuTree = (menuId: string, ownerId: string) =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from("menus")
        .select(
          `
          id, slug, name, is_published, table_ordering,
          menu_sections (
            id, title, display_order, is_visible, station,
            menu_items (
              id, name, description, price_kes,
              dietary_tags, is_available, display_order, photo_url
            )
          )
        `,
        )
        .eq("id", menuId)
        .eq("business_id", ownerId)
        .single();
      return data;
    },
    ["menu", ownerId, menuId, "tree"],
    { tags: [`menu:${menuId}`, `owner:${ownerId}`] },
  )();

/* ------------------------------------------------------------------ */
/*  3. getOptionGroupsForItem                                         */
/* ------------------------------------------------------------------ */

export const getOptionGroupsForItem = (
  menuItemId: string,
  menuId: string,
  ownerId: string,
) =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from("item_option_groups")
        .select(
          `
          id, name, group_type, is_required, min_select, max_select, display_order,
          item_options (
            id, name, price_modifier, is_available, display_order
          )
        `,
        )
        .eq("menu_item_id", menuItemId)
        .order("display_order");
      return data ?? [];
    },
    ["menu", ownerId, menuId, "options", menuItemId],
    { tags: [`menu:${menuId}`, `owner:${ownerId}`] },
  )();

/* ------------------------------------------------------------------ */
/*  4. getTablesForMenu                                               */
/* ------------------------------------------------------------------ */

export const getTablesForMenu = (menuId: string, ownerId: string) =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from("restaurant_tables")
        .select(
          // Floor-map V1 reads pos_x/pos_y (percent 0-100) and area_id;
          // List view ignores them. Cached together because writes from
          // the editor invalidate the same `menu:{id}:tables` tag.
          "id, table_number, capacity, floor_section, is_active, display_order, pos_x, pos_y, area_id",
        )
        .eq("menu_id", menuId)
        .order("display_order", { ascending: true })
        .order("table_number", { ascending: true });
      return data ?? [];
    },
    ["menu", ownerId, menuId, "tables"],
    {
      tags: [
        `menu:${menuId}:tables`,
        `menu:${menuId}`,
        `owner:${ownerId}`,
      ],
    },
  )();

/* ------------------------------------------------------------------ */
/*  5. getMenuForQR                                                   */
/* ------------------------------------------------------------------ */

export const getMenuForQR = (menuId: string, ownerId: string) =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from("menus")
        .select("id, slug, display_name, listing_slug, is_published, table_ordering")
        .eq("id", menuId)
        .eq("business_id", ownerId)
        .single();
      return data;
    },
    ["menu", ownerId, menuId, "qr"],
    { tags: [`menu:${menuId}`, `owner:${ownerId}`] },
  )();

/* ------------------------------------------------------------------ */
/*  6. getMenuMetadata                                                */
/*                                                                    */
/*  Lightweight ownership + feature-flag lookup. Hot path: every page */
/*  under /dashboard/menu/[id]/stock/* checks this on render. Cached  */
/*  with the same menu/owner tags so toggling stock_enabled (via      */
/*  /api/stock/enable) or any menu setting (via /api/menu/settings)   */
/*  invalidates immediately.                                          */
/* ------------------------------------------------------------------ */

export type MenuMetadata = {
  id: string;
  name: string;
  slug: string;
  currency: string | null;
  is_published: boolean;
  table_ordering: boolean;
  reservations_enabled: boolean;
  ordering_enabled: boolean;
  takeaway_enabled: boolean;
  delivery_enabled: boolean;
  stock_enabled: boolean;
  stock_deduct_on: string;
};

export const getMenuMetadata = (menuId: string, ownerId: string) =>
  unstable_cache(
    async () => {
      const { data } = await adminClient
        .from("menus")
        .select(
          "id, name, slug, currency, is_published, table_ordering, reservations_enabled, ordering_enabled, takeaway_enabled, delivery_enabled, stock_enabled, stock_deduct_on",
        )
        .eq("id", menuId)
        .eq("business_id", ownerId)
        .maybeSingle();
      return (data as MenuMetadata | null) ?? null;
    },
    ["menu", ownerId, menuId, "meta"],
    { tags: [`menu:${menuId}`, `owner:${ownerId}`] },
  )();
