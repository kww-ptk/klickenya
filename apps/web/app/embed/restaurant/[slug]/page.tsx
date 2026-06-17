import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";
import { EmbeddedRestaurant } from "./EmbeddedRestaurant";

export const dynamic = "force-dynamic";

interface EmbedRestaurantPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEFAULT_ACCENT = "E8A020";
const DEFAULT_BG = "white";

function sanitizeHex(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  return /^[0-9a-fA-F]{3,8}$/.test(raw) ? raw : fallback;
}
function sanitizeBg(raw: string | undefined): string {
  if (!raw) return DEFAULT_BG;
  if (raw === "transparent" || raw === "white") return raw;
  return /^[0-9a-fA-F]{3,8}$/.test(raw) ? `#${raw}` : DEFAULT_BG;
}
function sanitizeTheme(raw: string | undefined): "light" | "dark" {
  return raw === "dark" ? "dark" : "light";
}
function parseRefererHostname(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * /embed/restaurant/[slug] — combo embed = menu + reservation widget.
 *
 * Why this exists: most restaurants want ONE widget that shows their menu
 * AND lets guests book a table. Two separate iframes would be clunky on a
 * static site. This route gives them a single snippet.
 *
 * Query params:
 *   ?theme=light|dark       — colour scheme
 *   ?accent=E8A020          — accent hex (no #)
 *   ?bg=white|transparent   — outer background
 *   ?ref=instagram-bio      — campaign tag, stored on reservations (and a
 *                             future menu_scans column)
 *   ?reservations=0         — disable reservation widget for this embed only
 *                             (default is on when the menu's reservations
 *                             feature is enabled)
 *   ?menu=0                 — disable menu, show booking only (effectively
 *                             same as /embed/reservations/<slug> but lets
 *                             owners stick with one URL)
 */
export default async function EmbedRestaurantPage({
  params,
  searchParams,
}: EmbedRestaurantPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const { data: menu } = await adminClient
    .from("menus")
    .select(
      `
      id, name, slug, is_published, reservations_enabled,
      default_reservation_duration, reservations_lead_time_hours,
      reservations_max_party_size, reservations_max_advance_days,
      business_id, listing_slug,
      menu_sections (
        id, title, display_order, is_visible, station,
        menu_items (
          id, name, description, price_kes,
          dietary_tags, is_available, display_order, photo_url, is_featured
        )
      )
    `,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!menu) notFound();

  // ── Reservations side data (only if the feature is on AND not disabled in URL) ──
  const showReservations =
    menu.reservations_enabled === true && sp.reservations !== "0";

  let areas: RestaurantArea[] = [];
  let timeWindows: Array<{ open_time: string; close_time: string; is_active?: boolean }> = [];
  let restaurantPhone: string | null = null;

  if (showReservations) {
    const [areasResult, windowsResult, hostResult] = await Promise.allSettled([
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
      menu.business_id
        ? adminClient
            .from("host_profiles")
            .select("phone")
            .eq("user_id", menu.business_id)
            .single()
        : Promise.resolve({ data: null }),
    ]);

    if (areasResult.status === "fulfilled") {
      areas = (areasResult.value.data ?? []) as RestaurantArea[];
    }
    if (windowsResult.status === "fulfilled") {
      timeWindows = windowsResult.value.data ?? [];
    }
    if (hostResult.status === "fulfilled" && hostResult.value.data) {
      restaurantPhone =
        (hostResult.value.data as { phone?: string | null }).phone ?? null;
    }
  }

  // ── Source attribution (mirrors /embed/reservations) ──
  const referer = (await headers()).get("referer");
  const sourceOrigin = parseRefererHostname(referer);
  const rawRef = typeof sp.ref === "string" ? sp.ref : null;
  const sourceRef = rawRef ? rawRef.slice(0, 64) : null;

  // ── Theming ──
  const theme = sanitizeTheme(typeof sp.theme === "string" ? sp.theme : undefined);
  const accent = `#${sanitizeHex(typeof sp.accent === "string" ? sp.accent : undefined, DEFAULT_ACCENT)}`;
  const bg = sanitizeBg(typeof sp.bg === "string" ? sp.bg : undefined);

  const showMenu = sp.menu !== "0";

  return (
    <EmbeddedRestaurant
      menuName={menu.name}
      sections={(menu as unknown as MenuData).menu_sections ?? []}
      showMenu={showMenu}
      showReservations={showReservations}
      reservationsConfig={
        showReservations
          ? {
              menuId: menu.id,
              menuName: menu.name,
              areas,
              timeWindows,
              maxPartySize: menu.reservations_max_party_size ?? 12,
              maxAdvanceDays: menu.reservations_max_advance_days ?? 30,
              leadTimeHours: menu.reservations_lead_time_hours ?? 2,
              restaurantPhone,
              sourceOrigin,
              sourceRef,
            }
          : null
      }
      theme={theme}
      accent={accent}
      background={bg}
    />
  );
}
