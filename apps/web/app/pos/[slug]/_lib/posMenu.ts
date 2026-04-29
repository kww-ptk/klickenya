import { adminClient } from "@/lib/supabase/admin";
import type { MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";

/**
 * Server-side fetch of the full menu (sections, items, option groups, options)
 * for the POS terminal. Mirrors the query used by /m/[slug]/page.tsx so the
 * waiter sees exactly the same items, prices, and option structure as guests.
 *
 * Filters out hidden sections and unavailable items at the client component
 * layer — we still ship them so the waiter UI can show "Unavailable" badges
 * without re-fetching when a stock toggle changes mid-shift.
 */
export async function fetchPosMenu(menuId: string): Promise<MenuSection[]> {
  const { data } = await adminClient
    .from("menu_sections")
    .select(`
      id, title, display_order, is_visible, menu_id,
      menu_items (
        id, name, description, price_kes,
        dietary_tags, is_available, display_order, photo_url, is_featured,
        item_option_groups (
          id, name, group_type, is_required, min_select, max_select, display_order,
          item_options (
            id, name, price_modifier, is_available, display_order
          )
        )
      )
    `)
    .eq("menu_id", menuId)
    .order("display_order");

  return (data ?? []) as unknown as MenuSection[];
}
