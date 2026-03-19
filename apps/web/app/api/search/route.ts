import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import {
  SEARCH_LISTINGS_QUERY,
  SEARCH_LISTINGS_FALLBACK_QUERY,
  SEARCH_DESTINATIONS_QUERY,
  SEARCH_BLOG_POSTS_QUERY,
} from "@/lib/sanity/queries";
import { adminClient } from "@/lib/supabase/admin";

// ── Rate limiter: 30 req/min per IP ─────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 30;
}

// ── Async search log (fire-and-forget) ──────────────

function logSearch(
  query: string,
  resultCount: number,
  typeFilter?: string,
  cityFilter?: string
) {
  adminClient
    .from("search_log")
    .insert({
      query: query.toLowerCase().trim(),
      result_count: resultCount,
      type_filter: typeFilter || null,
      city_filter: cityFilter || null,
    })
    .then(({ error }) => {
      if (error) console.error("Search log error:", error);
    });
}

// ── GET /api/search ─────────────────────────────────

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() || "";
  const typeFilter = searchParams.get("type") || "";
  const cityFilter = searchParams.get("city") || "";
  const subFilter = searchParams.get("sub") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

  // Context params (passed through, not used for filtering yet)
  const checkin = searchParams.get("checkin") || undefined;
  const checkout = searchParams.get("checkout") || undefined;
  const guests = searchParams.get("guests")
    ? parseInt(searchParams.get("guests")!, 10)
    : undefined;

  if (!q && !cityFilter && !typeFilter) {
    return NextResponse.json(
      { error: "Query, city, or type must be provided." },
      { status: 400 }
    );
  }

  if (q && q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 }
    );
  }

  try {
    // Append wildcard for Sanity's match operator
    const qWild = q ? `${q}*` : "*";
    const qLower = q.toLowerCase();

    // ── Run all three Sanity searches in parallel ────
    const [listings, destinations, posts] = await Promise.all([
      sanityClient
        .fetch(SEARCH_LISTINGS_QUERY, {
          q: qWild,
          qLower,
          typeFilter,
          cityFilter,
          subFilter,
          limit,
        })
        .catch((err: unknown) => {
          console.error("Listing search error:", err);
          return [];
        }),

      q
        ? sanityClient
            .fetch(SEARCH_DESTINATIONS_QUERY, { q: qWild })
            .catch(() => [])
        : Promise.resolve([]),

      q
        ? sanityClient
            .fetch(SEARCH_BLOG_POSTS_QUERY, { q: qWild })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // ── Fallback: if fewer than 3 listings, try looser city match ──
    let allListings: Record<string, unknown>[] = listings ?? [];

    if (q && allListings.length < 3) {
      const cityWord = q.split(/\s+/)[0]; // first word
      const fallback: Record<string, unknown>[] = await sanityClient
        .fetch(SEARCH_LISTINGS_FALLBACK_QUERY, {
          q: `${cityWord}*`,
          typeFilter,
          cityFilter,
        })
        .catch(() => []);

      // Merge without duplicates
      const existingIds = new Set(allListings.map((l) => l._id));
      const newResults = (fallback ?? []).filter(
        (r) => !existingIds.has(r._id)
      );
      allListings = [...allListings, ...newResults].slice(0, limit);
    }

    // ── Map _id → id for frontend compatibility ─────
    const mappedListings = allListings.map((l) => ({
      ...l,
      id: l._id,
      // Normalize field names for frontend
      price_unit: l.priceUnit,
      avg_rating: l.avgRating,
      photos: l.photo ? [l.photo] : [],
    }));

    const totalResults =
      mappedListings.length +
      (posts ?? []).length +
      (destinations ?? []).length;

    // Log search async — never blocks response
    if (q) {
      logSearch(q, totalResults, typeFilter || undefined, cityFilter || undefined);
    }

    return NextResponse.json({
      query: q,
      listings: mappedListings,
      posts: posts ?? [],
      destinations: destinations ?? [],
      total: totalResults,
      context: {
        type: typeFilter || undefined,
        city: cityFilter || undefined,
        subcategory: subFilter || undefined,
        checkin,
        checkout,
        guests,
      },
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
