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
            id, title, display_order, is_visible,
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
          "id, table_number, capacity, floor_section, is_active, display_order",
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
        .select("id, slug, display_name, listing_slug, is_published")
        .eq("id", menuId)
        .eq("business_id", ownerId)
        .single();
      return data;
    },
    ["menu", ownerId, menuId, "qr"],
    { tags: [`menu:${menuId}`, `owner:${ownerId}`] },
  )();
