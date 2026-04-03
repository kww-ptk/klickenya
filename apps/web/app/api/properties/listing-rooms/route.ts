import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

/**
 * GET /api/properties/listing-rooms
 * Returns the user's unset-up property and its Sanity listing rooms.
 * Used by the setup wizard to detect importable rooms.
 *
 * Optional: ?property_id=X to check a specific property.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const specificPropertyId = searchParams.get("property_id");

  // Build query
  let query = adminClient
    .from("properties")
    .select("id, name, listing_slug, city, property_type")
    .eq("owner_id", user.id)
    .not("listing_slug", "is", null);

  if (specificPropertyId) {
    query = query.eq("id", specificPropertyId);
  }

  const { data: properties } = await query;

  if (!properties || properties.length === 0) {
    return NextResponse.json({ property: null, listing: null });
  }

  // Find one with zero rooms
  for (const prop of properties) {
    const { count } = await adminClient
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("property_id", prop.id);

    if (count === 0 && prop.listing_slug) {
      // Fetch Sanity listing by slug
      const listing = await sanityClient.fetch(
        `*[_type == "listing" && slug.current == $slug][0]{
          title,
          city,
          price,
          maxGuests,
          rentingType,
          "coverPhoto": photos[0]{ asset->{ url } },
          rooms[] {
            _key,
            roomName,
            roomDescription,
            "roomPhotos": photos[]{ asset->{ url } },
            pricePerNight,
            capacity,
            bedType,
            roomSizeSqm,
            roomAmenities,
            isAvailable,
            quantity
          }
        }`,
        { slug: prop.listing_slug }
      );

      return NextResponse.json({
        property: prop,
        listing: listing ?? null,
      });
    }
  }

  return NextResponse.json({ property: null, listing: null });
}
