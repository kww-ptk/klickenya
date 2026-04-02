import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import type { MenuData, MenuSection, MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuTabBar } from "@/components/menu/MenuTabBar";
import { ScanTracker } from "@/components/menu/ScanTracker";

export const revalidate = 60;

/* ── Dietary tag config ────────────────────────────── */

const TAG_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  V:  { label: "V",  bg: "bg-green-100",  text: "text-green-700" },
  VG: { label: "VG", bg: "bg-green-100",  text: "text-green-800" },
  GF: { label: "GF", bg: "bg-amber-100",  text: "text-amber-700" },
  H:  { label: "H",  bg: "bg-teal-100",   text: "text-teal-700" },
  S:  { label: "S",  bg: "bg-red-100",    text: "text-red-700" },
};

/* ── Price formatter ───────────────────────────────── */

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/* ── Data fetching ─────────────────────────────────── */

async function getMenu(slug: string): Promise<MenuData | null> {
  const { data } = await adminClient
    .from("menus")
    .select(
      `
      id, name, is_published,
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

  return (data as MenuData) ?? null;
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

function prepareSections(menu: MenuData): MenuSection[] {
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

/* ── Item card (server component) ──────────────────── */

function ItemCard({ item }: { item: MenuItem }) {
  const hasPhoto = !!item.photo_url;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-border bg-white p-3.5 ${
        item.is_available ? "" : "opacity-40"
      }`}
    >
      {/* Left: text */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-dark leading-snug">
          {item.name}
        </p>
        {item.description && (
          <p className="text-[13px] text-text2 mt-0.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        {item.dietary_tags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {item.dietary_tags.map((tag) => {
              const style = TAG_STYLES[tag];
              if (!style) return null;
              return (
                <span
                  key={tag}
                  className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
                >
                  {style.label}
                </span>
              );
            })}
          </div>
        )}
        {item.is_available ? (
          <p className="text-[14px] font-bold text-amber mt-1.5">
            {formatPrice(item.price_kes)}
          </p>
        ) : (
          <span className="inline-block mt-1.5 rounded-full bg-border px-2 py-0.5 text-[11px] font-semibold text-text3">
            Unavailable
          </span>
        )}
      </div>

      {/* Right: photo */}
      {hasPhoto && (
        <div className="relative w-[72px] h-[72px] rounded-lg overflow-hidden shrink-0">
          <Image
            src={item.photo_url!}
            alt={item.name}
            width={72}
            height={72}
            className="object-cover w-full h-full"
            sizes="72px"
          />
        </div>
      )}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getMenu(slug);
  if (!menu) notFound();

  const sections = prepareSections(menu);
  if (sections.length === 0) notFound();

  const tabs = sections.map((s) => ({ id: s.id, title: s.title }));

  return (
    <div className="min-h-screen bg-canvas">
      <ScanTracker menuId={menu.id} />

      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-5 text-center">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-dark leading-tight">
          {menu.name}
        </h1>
      </header>

      {/* Sticky tab bar */}
      <MenuTabBar tabs={tabs} />

      {/* Sections */}
      <main className="max-w-[480px] mx-auto px-4 pb-16">
        {sections.map((section) => (
          <section
            key={section.id}
            id={`section-${section.id}`}
            className="pt-6"
          >
            <h2 className="font-display text-[18px] font-bold text-dark mb-3 px-1">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.menu_items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {/* Powered by */}
        <div className="mt-12 text-center pb-4">
          <Link
            href="https://klickenya.com"
            className="text-[12px] text-text3 hover:text-text2 transition-colors"
          >
            Powered by Klickenya
          </Link>
        </div>
      </main>
    </div>
  );
}
