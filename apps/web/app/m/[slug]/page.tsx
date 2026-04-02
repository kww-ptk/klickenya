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

const TAG_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  V:  { label: "V",  bg: "bg-[#DCFCE7]", text: "text-[#15803D]", border: "border-[#BBF7D0]" },
  VG: { label: "VG", bg: "bg-[#F0FDF4]", text: "text-[#166534]", border: "border-[#BBF7D0]" },
  GF: { label: "GF", bg: "bg-[#FEF9C3]", text: "text-[#854D0E]", border: "border-[#FEF08A]" },
  H:  { label: "H",  bg: "bg-[#CCFBF1]", text: "text-[#0F766E]", border: "border-[#99F6E4]" },
  S:  { label: "S",  bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", border: "border-[#FECACA]" },
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

/* ── Item row (server component) ──────────────────── */

function ItemRow({ item, isLast }: { item: MenuItem; isLast: boolean }) {
  const hasPhoto = !!item.photo_url;

  return (
    <div>
      <div
        className={`flex items-start gap-4 py-5 ${
          item.is_available ? "" : "opacity-40"
        }`}
      >
        {/* Left: text content */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-dark leading-snug">
            {item.name}
          </p>
          {item.description && (
            <p className="text-[13px] text-text2 mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {item.dietary_tags.length > 0 && (
              <div className="flex gap-1">
                {item.dietary_tags.map((tag) => {
                  const style = TAG_STYLES[tag];
                  if (!style) return null;
                  return (
                    <span
                      key={tag}
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.label}
                    </span>
                  );
                })}
              </div>
            )}
            {item.is_available ? (
              <p className="text-[14px] font-bold text-amber">
                {formatPrice(item.price_kes)}
              </p>
            ) : (
              <span className="inline-block rounded-full bg-border px-2.5 py-0.5 text-[11px] font-semibold text-text3">
                Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Right: photo */}
        {hasPhoto && (
          <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0">
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

      {/* Hairline divider — skip after last item */}
      {!isLast && (
        <div className="flex justify-center">
          <div className="w-[80%] h-px bg-border" />
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

      {/* Header — dark, confident */}
      <header className="bg-dark px-5 py-6 relative">
        <div className="max-w-[480px] mx-auto">
          <h1 className="font-display text-[28px] font-extrabold tracking-[-0.04em] text-white leading-tight">
            {menu.name}
          </h1>
        </div>
        <Link
          href={`https://klickenya.com/restaurants/${slug}`}
          className="absolute top-5 right-5 text-[12px] text-white/40 hover:text-white/80 transition-colors"
        >
          View listing ↗
        </Link>
      </header>

      {/* Sticky tab bar */}
      <MenuTabBar tabs={tabs} />

      {/* Sections */}
      <main className="max-w-[480px] mx-auto px-5 md:px-6 pb-16">
        {sections.map((section, sectionIdx) => (
          <section
            key={section.id}
            id={`section-${section.id}`}
            className={sectionIdx === 0 ? "pt-5" : "pt-8"}
          >
            {/* Section heading with amber accent line */}
            <div className="mb-1">
              <h2 className="font-display text-[20px] font-bold tracking-[-0.02em] text-dark">
                {section.title}
              </h2>
              <div className="w-10 h-0.5 bg-amber mt-2" />
            </div>

            {/* Items — separated by hairline dividers, no cards */}
            <div>
              {section.menu_items.map((item, itemIdx) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isLast={itemIdx === section.menu_items.length - 1}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Powered by Klickenya */}
        <div className="mt-12 text-center pb-6">
          <Link
            href="https://klickenya.com"
            className="inline-flex items-center gap-1.5 text-[12px] text-text3 hover:text-text2 transition-colors"
          >
            <span>Powered by</span>
            <span className="font-bold text-amber">
              Klic<span className="text-amber">Kenya</span>
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
