"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { MenuSection, MenuItem } from "@/components/listings/detail/restaurant/MenuDisplay";
import { MenuTabBar } from "@/components/menu/MenuTabBar";
import { DietaryFilter } from "@/components/menu/DietaryFilter";

/* ── Dietary tag config ────────────────────────────── */

const TAG_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  V:  { label: "🌿 V",  bg: "bg-green-100",  text: "text-green-700" },
  VG: { label: "🌱 VG", bg: "bg-green-100",  text: "text-green-800" },
  GF: { label: "🌾 GF", bg: "bg-amber-100",  text: "text-amber-700" },
  H:  { label: "☪️ H",  bg: "bg-teal-100",   text: "text-teal-700" },
  S:  { label: "🌶️ S",  bg: "bg-red-100",    text: "text-red-700" },
  DF: { label: "🥛 LF", bg: "bg-blue-100",   text: "text-blue-700" },
};

/* ── Price formatter ───────────────────────────────── */

function formatPrice(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/* ── Item card ─────────────────────────────────────── */

function ItemCard({ item }: { item: MenuItem }) {
  const hasPhoto = !!item.photo_url;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-border bg-white p-3.5 ${
        item.is_available ? "" : "opacity-40"
      }`}
    >
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

/* ── Main component ────────────────────────────────── */

interface MenuWithFiltersProps {
  sections: MenuSection[];
}

export function MenuWithFilters({ sections }: MenuWithFiltersProps) {
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Collect all unique dietary tags present in the menu
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const section of sections) {
      for (const item of section.menu_items) {
        for (const tag of item.dietary_tags) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags);
  }, [sections]);

  // Filter sections — when filters active, only show items matching ALL selected tags
  const filteredSections = useMemo(() => {
    if (activeTags.length === 0) return sections;

    return sections
      .map((s) => ({
        ...s,
        menu_items: s.menu_items.filter((item) =>
          activeTags.every((tag) => item.dietary_tags.includes(tag))
        ),
      }))
      .filter((s) => s.menu_items.length > 0);
  }, [sections, activeTags]);

  const tabs = filteredSections.map((s) => ({ id: s.id, title: s.title }));
  const noResults = activeTags.length > 0 && filteredSections.length === 0;

  return (
    <>
      <MenuTabBar tabs={tabs} />

      <DietaryFilter
        availableTags={availableTags}
        activeTags={activeTags}
        onChange={setActiveTags}
      />

      <main className="max-w-[480px] mx-auto px-4 pb-16">
        {noResults ? (
          <div className="pt-12 text-center">
            <p className="text-[15px] font-semibold text-text2 mb-1">
              No items match your filters
            </p>
            <button
              onClick={() => setActiveTags([])}
              className="text-[13px] text-amber font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredSections.map((section) => (
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
          ))
        )}
      </main>
    </>
  );
}
