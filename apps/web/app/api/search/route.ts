import { NextRequest, NextResponse } from "next/server";
import { searchListings, searchBlogPosts } from "@/lib/supabase/queries";
import { sanityClient } from "@/lib/sanity/client";
import { groq } from "next-sanity";

// Simple in-memory rate limiter: max 30 requests per minute per IP
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

/* ── Sanity destination search ────────────────────── */

const SEARCH_DESTINATIONS_QUERY = groq`
  *[_type == "destination" && (
    name match $q ||
    city match $q ||
    tagline match $q
  )] | order(name asc) [0..2] {
    _id,
    name,
    "slug": slug.current,
    tagline,
    city,
    "heroImage": heroImage.asset->url
  }
`;

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
  const type = searchParams.get("type") || undefined;
  const city = searchParams.get("city") || undefined;
  const subcategory = searchParams.get("sub") || undefined;
  const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
  const limit = parseInt(searchParams.get("limit") || "6", 10);

  // Store but don't filter — these are used for search context
  const checkin = searchParams.get("checkin") || undefined;
  const checkout = searchParams.get("checkout") || undefined;
  const guests = searchParams.get("guests")
    ? parseInt(searchParams.get("guests")!, 10)
    : undefined;

  // Allow empty q if city is provided — return listings filtered by city
  if (!q && !city) {
    return NextResponse.json(
      { error: "Query or city must be provided." },
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
    // Run all searches in parallel
    const [listingsRaw, posts, destinations] = await Promise.all([
      // 1. Supabase listings (full-text or city-only)
      q
        ? searchListings(q, type, city)
        : (async () => {
            // City-only: direct query without full-text search
            const { createClient } = await import("@/lib/supabase/server");
            const supabase = await createClient();
            let query = supabase
              .from("listings")
              .select(
                "id, title, slug, type, subcategory, city, county, price, price_unit, photos, avg_rating, status"
              )
              .eq("status", "published");

            if (city) query = query.ilike("city", city);
            if (type) query = query.eq("type", type);

            const { data, error } = await query
              .order("published_at", { ascending: false })
              .limit(limit);

            if (error) throw error;
            return data ?? [];
          })(),

      // 2. Blog posts (only if q is provided)
      q ? searchBlogPosts(q) : Promise.resolve([]),

      // 3. Sanity destinations (only if q is provided)
      q
        ? sanityClient
            .fetch(SEARCH_DESTINATIONS_QUERY, { q: `${q}*` })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // Post-filter listings by subcategory and tags
    let listings = listingsRaw;

    if (subcategory) {
      listings = listings.filter(
        (l: Record<string, unknown>) => l.subcategory === subcategory
      );
    }
    if (tags.length > 0) {
      listings = listings.filter((l: Record<string, unknown>) =>
        tags.every((tag) =>
          (Array.isArray(l.tags) ? l.tags : []).includes(tag)
        )
      );
    }

    // Trim to limit
    listings = listings.slice(0, limit);

    return NextResponse.json({
      query: q,
      listings,
      posts,
      destinations,
      total: listings.length + posts.length + destinations.length,
      // Echo back search context for the client
      context: {
        type,
        city,
        subcategory,
        tags: tags.length > 0 ? tags : undefined,
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
