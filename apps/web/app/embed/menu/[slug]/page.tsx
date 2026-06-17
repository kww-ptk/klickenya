import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import { EmbeddedMenu } from "./EmbeddedMenu";

// Always fetch fresh — embed pages are uncached so any update an owner makes
// in their Klickenya dashboard appears next iframe load. The menu items grid
// is cheap to render and the parent site does its own caching anyway.
export const dynamic = "force-dynamic";

interface EmbedMenuPageProps {
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

/**
 * /embed/menu/[slug] — iframe-friendly menu display.
 *
 * Parallel to /embed/reservations/[slug]. The owner pastes one line of HTML
 * on their site and the menu appears, with auto-resize via postMessage.
 *
 * What this is NOT: not the QR ordering page. No cart, no table session, no
 * payment flow. Embed is view-only by design — the full ordering experience
 * stays at /m/<slug> where the QR code points. Embed is for "advertise the
 * menu on my own site" use cases.
 */
export default async function EmbedMenuPage({
  params,
  searchParams,
}: EmbedMenuPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // Only published menus are embeddable — owner controls visibility via
  // the same publish toggle that gates /m/<slug>.
  const { data: menu } = await adminClient
    .from("menus")
    .select(
      `
      id, name, slug, is_published, table_ordering,
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

  // Theming
  const theme = sanitizeTheme(typeof sp.theme === "string" ? sp.theme : undefined);
  const accent = `#${sanitizeHex(typeof sp.accent === "string" ? sp.accent : undefined, DEFAULT_ACCENT)}`;
  const bg = sanitizeBg(typeof sp.bg === "string" ? sp.bg : undefined);

  // ref: owner-set campaign label (Instagram bio, newsletter, etc).
  // Stored on menu_scans rows by the ScanTracker client component if/when we
  // wire scan tracking to embed — for V1 we just accept the param so the
  // snippet stays forward-compatible.
  const rawRef = typeof sp.ref === "string" ? sp.ref : null;
  const sourceRef = rawRef ? rawRef.slice(0, 64) : null;

  return (
    <EmbeddedMenu
      menuName={menu.name}
      sections={(menu as unknown as MenuData).menu_sections ?? []}
      theme={theme}
      accent={accent}
      background={bg}
    />
  );
  // sourceRef is reserved for a future menu_scans column once we wire scan
  // tracking to embed views. Accepting the param now keeps the snippet URL
  // forward-compatible so owners don't have to update their embeds later.
  void sourceRef;
}
