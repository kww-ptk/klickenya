import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity/client";
import { groq } from "next-sanity";
import { adminClient } from "@/lib/supabase/admin";

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

/* ── Sanity search queries ────────────────────────── */

const SEARCH_LISTINGS_QUERY = groq`
  *[_type == "listing" && status == "published" && (
    title match $q ||
    city match $q ||
    county match $q ||
    description match $q ||
    $qLower in tags[]
  )
    && select($type != "" => type == $type, true)
    && select($city != "" => lower(city) == lower($city), true)
    && select($sub != "" => subcategory == $sub, true)
  ] | order(_createdAt desc) [0...$limit] {
    _id,
    title,
    "slug": slug.current,
    type,
    subcategory,
    city,
    county,
    price,
    "price_unit": priceUnit,
    "photos": photos[].asset->url,
    tags,
    "avg_rating": null
  }
`;

const SEARCH_DESTINATIONS_QUERY = groq`
  *[_type == "destination" && (
    name match $q ||
    city match $q ||
    tagline match $q
  )] | order(name asc) [0..5] {
    _id,
    name,
    "slug": slug.current,
    tagline,
    city,
    "heroImage": heroImage.asset->url
  }
`;

const SEARCH_BLOG_POSTS_QUERY = groq`
  *[_type == "blogPost" && status == "published" && (
    title match $q ||
    excerpt match $q
  )] | order(publishedAt desc) [0..3] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    tags,
    readingTime,
    publishedAt,
    "coverImage": coverImage.asset->url
  }
`;

/* ── Async search log (fire-and-forget) ───────────── */

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
  const type = searchParams.get("type") || "";
  const city = searchParams.get("city") || "";
  const sub = searchParams.get("sub") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

  // Store for search context
  const checkin = searchParams.get("checkin") || undefined;
  const checkout = searchParams.get("checkout") || undefined;
  const guests = searchParams.get("guests")
    ? parseInt(searchParams.get("guests")!, 10)
    : undefined;

  // Allow empty q if city or type is provided
  if (!q && !city && !type) {
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
    // Use wildcard match for Sanity's `match` operator
    const searchTerm = q ? `${q}*` : "*";
    const qLower = q.toLowerCase();

    // Run all Sanity searches in parallel
    const [listings, destinations, posts] = await Promise.all([
      // 1. Listings from Sanity
      sanityClient
        .fetch(SEARCH_LISTINGS_QUERY, {
          q: searchTerm,
          qLower,
          type,
          city,
          sub,
          limit,
        })
        .catch((err) => {
          console.error("Listing search error:", err);
          return [];
        }),

      // 2. Destinations from Sanity (only if q provided)
      q
        ? sanityClient
            .fetch(SEARCH_DESTINATIONS_QUERY, { q: searchTerm })
            .catch(() => [])
        : Promise.resolve([]),

      // 3. Blog posts from Sanity (only if q provided)
      q
        ? sanityClient
            .fetch(SEARCH_BLOG_POSTS_QUERY, { q: searchTerm })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // Map Sanity _id to id for frontend compatibility
    const mappedListings = (listings ?? []).map(
      (l: Record<string, unknown>) => ({
        ...l,
        id: l._id,
      })
    );

    const totalResults =
      mappedListings.length +
      (posts ?? []).length +
      (destinations ?? []).length;

    // Log search async — never blocks response
    if (q) {
      logSearch(q, totalResults, type || undefined, city || undefined);
    }

    return NextResponse.json({
      query: q,
      listings: mappedListings,
      posts: posts ?? [],
      destinations: destinations ?? [],
      total: totalResults,
      context: {
        type: type || undefined,
        city: city || undefined,
        subcategory: sub || undefined,
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
