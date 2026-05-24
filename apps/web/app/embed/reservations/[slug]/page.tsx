import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";
import { EmbeddedReservation } from "./EmbeddedReservation";

// Always fetch fresh — embed pages are deliberately uncached so the parent
// hostname (from Referer) and any ?ref param are evaluated per request.
// Without dynamic=force-dynamic, Next would try to statically render the
// route and Referer/searchParams would be unavailable at build time.
export const dynamic = "force-dynamic";

interface EmbedReservationsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ── Theme params (mirror of the snippet generator) ────────────────────────
// We accept a small set of theme query params and pass them through to the
// client wrapper as CSS variables. Defaults match the Klickenya brand.
const DEFAULT_ACCENT = "E8A020";
const DEFAULT_BG = "white";
const DEFAULT_THEME = "light";

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

// Parse the parent page's hostname from the Referer header. The browser sets
// Referer to the URL of the page that loaded this iframe (e.g.
// "https://example.com/contact" → hostname "example.com"). Returns null when
// the header is missing or unparseable — we never want to insert garbage.
function parseRefererHostname(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

export default async function EmbedReservationsPage({
  params,
  searchParams,
}: EmbedReservationsPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // ── 1. Fetch menu (only published, reservations-enabled menus are embeddable) ──
  const { data: menu } = await adminClient
    .from("menus")
    .select(
      `id, name, reservations_enabled, default_reservation_duration,
       reservations_lead_time_hours, reservations_max_party_size,
       reservations_max_advance_days, listing_slug`,
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!menu || !menu.reservations_enabled) {
    notFound();
  }

  // ── 2. Fetch active areas + time windows (parallel) ──
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

  const areas: RestaurantArea[] =
    areasResult.status === "fulfilled" ? (areasResult.value.data ?? []) : [];
  const timeWindows =
    windowsResult.status === "fulfilled" ? (windowsResult.value.data ?? []) : [];

  // ── 3. Source attribution ──
  // source_origin: parent hostname from Referer. Per-request, server-side —
  // the client can't tamper with this (they can't forge Referer for the iframe).
  // source_ref:    owner-set campaign label from ?ref=...
  const referer = (await headers()).get("referer");
  const sourceOrigin = parseRefererHostname(referer);
  const rawRef = typeof sp.ref === "string" ? sp.ref : null;
  const sourceRef = rawRef ? rawRef.slice(0, 64) : null;

  // ── 4. Theming ──
  const themeParam = typeof sp.theme === "string" ? sp.theme : undefined;
  const accentParam = typeof sp.accent === "string" ? sp.accent : undefined;
  const bgParam = typeof sp.bg === "string" ? sp.bg : undefined;

  const theme = sanitizeTheme(themeParam);
  const accent = `#${sanitizeHex(accentParam, DEFAULT_ACCENT)}`;
  const bg = sanitizeBg(bgParam);

  return (
    <EmbeddedReservation
      menuId={menu.id}
      menuName={menu.name}
      areas={areas}
      timeWindows={timeWindows}
      maxPartySize={menu.reservations_max_party_size ?? 12}
      maxAdvanceDays={menu.reservations_max_advance_days ?? 30}
      leadTimeHours={menu.reservations_lead_time_hours ?? 2}
      sourceOrigin={sourceOrigin}
      sourceRef={sourceRef}
      theme={theme}
      accent={accent}
      background={bg}
    />
  );
}
