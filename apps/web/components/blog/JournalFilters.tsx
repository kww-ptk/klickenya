"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PostCard } from "./PostCard";

/* ── Category config ──────────────────────────── */
const CATEGORIES = [
  { value: "all", label: "All", emoji: "✨" },
  { value: "destination_guide", label: "Guides", emoji: "🗺️" },
  { value: "food_restaurants", label: "Food", emoji: "🍽️" },
  { value: "where_to_stay", label: "Stays", emoji: "🏠" },
  { value: "safari_wildlife", label: "Safari", emoji: "🦁" },
  { value: "beaches_coast", label: "Beaches", emoji: "🌊" },
  { value: "travel_tips", label: "Tips", emoji: "💡" },
  { value: "events_nightlife", label: "Nightlife", emoji: "🎉" },
  { value: "living_in_kenya", label: "Living Here", emoji: "🏢" },
] as const;

const LOCATIONS = [
  { value: "all", label: "All locations" },
  { value: "watamu", label: "Watamu" },
  { value: "kilifi", label: "Kilifi" },
  { value: "diani", label: "Diani" },
  { value: "nairobi", label: "Nairobi" },
  { value: "lamu", label: "Lamu" },
  { value: "mombasa", label: "Mombasa" },
  { value: "kenya_general", label: "Kenya" },
] as const;

const LOCATION_LABELS: Record<string, string> = {
  watamu: "Watamu",
  kilifi: "Kilifi",
  diani: "Diani",
  nairobi: "Nairobi",
  lamu: "Lamu",
  mombasa: "Mombasa",
  malindi: "Malindi",
  maasai_mara: "Maasai Mara",
  amboseli: "Amboseli",
  kenya_general: "Kenya",
};

/* ── Types ────────────────────────────────────── */
interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  tags?: string[];
  primaryCategory?: string;
  location?: string;
  series?: string;
  readingTime?: number;
  publishedAt: string;
  coverImageUrl: string;
  authorName: string;
  authorAvatar?: string;
}

interface JournalFiltersProps {
  posts: BlogPost[];
}

/* ── Component ────────────────────────────────── */
export function JournalFilters({ posts }: JournalFiltersProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeLocation, setActiveLocation] = useState("all");

  // Filter posts
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (activeCategory !== "all" && p.primaryCategory !== activeCategory) return false;
      if (activeLocation !== "all" && p.location !== activeLocation) return false;
      return true;
    });
  }, [posts, activeCategory, activeLocation]);

  // Build series groups
  const seriesGroups = useMemo(() => {
    const map = new Map<string, BlogPost[]>();
    for (const p of posts) {
      if (p.series) {
        const arr = map.get(p.series) ?? [];
        arr.push(p);
        map.set(p.series, arr);
      }
    }
    // Only show series with 2+ posts
    return Array.from(map.entries())
      .filter(([, arr]) => arr.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);
  }, [posts]);

  // Which locations exist in the data for the active category
  const availableLocations = useMemo(() => {
    const relevant = activeCategory === "all" ? posts : posts.filter((p) => p.primaryCategory === activeCategory);
    const locs = new Set(relevant.map((p) => p.location).filter(Boolean));
    return LOCATIONS.filter((l) => l.value === "all" || locs.has(l.value));
  }, [posts, activeCategory]);

  return (
    <>
      {/* ── Category pills ─────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setActiveCategory(cat.value);
              setActiveLocation("all");
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-200 ${
              activeCategory === cat.value
                ? "bg-dark text-white"
                : "bg-white text-text2 border border-border hover:border-amber hover:text-amber"
            }`}
          >
            <span className="text-[14px]">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Location pills (L2 — show when category selected) ── */}
      {availableLocations.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {availableLocations.map((loc) => (
            <button
              key={loc.value}
              onClick={() => setActiveLocation(loc.value)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                activeLocation === loc.value
                  ? "bg-amber text-dark"
                  : "bg-surface text-text2 hover:bg-border"
              }`}
            >
              {loc.value !== "all" && <span className="text-[11px]">📍</span>}
              {loc.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Results count ── */}
      <p className="text-[13px] text-text3 mb-6">
        {filtered.length} {filtered.length === 1 ? "article" : "articles"}
        {activeCategory !== "all" && ` in ${CATEGORIES.find((c) => c.value === activeCategory)?.label}`}
        {activeLocation !== "all" && ` · ${LOCATIONS.find((l) => l.value === activeLocation)?.label}`}
      </p>

      {/* ── Posts grid ──────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {filtered.map((post) => (
            <PostCard
              key={post._id}
              slug={post.slug.current}
              title={post.title}
              excerpt={post.excerpt}
              coverImage={post.coverImageUrl}
              category={post.primaryCategory
                ? (CATEGORIES.find((c) => c.value === post.primaryCategory)?.label ?? post.tags?.[0] ?? "Travel")
                : (post.tags?.[0] ?? "Travel")}
              location={post.location ? LOCATION_LABELS[post.location] : undefined}
              authorName={post.authorName}
              authorAvatar={post.authorAvatar}
              publishedAt={post.publishedAt}
              readTimeMinutes={post.readingTime ?? 5}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-text3 text-[15px]">
            No articles match these filters yet.
          </p>
          <button
            onClick={() => { setActiveCategory("all"); setActiveLocation("all"); }}
            className="mt-3 text-[13px] font-semibold text-amber hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Series section ─────────────────────── */}
      {seriesGroups.length > 0 && activeCategory === "all" && activeLocation === "all" && (
        <div className="mt-16 pt-12 border-t border-border">
          <h2 className="font-display text-[clamp(20px,3vw,28px)] font-bold text-dark mb-6">
            Series & Collections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {seriesGroups.map(([name, seriesPosts]) => (
              <button
                key={name}
                onClick={() => {
                  // Filter to show this series
                  setActiveCategory("all");
                  setActiveLocation("all");
                  // Scroll up to see results
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-left p-5 rounded-xl border border-border bg-white hover:border-amber/40 hover:shadow-sm transition-all duration-200"
              >
                <p className="font-semibold text-[15px] text-dark mb-1">{name}</p>
                <p className="text-[12px] text-text3">
                  {seriesPosts.length} {seriesPosts.length === 1 ? "article" : "articles"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
