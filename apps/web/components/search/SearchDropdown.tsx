"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";

/* ── Types ───────────────────────────────────────── */

interface Destination {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  city?: string;
  heroImage?: string;
}

interface ListingResult {
  id: string;
  title: string;
  slug: string;
  type: string;
  subcategory?: string;
  city?: string;
  price?: number;
  price_unit?: string;
  photos?: string[];
  avg_rating?: number;
}

export interface SearchResults {
  query: string;
  listings: ListingResult[];
  posts: Record<string, unknown>[];
  destinations: Destination[];
  total: number;
}

interface SearchDropdownProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any;
  isLoading: boolean;
  isOpen: boolean;
  query: string;
  onClose: () => void;
}

/* ── Type labels / paths ─────────────────────────── */

const TYPE_META: Record<string, { icon: string; label: string; path: string }> =
  {
    stay: { icon: "🏠", label: "Stays", path: "/stays" },
    experience: { icon: "🎒", label: "Experiences", path: "/experiences" },
    event: { icon: "🎟️", label: "Events", path: "/events" },
    service: { icon: "⭐", label: "Services", path: "/services" },
    real_estate: { icon: "🏢", label: "Real Estate", path: "/real-estate" },
    restaurant: { icon: "🍽️", label: "Restaurants", path: "/experiences?sub=restaurants" },
  };

const SUGGESTIONS = ["Nairobi", "Safari", "Villa", "Diani", "Watamu", "Kilifi"];

/* ── Component ───────────────────────────────────── */

export function SearchDropdown({
  results,
  isLoading,
  isOpen,
  query,
  onClose,
}: SearchDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);

  // Cast results
  const res = results as SearchResults | null;

  // Build flat list of focusable items
  const allItems = useCallback(() => {
    if (!res) return [];
    const items: Array<{ href: string; type: "destination" | "listing" }> = [];

    (res.destinations ?? []).forEach((d: Destination) =>
      items.push({ href: `/destinations/${d.slug}`, type: "destination" })
    );

    (res.listings ?? []).forEach((l: ListingResult) => {
      const base = TYPE_META[l.type]?.path ?? "/stays";
      const citySlug = l.city
        ? encodeURIComponent(l.city.toLowerCase().replace(/\s+/g, "-"))
        : "kenya";
      items.push({ href: `${base}/${citySlug}/${l.slug}`, type: "listing" });
    });

    return items;
  }, [res]);

  // Reset focus when results change
  useEffect(() => setFocusIndex(-1), [res]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      const items = allItems();
      if (!items.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && focusIndex >= 0) {
        e.preventDefault();
        const item = items[focusIndex];
        if (item) {
          window.location.href = item.href;
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, focusIndex, allItems, onClose]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelectorAll("[data-search-item]")[
      focusIndex
    ] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [focusIndex]);

  if (!isOpen) return null;

  /* ── Loading skeleton ──────────────────────────── */
  if (isLoading && !res) {
    return (
      <Wrapper>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="size-12 rounded-xl bg-surface shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-surface rounded-full w-3/5" />
                <div className="h-3 bg-surface rounded-full w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </Wrapper>
    );
  }

  /* ── Empty state ───────────────────────────────── */
  if (res && res.total === 0) {
    return (
      <Wrapper>
        <div className="py-10 px-6 text-center">
          <span className="text-[32px] block mb-2">🔍</span>
          <p className="text-[14px] font-semibold text-text mb-1">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-[12.5px] text-text3 mb-4">
            Try a different search term
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                onClick={onClose}
                className="px-3 py-1 rounded-full text-[12px] font-medium bg-surface text-text2 hover:bg-amber/10 hover:text-amber transition-colors"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </Wrapper>
    );
  }

  if (!res) return null;

  /* ── Group listings by type ────────────────────── */
  const grouped: Record<string, ListingResult[]> = {};
  (res.listings ?? []).forEach((l: ListingResult) => {
    const t = l.type || "stay";
    if (!grouped[t]) grouped[t] = [];
    if (grouped[t].length < 3) grouped[t].push(l);
  });

  let itemIdx = 0;

  return (
    <Wrapper>
      <div ref={listRef} className="max-h-[480px] overflow-y-auto">
        {/* ── Destinations ──────────────────────── */}
        {(res.destinations ?? []).length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10.5px] font-bold text-amber uppercase tracking-[0.06em] mb-2">
              📍 Destinations
            </p>
            {(res.destinations as Destination[]).map((d) => {
              const idx = itemIdx++;
              return (
                <Link
                  key={d._id}
                  href={`/destinations/${d.slug}`}
                  onClick={onClose}
                  data-search-item
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-xl transition-colors",
                    focusIndex === idx
                      ? "bg-amber/8"
                      : "hover:bg-surface"
                  )}
                >
                  {d.heroImage ? (
                    <Image
                      src={d.heroImage}
                      alt={d.name}
                      width={48}
                      height={48}
                      className="size-12 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#E8A020] shrink-0 flex items-center justify-center">
                      <span className="text-white text-[16px]">📍</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-text truncate">
                      {d.name}
                    </p>
                    {d.tagline && (
                      <p className="text-[12px] text-text3 truncate">
                        {d.tagline}
                      </p>
                    )}
                  </div>
                  {d.city && (
                    <span className="text-[11px] text-text3 bg-surface px-2 py-0.5 rounded-full shrink-0">
                      {d.city}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Listings grouped by type ──────────── */}
        {Object.entries(grouped).map(([type, items]) => {
          const meta = TYPE_META[type] ?? {
            icon: "✨",
            label: type,
            path: `/${type}`,
          };
          return (
            <div key={type} className="px-4 pt-2 pb-2">
              <p className="text-[10.5px] font-bold text-text3 uppercase tracking-[0.06em] mb-2">
                {meta.icon} {meta.label} ({items.length})
              </p>
              {items.map((l) => {
                const idx = itemIdx++;
                const photo = l.photos?.[0];
                const citySlug = l.city
                  ? encodeURIComponent(
                      l.city.toLowerCase().replace(/\s+/g, "-")
                    )
                  : "kenya";
                const subLabel = l.subcategory
                  ? SUBCATEGORY_LABELS[l.subcategory] ?? l.subcategory
                  : null;
                const price =
                  l.price != null
                    ? `KSh ${l.price.toLocaleString()}`
                    : "Price on request";

                return (
                  <Link
                    key={l.id}
                    href={`${meta.path}/${citySlug}/${l.slug}`}
                    onClick={onClose}
                    data-search-item
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-xl transition-colors",
                      focusIndex === idx
                        ? "bg-amber/8"
                        : "hover:bg-surface"
                    )}
                  >
                    {photo ? (
                      <Image
                        src={photo}
                        alt={l.title}
                        width={48}
                        height={48}
                        className="size-12 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#E8A020] shrink-0 flex items-center justify-center">
                        <Image
                          src="/klickenya-mark.svg"
                          alt=""
                          width={24}
                          height={24}
                          className="opacity-40"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-text truncate">
                        {l.title}
                      </p>
                      <p className="text-[12px] text-text3 truncate">
                        {l.city}
                        {subLabel ? ` · ${subLabel}` : ""}
                      </p>
                    </div>
                    <span className="text-[12px] font-semibold text-text2 shrink-0">
                      {price}
                    </span>
                  </Link>
                );
              })}
            </div>
          );
        })}

        {/* ── Footer ───────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border" style={{ backgroundColor: "#f8f8f6" }}>
          <span className="text-[12px] text-text3">
            {res.total} result{res.total !== 1 ? "s" : ""} for
            &ldquo;{query}&rdquo;
          </span>
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={onClose}
            className="text-[12.5px] font-semibold text-amber hover:underline"
          >
            See all results →
          </Link>
        </div>
      </div>
    </Wrapper>
  );
}

/* ── Wrapper shell ───────────────────────────────── */

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute top-[calc(100%+8px)] left-0 right-0 z-[300] rounded-[var(--radius-xl)] overflow-hidden animate-search-dropdown"
      style={{
        boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
        backgroundColor: "#ffffff",
        isolation: "isolate",
      }}
    >
      {children}
    </div>
  );
}
