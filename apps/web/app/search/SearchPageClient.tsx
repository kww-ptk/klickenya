"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Search, X, SlidersHorizontal, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListingCard } from "@/components/listings/ListingCard";
import { SUBCATEGORY_LABELS } from "@/lib/constants/subcategories";

/* ── Types ───────────────────────────────────────── */

interface Listing {
  id: string;
  title: string;
  slug: string;
  type: string;
  subcategory?: string;
  city?: string;
  county?: string;
  price?: number;
  price_unit?: string;
  price_range?: string;
  opening_hours?: string;
  review_count?: number;
  photos?: string[];
  avg_rating?: number;
  status?: string;
}

interface Destination {
  _id: string;
  name: string;
  slug: string;
  tagline?: string;
  city?: string;
  heroImage?: string;
}

interface SearchResponse {
  query: string;
  listings: Listing[];
  posts: Record<string, unknown>[];
  destinations: Destination[];
  total: number;
}

const TYPE_META: Record<string, { icon: string; label: string; path: string }> = {
  stay: { icon: "🏠", label: "Stays", path: "/stays" },
  experience: { icon: "🎒", label: "Experiences", path: "/experiences" },
  event: { icon: "🎟️", label: "Events", path: "/events" },
  service: { icon: "⭐", label: "Services", path: "/services" },
  real_estate: { icon: "🏢", label: "Real Estate", path: "/real-estate" },
  restaurant: { icon: "🍽️", label: "Restaurants", path: "/experiences" },
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "newest", label: "Newest" },
];

const SUGGESTIONS = [
  "Watamu",
  "Safari",
  "Villa",
  "Diani Beach",
  "Kilifi",
  "Nairobi",
  "Lamu",
  "Restaurant",
  "Events",
  "Mombasa",
];

const CATEGORY_FILTERS = [
  { value: "", label: "All categories" },
  { value: "stay", label: "🏠 Stays" },
  { value: "experience", label: "🎒 Experiences" },
  { value: "event", label: "🎟️ Events" },
  { value: "service", label: "⭐ Services" },
  { value: "real_estate", label: "🏢 Real Estate" },
];

/* ── Component ───────────────────────────────────── */

export function SearchPageClient({
  initialQuery,
  initialType,
  initialCity,
  initialSub,
  initialTags,
}: {
  initialQuery: string;
  initialType: string;
  initialCity: string;
  initialSub: string;
  initialTags: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [cityFilter, setCityFilter] = useState(initialCity);
  const [sort, setSort] = useState("relevance");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(24);

  // Fetch results
  const fetchResults = useCallback(async () => {
    if (!query && !cityFilter) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (typeFilter) params.set("type", typeFilter);
    if (cityFilter) params.set("city", cityFilter);
    if (initialSub) params.set("sub", initialSub);
    if (initialTags) params.set("tags", initialTags);
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        setResults(data);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter, cityFilter, initialSub, initialTags, limit]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Update URL when filters change
  const updateUrl = useCallback(
    (q: string, type: string, city: string) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      if (city) params.set("city", city);
      if (initialSub) params.set("sub", initialSub);
      if (initialTags) params.set("tags", initialTags);
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [router, initialSub, initialTags]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl(query, typeFilter, cityFilter);
  };

  const removeFilter = (key: "type" | "city" | "sub") => {
    if (key === "type") {
      setTypeFilter("");
      updateUrl(query, "", cityFilter);
    } else if (key === "city") {
      setCityFilter("");
      updateUrl(query, typeFilter, "");
    }
  };

  // Sort listings
  const sortedListings = results?.listings
    ? [...results.listings].sort((a, b) => {
        if (sort === "price_asc")
          return (a.price ?? 999999) - (b.price ?? 999999);
        if (sort === "price_desc")
          return (b.price ?? 0) - (a.price ?? 0);
        return 0; // relevance / newest = API order
      })
    : [];

  // Group by type (when no type filter)
  const grouped: Record<string, Listing[]> = {};
  if (!typeFilter) {
    sortedListings.forEach((l) => {
      const t = l.type || "stay";
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push(l);
    });
  }

  return (
    <div className="min-h-screen bg-white pt-0 md:pt-[68px]">
      {/* ── Search header ────────────────────────── */}
      <div className="sticky top-0 md:top-[68px] z-[100] bg-white border-b border-border">
        <div className="max-w-[1280px] mx-auto px-3 md:px-10 pt-[max(12px,env(safe-area-inset-top))] md:pt-4 pb-3 md:pb-4">
          {/* Search input */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 md:gap-3 mb-3">
            {/* Back button — mobile */}
            <button
              type="button"
              onClick={() => router.back()}
              className="md:hidden size-9 rounded-full bg-surface flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-4 text-text" />
            </button>

            <div className="flex-1 flex items-center bg-surface rounded-full px-4 py-2.5">
              <Search className="size-4 text-text3 shrink-0 mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stays, experiences..."
                className="flex-1 text-[14px] text-text bg-transparent outline-none placeholder:text-text3"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    updateUrl("", typeFilter, cityFilter);
                  }}
                  className="shrink-0 size-5 rounded-full bg-border flex items-center justify-center hover:bg-text3/30 transition-colors"
                >
                  <X className="size-3 text-text2" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="hidden md:block px-6 py-2.5 rounded-full bg-amber text-white text-[13px] font-semibold hover:shadow-md transition-shadow shrink-0"
            >
              Search
            </button>
          </form>

          {/* Filters + count + sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active filter pills */}
            {typeFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber/10 border border-amber/25 text-[12px] font-semibold text-amber">
                {TYPE_META[typeFilter]?.icon}{" "}
                {TYPE_META[typeFilter]?.label ?? typeFilter}
                <button
                  onClick={() => removeFilter("type")}
                  className="ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {cityFilter && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal/10 border border-teal/25 text-[12px] font-semibold text-teal">
                📍 {cityFilter}
                <button
                  onClick={() => removeFilter("city")}
                  className="ml-0.5"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {initialSub && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple/10 border border-purple/25 text-[12px] font-semibold text-purple">
                {SUBCATEGORY_LABELS[initialSub] ?? initialSub}
              </span>
            )}

            {/* Count */}
            {results && !loading && (
              <span className="text-[12.5px] text-text3 ml-auto">
                {results.total} result{results.total !== 1 ? "s" : ""}
                {query ? ` for "${query}"` : ""}
              </span>
            )}

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-[12px] font-medium text-text2 bg-surface border border-border rounded-full px-3 py-1.5 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-3 md:px-10 py-5 md:py-8">
        <div className="flex gap-10">
          {/* Filter sidebar — desktop only */}
          <aside className="hidden lg:block w-[240px] shrink-0">
            <div className="sticky top-[180px] space-y-6">
              {/* Category */}
              <div>
                <h4 className="text-[12px] font-bold text-text3 uppercase tracking-[0.05em] mb-3">
                  Category
                </h4>
                <div className="space-y-1.5">
                  {CATEGORY_FILTERS.map((cat) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={typeFilter === cat.value}
                        onChange={() => {
                          setTypeFilter(cat.value);
                          updateUrl(query, cat.value, cityFilter);
                        }}
                        className="accent-amber"
                      />
                      <span
                        className={cn(
                          "text-[13px] group-hover:text-text transition-colors",
                          typeFilter === cat.value
                            ? "font-semibold text-text"
                            : "text-text2"
                        )}
                      >
                        {cat.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <h4 className="text-[12px] font-bold text-text3 uppercase tracking-[0.05em] mb-3">
                  City
                </h4>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  onBlur={() => updateUrl(query, typeFilter, cityFilter)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      updateUrl(query, typeFilter, cityFilter);
                  }}
                  placeholder="Filter by city..."
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text outline-none focus:border-amber transition-colors placeholder:text-text3"
                />
              </div>

              {/* Price range */}
              <div>
                <h4 className="text-[12px] font-bold text-text3 uppercase tracking-[0.05em] mb-3">
                  Price range (KES)
                </h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text outline-none focus:border-amber transition-colors placeholder:text-text3"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-[13px] text-text outline-none focus:border-amber transition-colors placeholder:text-text3"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Results area */}
          <div className="flex-1 min-w-0">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 text-amber animate-spin" />
              </div>
            )}

            {/* Empty / no query */}
            {!loading && (!results || results.total === 0) && (
              <div className="text-center py-12 md:py-20 px-4">
                {query || cityFilter || typeFilter ? (
                  /* ── No results found ── */
                  <>
                    <div className="size-20 md:size-24 rounded-full bg-surface mx-auto mb-5 flex items-center justify-center">
                      <Search className="size-8 md:size-10 text-text3/50" />
                    </div>
                    <h2 className="text-[18px] md:text-[22px] font-bold text-text mb-2">
                      No results found
                    </h2>
                    <p className="text-[14px] text-text3 mb-2 max-w-[360px] mx-auto">
                      We couldn&apos;t find anything matching
                      {query ? ` "${query}"` : ""}
                      {cityFilter ? ` in ${cityFilter}` : ""}
                      {typeFilter ? ` for ${TYPE_META[typeFilter]?.label ?? typeFilter}` : ""}
                    </p>
                    <p className="text-[13px] text-text3/70 mb-8 max-w-[360px] mx-auto">
                      Try adjusting your filters or search for something else
                    </p>

                    {/* Quick actions */}
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      {(cityFilter || typeFilter) && (
                        <button
                          onClick={() => {
                            setTypeFilter("");
                            setCityFilter("");
                            updateUrl(query, "", "");
                          }}
                          className="px-4 py-2 rounded-full text-[13px] font-semibold bg-amber text-white hover:shadow-md transition-shadow"
                        >
                          Clear all filters
                        </button>
                      )}
                      <button
                        onClick={() => router.back()}
                        className="px-4 py-2 rounded-full text-[13px] font-medium bg-surface text-text2 hover:bg-border transition-colors border border-border"
                      >
                        Go back
                      </button>
                    </div>

                    {/* Suggestions */}
                    <p className="text-[11px] font-bold text-text3 uppercase tracking-wider mb-3">
                      Try searching for
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.slice(0, 6).map((s) => (
                        <Link
                          key={s}
                          href={`/search?q=${encodeURIComponent(s)}`}
                          className="px-4 py-2 rounded-full text-[13px] font-medium bg-surface text-text2 hover:bg-amber/10 hover:text-amber transition-colors border border-border"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  /* ── Start searching ── */
                  <>
                    <div className="size-20 md:size-24 rounded-full bg-gradient-to-br from-amber/10 to-purple/10 mx-auto mb-5 flex items-center justify-center">
                      <Search className="size-8 md:size-10 text-amber/60" />
                    </div>
                    <h2 className="text-[18px] md:text-[22px] font-bold text-text mb-2">
                      Explore Kenya
                    </h2>
                    <p className="text-[14px] text-text3 mb-8 max-w-[360px] mx-auto">
                      Search stays, experiences, events, and more across Kenya&apos;s most beautiful destinations
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTIONS.map((s) => (
                        <Link
                          key={s}
                          href={`/search?q=${encodeURIComponent(s)}`}
                          className="px-4 py-2 rounded-full text-[13px] font-medium bg-surface text-text2 hover:bg-amber/10 hover:text-amber transition-colors border border-border"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Results */}
            {!loading && results && results.total > 0 && (
              <>
                {/* Destinations strip */}
                {results.destinations.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-[11px] font-bold text-amber uppercase tracking-[0.06em] mb-3">
                      📍 Destinations
                    </h3>
                    <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                      {results.destinations.map((d) => (
                        <Link
                          key={d._id}
                          href={`/destinations/${d.slug}`}
                          className="shrink-0 w-[200px] group"
                        >
                          <div className="relative h-[120px] rounded-xl overflow-hidden mb-2">
                            {d.heroImage ? (
                              <Image
                                src={d.heroImage}
                                alt={d.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#6B2D8B] to-[#E8A020]" />
                            )}
                          </div>
                          <p className="text-[14px] font-semibold text-text group-hover:text-amber transition-colors truncate">
                            {d.name}
                          </p>
                          {d.tagline && (
                            <p className="text-[12px] text-text3 truncate">
                              {d.tagline}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grouped by type (no filter active) */}
                {!typeFilter &&
                  Object.entries(grouped).map(([type, items]) => {
                    const meta = TYPE_META[type] ?? {
                      icon: "✨",
                      label: type,
                      path: `/${type}`,
                    };
                    return (
                      <div key={type} className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-[16px] font-bold text-text">
                            {meta.icon} {meta.label}
                          </h3>
                          <span className="text-[12px] text-text3 bg-surface px-2 py-0.5 rounded-full">
                            {items.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {items.map((l) => {
                            const citySlug = l.city
                              ? encodeURIComponent(l.city.toLowerCase().replace(/\s+/g, "-"))
                              : "kenya";
                            return (
                              <ListingCard
                                key={l.id}
                                id={l.id}
                                title={l.title}
                                city={l.city ?? ""}
                                price={l.price ?? null}
                                priceUnit={l.price_unit}
                                priceRange={l.price_range}
                                rating={l.avg_rating}
                                reviewCount={l.review_count}
                                type={l.type as "stay" | "experience" | "event" | "service" | "restaurant" | "rental"}
                                subcategory={l.subcategory}
                                openingHours={l.opening_hours}
                                photos={l.photos ?? []}
                                href={`${meta.path}/${citySlug}/${l.slug}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                {/* Flat grid (type filter active) */}
                {typeFilter && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {sortedListings.map((l) => {
                      const meta = TYPE_META[l.type] ?? {
                        path: "/stays",
                      };
                      const citySlug = l.city
                        ? encodeURIComponent(l.city.toLowerCase().replace(/\s+/g, "-"))
                        : "kenya";
                      return (
                        <ListingCard
                          key={l.id}
                          id={l.id}
                          title={l.title}
                          city={l.city ?? ""}
                          price={l.price ?? null}
                          priceUnit={l.price_unit}
                          priceRange={l.price_range}
                          rating={l.avg_rating}
                          reviewCount={l.review_count}
                          type={l.type as "stay" | "experience" | "event" | "service" | "restaurant" | "rental"}
                          subcategory={l.subcategory}
                          openingHours={l.opening_hours}
                          photos={l.photos ?? []}
                          href={`${meta.path}/${citySlug}/${l.slug}`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Load more */}
                {results.listings.length >= limit && (
                  <div className="text-center mt-10">
                    <button
                      onClick={() => setLimit((l) => l + 24)}
                      className="px-8 py-3 rounded-full border border-border text-[14px] font-semibold text-text hover:bg-surface transition-colors"
                    >
                      Load more results
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
