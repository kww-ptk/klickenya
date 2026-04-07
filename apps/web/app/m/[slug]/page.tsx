import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import type { MenuData, MenuSection } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuWithFilters } from "@/components/menu/MenuWithFilters";
import { MenuWithCart } from "@/components/menu/MenuWithCart";
import { ScanTracker } from "@/components/menu/ScanTracker";

export const revalidate = 60;

/* ── Types ─────────────────────────────────────────── */

// Extends MenuData with the table_ordering flag used only by this page
type MenuWithOrdering = MenuData & { table_ordering: boolean };

/* ── Data fetching ─────────────────────────────────── */

async function getMenu(slug: string): Promise<MenuWithOrdering | null> {
  const { data } = await adminClient
    .from("menus")
    .select(
      `
      id, name, is_published, table_ordering,
      menu_sections (
        id, title, display_order, is_visible,
        menu_items (
          id, name, description, price_kes,
          dietary_tags, is_available, display_order, photo_url
        )
      )
    `
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  // Add slug to satisfy MenuData shape (not stored in the select but needed by type)
  return data ? ({ ...data, slug } as MenuWithOrdering) : null;
}

/* ── Static params ─────────────────────────────────── */

export async function generateStaticParams() {
  const { data: menus } = await adminClient
    .from("menus")
    .select("slug")
    .eq("is_published", true);

  return (menus ?? []).map((m) => ({ slug: m.slug }));
}

/* ── Metadata ──────────────────────────────────────── */

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) return {};

  return {
    title: `${menu.name} | Klickenya`,
    description: `View the full menu for ${menu.name}. Scan, browse, order.`,
    robots: { index: true, follow: true },
  };
}

/* ── Helpers ───────────────────────────────────────── */

function prepareSections(menu: MenuWithOrdering): MenuSection[] {
  return menu.menu_sections
    .filter((s) => s.is_visible && s.menu_items.length > 0)
    .sort((a, b) => a.display_order - b.display_order)
    .map((s) => ({
      ...s,
      menu_items: [...s.menu_items].sort((a, b) => {
        // Available items first, then by display_order
        if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
        return a.display_order - b.display_order;
      }),
    }));
}

/* ── Page ──────────────────────────────────────────── */

export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) notFound();

  const sections = prepareSections(menu);
  if (sections.length === 0) notFound();

  return (
    <div className="min-h-screen bg-canvas">
      <ScanTracker menuId={menu.id} />

      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-5 text-center">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-dark leading-tight">
          {menu.name}
        </h1>
      </header>

      {/*
        Conditional rendering based on table_ordering flag:
        - table_ordering = false → read-only browse (MenuWithFilters, unchanged)
        - table_ordering = true  → cart-enabled browse (MenuWithCart)
        The browse UI is identical in both cases; MenuWithCart layers cart controls on top.
      */}
      {menu.table_ordering ? (
        <MenuWithCart sections={sections} menuId={menu.id} />
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
