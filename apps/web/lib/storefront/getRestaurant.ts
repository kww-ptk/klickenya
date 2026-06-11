import { cache } from "react";
import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import type { Partner } from "@/lib/partner/types";
import { PARTNER_RESTAURANT_LISTING_QUERY } from "@/lib/partner/queries";
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface SanityListingPhoto {
  url: string;
  alt: string | null;
}

interface SanityRestaurantListing {
  _id: string;
  title: string;
  slug: string;
  type: string | null;
  city: string | null;
  county: string | null;
  address: string | null;
  // description is a Portable Text array — leave as unknown[] to avoid
  // pulling in @portabletext types as a hard dep in this resolver
  description: unknown[] | null;
  openingHours: string | null;
  cuisine: string[] | null;
  priceRange: string | null;
  atmosphere: string | null;
  photos: SanityListingPhoto[] | null;
}

interface MenuItemOption {
  id: string;
  name: string;
  price_modifier: number;
  is_available: boolean;
  display_order: number;
}

interface ItemOptionGroup {
  id: string;
  name: string;
  group_type: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  display_order: number;
  item_options: MenuItemOption[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  dietary_tags: string[] | null;
  is_available: boolean;
  display_order: number;
  photo_url: string | null;
  item_option_groups: ItemOptionGroup[];
}

interface MenuSection {
  id: string;
  title: string;
  display_order: number;
  is_visible: boolean;
  station: string | null;
  menu_items: MenuItem[];
}

export interface StorefrontMenu {
  id: string;
  name: string;
  slug: string | null;
  listing_slug: string | null;
  business_id: string | null;
  is_published: boolean;
  table_ordering: boolean;
  reservations_enabled: boolean;
  default_reservation_duration: number;
  reservations_lead_time_hours: number;
  reservations_max_party_size: number;
  reservations_max_advance_days: number;
  menu_sections: MenuSection[];
}

export interface StorefrontRestaurant {
  listing: SanityRestaurantListing;
  menu: StorefrontMenu | null;
  areas: RestaurantArea[];
  timeWindows: Array<{ open_time: string; close_time: string; is_active: boolean }>;
  restaurantPhone: string | null;
}

/* ── Resolver ───────────────────────────────────────────────────────────── */

export const getRestaurant = cache(
  async (partner: Partner): Promise<StorefrontRestaurant | null> => {
    // 1. Fetch the partner's primary published restaurant listing from Sanity
    const listing = await sanityClient.fetch<SanityRestaurantListing | null>(
      PARTNER_RESTAURANT_LISTING_QUERY,
      { partnerId: partner._id },
      { next: { revalidate: 60 } },
    );

    if (!listing || !listing.slug) return null;

    // 2. Fetch the linked Supabase menu by listing_slug
    const { data: menuData } = await adminClient
      .from("menus")
      .select(
        `
        id, name, slug, listing_slug, business_id, is_published, table_ordering,
        reservations_enabled, default_reservation_duration,
        reservations_lead_time_hours, reservations_max_party_size,
        reservations_max_advance_days,
        menu_sections (
          id, title, display_order, is_visible, station,
          menu_items (
            id, name, description, price_kes,
            dietary_tags, is_available, display_order, photo_url,
            item_option_groups (
              id, name, group_type, is_required, min_select, max_select, display_order,
              item_options (
                id, name, price_modifier, is_available, display_order
              )
            )
          )
        )
      `,
      )
      .eq("listing_slug", listing.slug)
      .eq("is_published", true)
      .maybeSingle();

    const menu = menuData as StorefrontMenu | null;

    // 3. If a menu exists, fetch areas / time windows / host phone in parallel
    let areas: RestaurantArea[] = [];
    let timeWindows: Array<{ open_time: string; close_time: string; is_active: boolean }> = [];
    let restaurantPhone: string | null = null;

    if (menu) {
      const parallelFetches: Promise<unknown>[] = [];

      // Always fetch the host phone when we have a business_id
      if (menu.business_id) {
        parallelFetches.push(
          Promise.resolve(
            adminClient
              .from("host_profiles")
              .select("phone")
              .eq("user_id", menu.business_id)
              .maybeSingle(),
          ).then(({ data }) => {
            restaurantPhone = (data as { phone: string | null } | null)?.phone ?? null;
          }),
        );
      }

      // Fetch areas + time windows only when reservations are enabled
      if (menu.reservations_enabled) {
        const [areasResult, windowsResult] = await Promise.allSettled([
          adminClient
            .from("restaurant_areas")
            .select("id, name, capacity_total, color_hex, display_order, is_active")
            .eq("menu_id", menu.id)
            .eq("is_active", true)
            .order("display_order"),
          adminClient
            .from("reservation_time_windows")
            .select("open_time, close_time, is_active")
            .eq("menu_id", menu.id)
            .eq("is_active", true)
            .order("display_order"),
        ]);
        areas =
          areasResult.status === "fulfilled"
            ? ((areasResult.value.data ?? []) as RestaurantArea[])
            : [];
        timeWindows =
          windowsResult.status === "fulfilled"
            ? ((windowsResult.value.data ?? []) as Array<{
                open_time: string;
                close_time: string;
                is_active: boolean;
              }>)
            : [];
      }

      // Await the phone fetch (and any other parallel tasks)
      if (parallelFetches.length > 0) {
        await Promise.allSettled(parallelFetches);
      }
    }

    // 4. Return the assembled storefront data
    return { listing, menu, areas, timeWindows, restaurantPhone };
  },
);
