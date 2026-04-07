"use client";

import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

/* ── Types ─────────────────────────────────────────── */

export interface ItemOption {
  id: string;
  name: string;
  price_modifier: number;
  is_available: boolean;
  display_order: number;
}

export interface ItemOptionGroup {
  id: string;
  name: string;
  group_type: "single" | "multi" | "allergy";
  is_required: boolean;
  min_select: number;
  max_select: number | null;
  display_order: number;
  item_options: ItemOption[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  dietary_tags: string[];
  is_available: boolean;
  display_order: number;
  photo_url: string | null;
  is_featured: boolean;
  item_option_groups?: ItemOptionGroup[];
}

export interface MenuSection {
  id: string;
  title: string;
  display_order: number;
  is_visible: boolean;
  menu_items: MenuItem[];
}

export interface MenuData {
  id: string;
  slug: string;
  name: string;
  is_published: boolean;
  table_ordering: boolean;
  menu_sections: MenuSection[];
}

/* ── Dietary tag config ────────────────────────────── */

const TAG_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  V:  { label: "V",  bg: "bg-green-100",  text: "text-green-700" },
  VG: { label: "VG", bg: "bg-green-100",  text: "text-green-800" },
  GF: { label: "GF", bg: "bg-amber-100",  text: "text-amber-700" },
  H:  { label: "H",  bg: "bg-sky-100",    text: "text-sky-700" },
  S:  { label: "S",  bg: "bg-red-100",    text: "text-red-700" },
};

/* ── Price formatter ───────────────────────────────── */

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/* ── Component ─────────────────────────────────────── */

export function MenuDisplay({ menuData }: { menuData: MenuData | null }) {
  // Filter to visible sections that have at least one item
  const sections = (menuData?.menu_sections ?? [])
    .filter((s) => s.is_visible && s.menu_items.length > 0)
    .sort((a, b) => a.display_order - b.display_order);

  const [activeTab, setActiveTab] = useState(sections[0]?.id ?? "");

  // No menu data or no sections → show placeholder
  if (!menuData || sections.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-border bg-surface/30 p-8 text-center">
        <UtensilsCrossed className="size-10 text-text3 mx-auto mb-3" />
        <p className="text-[15px] font-semibold text-text mb-1">
          Menu coming soon
        </p>
        <p className="text-[13px] text-text2 max-w-[320px] mx-auto">
          We&apos;re working with the restaurant to bring you the full
          menu. In the meantime, contact them directly for details.
        </p>
      </div>
    );
  }

  const activeSection = sections.find((s) => s.id === activeTab) ?? sections[0];
  const items = [...activeSection.menu_items].sort(
    (a, b) => a.display_order - b.display_order
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveTab(section.id)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
              section.id === activeTab
                ? "bg-dark text-white"
                : "bg-surface text-text2 hover:bg-border"
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-4 rounded-[16px] border border-border p-4 ${
              item.is_available ? "bg-white" : "bg-surface/50 opacity-60"
            }`}
          >
            {/* Left: text content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-semibold text-dark">
                  {item.name}
                </span>
                {!item.is_available && (
                  <span className="inline-block rounded-full bg-border px-2 py-0.5 text-[11px] font-semibold text-text3">
                    Unavailable
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-[13px] text-text2 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              {item.dietary_tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {item.dietary_tags.map((tag) => {
                    const style = TAG_STYLES[tag];
                    if (!style) return null;
                    return (
                      <span
                        key={tag}
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: price + optional photo */}
            <div className="flex items-start gap-3 shrink-0">
              {item.is_available && (
                <span className="text-[15px] font-bold text-amber whitespace-nowrap">
                  {formatPrice(item.price_kes)}
                </span>
              )}
              {item.photo_url && (
                <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={item.photo_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="60px"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
