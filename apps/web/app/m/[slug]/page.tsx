import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import type { MenuData, MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuWithFilters } from "@/components/menu/MenuWithFilters";
import { MenuWithCart } from "@/components/menu/MenuWithCart";
import { ScanTracker } from "@/components/menu/ScanTracker";
import { ReservationSheet } from "@/components/reservations/ReservationSheet";
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";

export const revalidate = 60;

/* ── Types ─────────────────────────────────────────────────────────────── */

// Extends MenuData with flags used only by this page
type MenuWithOrdering = MenuData & {
  table_ordering: boolean;
  reservations_enabled: boolean;
  default_reservation_duration: number;
  reservations_lead_time_hours: number;
  reservations_max_party_size: number;
  reservations_max_advance_days: number;
  listing_slug: string | null;
  reservations_open_time: string;
  reservations_close_time: string;
};

/* ── Data fetching ─────────────────────────────────────────────────────── */

async function getMenu(slug: string): Promise<{
  menu: MenuWithOrdering;
  areas: RestaurantArea[];
  restaurantPhone: string | null;
} | null> {
  const { data } = await adminClient
    .from("menus")
    .select(
      `
      id, name, is_published, table_ordering,
      reservations_enabled, default_reservation_duration,
      reservations_lead_time_hours, reservations_max_party_size,
      reservations_max_advance_days, listing_slug, business_id,
      reservations_open_time, reservations_close_time,
      menu_sections (
        id, title, display_order, is_visible,
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
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!data) return null;

  // Add slug to satisfy MenuData shape
  const menu = { ...data, slug } as MenuWithOrdering;

  // Fetch active restaurant areas (for ReservationSheet area chips)
  let areas: RestaurantArea[] = [];
  if (menu.reservations_enabled) {
    const { data: areasData } = await adminClient
      .from("restaurant_areas")
      .select("id, name, capacity_total, color_hex, display_order, is_active")
      .eq("menu_id", data.id)
      .eq("is_active", true)
      .order("display_order");
    areas = (areasData ?? []) as RestaurantArea[];
  }

  // Fetch restaurant phone for WhatsApp link on success screen
  let restaurantPhone: string | null = null;
  if (data.business_id) {
    const { data: hostProfile } = await adminClient
      .from("host_profiles")
      .select("phone")
      .eq("user_id", data.business_id)
      .single();
    restaurantPhone = hostProfile?.phone ?? null;
  }

  return { menu, areas, restaurantPhone };
}

/* ── Static params ─────────────────────────────────────────────────────── */

export async function generateStaticParams() {
  const { data: menus } = await adminClient
    .from("menus")
    .select("slug")
    .eq("is_published", true);

  return (menus ?? []).map((m) => ({ slug: m.slug }));
}

/* ── Metadata ──────────────────────────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ action?: string; table?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getMenu(slug);
  if (!result) return {};

  return {
    title: `${result.menu.name} | Klickenya`,
    description: `View the full menu for ${result.menu.name}. Scan, browse, order.`,
    robots: { index: true, follow: true },
  };
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function prepareSections(menu: MenuWithOrdering): MenuSection[] {
  return menu.menu_sections
    .filter((s) => s.is_visible && s.menu_items.length > 0)
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => ({
      ...s,
      menu_items: [...s.menu_items].sort((a, b) => {
        if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
        return a.display_order - b.display_order;
      }),
    }));
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default async function MenuPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { action, table: prefilledTable } = await searchParams;

  const result = await getMenu(slug);
  if (!result) notFound();

  const { menu, areas, restaurantPhone } = result;

  const sections = prepareSections(menu);
  if (sections.length === 0) notFound();

  const showBookButton = menu.reservations_enabled;
  const defaultOpenSheet = action === "book" && showBookButton;

  return (
    <div className="min-h-screen bg-canvas">
      <ScanTracker menuId={menu.id} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      {/*
        Flex layout: title is centered via absolute positioning,
        action buttons stack on the right. Works at 360px without wrapping.
        On mobile, if both ordering and book are enabled, they appear as a
        compact column group on the right so the centered title is preserved.
      */}
      <header className="relative bg-white border-b border-border px-5 py-4 flex items-center justify-center">
        {/* Centered title */}
        <h1 className="font-display text-[22px] font-extrabold tracking-[-0.03em] text-dark leading-tight text-center px-24">
          {menu.name}
        </h1>

        {/* Right-side action buttons */}
        {(menu.table_ordering || showBookButton) && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end gap-1.5">
            {showBookButton && (
              <ReservationSheet
                menuId={menu.id}
                menuName={menu.name}
                source="qr_menu"
                defaultOpen={defaultOpenSheet}
                bookableOpenTime={(menu.reservations_open_time ?? "12:00:00").slice(0, 5)}
                bookableCloseTime={(menu.reservations_close_time ?? "21:00:00").slice(0, 5)}
                areas={areas}
                maxPartySize={menu.reservations_max_party_size}
                maxAdvanceDays={menu.reservations_max_advance_days}
                leadTimeHours={menu.reservations_lead_time_hours}
                restaurantPhone={restaurantPhone}
                triggerLabel="Book"
                triggerClassName="h-[32px] px-4 text-[12px]"
              />
            )}
          </div>
        )}
      </header>

      {/*
        Conditional rendering based on table_ordering flag:
        - table_ordering = false → read-only browse (MenuWithFilters, unchanged)
        - table_ordering = true  → cart-enabled browse (MenuWithCart)
        The browse UI is identical in both cases; MenuWithCart layers cart controls on top.
      */}
      {menu.table_ordering ? (
        <MenuWithCart sections={sections} menuId={menu.id} initialTable={prefilledTable} />
      ) : (
        <MenuWithFilters sections={sections} />
      )}

      {/* Powered by — only shown in read-only mode; cart mode has its own footer */}
      {!menu.table_ordering && (
        <div className="text-center pb-6">
          <Link
            href="https://klickenya.com"
            className="text-[12px] text-text3 hover:text-text2 transition-colors"
          >
            Powered by Klickenya
          </Link>
        </div>
      )}
    </div>
  );
}
