"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";
import { MapPin, ArrowRight } from "lucide-react";

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
  /** Parent ref for fixed positioning */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Render inline (no positioning wrapper) — for hero variant */
  inline?: boolean;
}

/* ── Type labels / paths ─────────────────────────── */

const TYPE_META: Record<string, { icon: string; label: string; path: string }> =
  {
    stay: { icon: "🏠", label: "Stays", path: "/stays" },
    experience: { icon: "🌴", label: "Experiences", path: "/experiences" },
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
  anchorRef,
  inline = false,
}: SearchDropdownProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Cast results
  const res = results as SearchResults | null;

  // Calculate position from anchor
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) {
      setPos(null);
      return;
    }
    function update() {
      if (!anchorRef?.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, anchorRef]);

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

  // Use fixed positioning if anchor provided, otherwise absolute; inline = no wrapper
  const useFixed = !!anchorRef && !!pos;

  const wrapperStyle: React.CSSProperties = inline
    ? {
        // No positioning — rendered in-flow by parent
        backgroundColor: "#ffffff",
        overflow: "hidden",
        isolation: "isolate",
      }
    : useFixed
      ? {
          position: "fixed",
          top: pos!.top,
          left: pos!.left,
          width: pos!.width,
          zIndex: 9999,
          backgroundColor: "#ffffff",
          boxShadow: "0 16px 48px rgba(0,0,0,0.20), 0 0 0 1px rgba(0,0,0,0.06)",
          borderRadius: 20,
          overflow: "hidden",
          isolation: "isolate",
        }
      : {
          position: "absolute" as const,
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          zIndex: 300,
          backgroundColor: "#ffffff",
          boxShadow: "0 16px 48px rgba(0,0,0,0.20), 0 0 0 1px rgba(0,0,0,0.06)",
          borderRadius: 20,
          overflow: "hidden",
          isolation: "isolate",
        };

  /* ── Loading skeleton — shows instantly while fetching ── */
  if (isLoading && !res) {
    return (
      <div style={wrapperStyle} className="animate-search-dropdown">
        {/* Search context header */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-[12px] font-medium text-text3">
            Searching for &ldquo;<span className="text-text font-semibold">{query}</span>&rdquo;
          </p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
              <div className="size-11 rounded-xl bg-neutral-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-neutral-100 rounded-full" style={{ width: `${65 - i * 10}%` }} />
                <div className="h-3 bg-neutral-100 rounded-full" style={{ width: `${40 - i * 5}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty state ───────────────────────────────── */
  if (res && res.total === 0) {
    return (
      <div style={wrapperStyle} className="animate-search-dropdown">
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
                className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-neutral-100 text-text2 hover:bg-amber/10 hover:text-amber transition-colors"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>
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
    <div style={wrapperStyle} className="animate-search-dropdown">
      <div ref={listRef} className="max-h-[420px] overflow-y-auto">
        {/* ── Destinations ──────────────────────── */}
        {(res.destinations ?? []).length > 0 && (
          <div className="p-3">
            <p className="text-[10px] font-bold text-amber uppercase tracking-[0.08em] px-2 mb-1.5">
              Destinations
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
                      : "hover:bg-neutral-50"
                  )}
                >
                  {d.heroImage ? (
                    <Image
                      src={d.heroImage}
                      alt={d.name}
                      width={44}
                      height={44}
                      className="size-11 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-11 rounded-lg bg-gradient-to-br from-purple to-amber shrink-0 flex items-center justify-center">
                      <MapPin className="size-4 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-text truncate">
                      {d.name}
                    </p>
                    {d.tagline && (
                      <p className="text-[12px] text-text3 truncate">
                        {d.tagline}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="size-3.5 text-text3 shrink-0" />
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
            <div key={type} className="px-3 pb-1">
              <p className="text-[10px] font-bold text-text3 uppercase tracking-[0.08em] px-2 mb-1.5">
                {meta.icon} {meta.label}
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
                    : null;

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
                        : "hover:bg-neutral-50"
                    )}
                  >
                    {photo ? (
                      <Image
                        src={photo}
                        alt={l.title}
                        width={44}
                        height={44}
                        className="size-11 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="size-11 rounded-lg bg-gradient-to-br from-purple to-amber shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-text truncate">
                        {l.title}
                      </p>
                      <p className="text-[12px] text-text3 truncate">
                        {l.city}
                        {subLabel ? ` · ${subLabel}` : ""}
                        {price ? ` · ${price}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 text-text3 shrink-0" />
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 border-t border-neutral-100"
        style={{ backgroundColor: "#f9f9f7" }}
      >
        <span className="text-[12px] text-text3">
          {res.total} result{res.total !== 1 ? "s" : ""}
        </span>
        <Link
          href={`/search?q=${encodeURIComponent(query)}`}
          onClick={onClose}
          className="text-[12.5px] font-semibold text-amber hover:underline flex items-center gap-1"
        >
          See all results
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
