import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import {
  LISTING_BY_SLUG_QUERY,
  EVENT_BY_SLUG_QUERY,
  LISTING_SLUGS_QUERY,
  SIMILAR_LISTINGS_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { JsonLd } from "@/components/seo/JsonLd";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import { StayDetail } from "@/components/listings/detail/StayDetail";
import { RestaurantDetail } from "@/components/listings/detail/RestaurantDetail";
import { ExperienceDetail } from "@/components/listings/detail/ExperienceDetail";
import { EventDetail } from "@/components/listings/detail/EventDetail";
import { ServiceDetail } from "@/components/listings/detail/ServiceDetail";

export const dynamic = 'force-static';
export const revalidate = 3600;

/* ── Type mapping ────────────────────────────────── */

const VALID_TYPES = ["stays", "experiences", "events", "rentals", "services", "restaurants"] as const;
type UrlType = (typeof VALID_TYPES)[number];

const TYPE_TO_SANITY: Record<UrlType, string> = {
  stays: "stay",
  experiences: "experience",
  events: "event",
  rentals: "rental",
  services: "service",
  restaurants: "restaurant",
};

const TYPE_LABELS: Record<UrlType, string> = {
  stays: "Stays",
  experiences: "Experiences",
  events: "Events",
  rentals: "Rentals",
  services: "Services",
  restaurants: "Restaurants",
};

const SINGULAR_LABELS: Record<string, string> = {
  stay: "Stay",
  experience: "Experience",
  event: "Event",
  rental: "Rental",
  service: "Service",
  restaurant: "Restaurant",
};

function isValidType(type: string): type is UrlType {
  return VALID_TYPES.includes(type as UrlType);
}

function capitalize(str: string): string {
  return str
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── JSON-LD helpers ─────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJsonLd(listing: any, urlType: UrlType, photoUrls: string[]) {
  const sanityType = TYPE_TO_SANITY[urlType];
  const base = {
    "@context": "https://schema.org",
    name: listing.title,
    description: listing.seoDescription ?? listing.title,
    image: photoUrls[0],
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      addressRegion: listing.county,
      addressCountry: "KE",
    },
  };

  switch (sanityType) {
    case "stay":
      return {
        ...base,
        "@type": "LodgingBusiness",
        priceRange: `KSh ${listing.price}`,
      };
    case "experience":
      return {
        ...base,
        "@type": "TouristAttraction",
      };
    case "restaurant":
      return {
        ...base,
        "@type": "Restaurant",
        servesCuisine: listing.cuisine,
      };
    case "event":
      return {
        ...base,
        "@type": "Event",
        offers: {
          "@type": "Offer",
          price: listing.price,
          priceCurrency: "KES",
        },
      };
    default:
      return {
        ...base,
        "@type": "Product",
        offers: {
          "@type": "Offer",
          price: listing.price,
          priceCurrency: "KES",
        },
      };
  }
}

/* ── Static params ───────────────────────────────── */

export async function generateStaticParams() {
  const slugs: { slug: string; type: string; city: string }[] =
    await sanityClient.fetch(LISTING_SLUGS_QUERY);

  return (slugs ?? [])
    .filter((s) => s.slug && s.type && s.city)
    .map((s) => {
      const urlType =
        Object.entries(TYPE_TO_SANITY).find(([, v]) => v === s.type)?.[0] ?? "";
      return {
        type: urlType,
        city: s.city.toLowerCase().replace(/\s+/g, "-"),
        slug: s.slug,
      };
    })
    .filter((p) => p.type);
}

/* ── Metadata ────────────────────────────────────── */

interface PageProps {
  params: Promise<{ type: string; city: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, city, slug } = await params;

  if (!isValidType(type)) return {};

  const metaQuery = TYPE_TO_SANITY[type] === "event" ? EVENT_BY_SLUG_QUERY : LISTING_BY_SLUG_QUERY;
  const listing = await sanityClient.fetch(metaQuery, { slug });

  if (!listing) return {};

  const title = listing.seoTitle ?? `${listing.title} | Klickenya`;
  const description =
    listing.seoDescription ??
    `${SINGULAR_LABELS[TYPE_TO_SANITY[type]] ?? "Listing"} in ${listing.city ?? capitalize(city)}, Kenya.`;

  const ogImages =
    listing.photos?.slice(0, 3).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => urlForImage(p).width(1200).height(630).url()
    ) ?? [];

  return {
    title,
    description,
    alternates: { canonical: `https://klickenya.com/${type}/${city}/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://klickenya.com/${type}/${city}/${slug}`,
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}

/* ── Page ────────────────────────────────────────── */

export default async function ListingDetailPage({ params }: PageProps) {
  const { type, city, slug } = await params;

  if (!isValidType(type)) notFound();

  const sanityType = TYPE_TO_SANITY[type];
  const slugQuery = sanityType === "event" ? EVENT_BY_SLUG_QUERY : LISTING_BY_SLUG_QUERY;
  const { data: listing } = await sanityFetch({
    query: slugQuery,
    params: { slug },
  });

  if (!listing) notFound();

  const cityName = listing.city ?? capitalize(city);
  const label = TYPE_LABELS[type];
  const singularLabel = SINGULAR_LABELS[sanityType] ?? "Listing";

  // Photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photos: string[] = (listing.photos ?? []).map((p: any) =>
    urlForImage(p).width(1000).url()
  );

  // Similar listings
  const { data: similar } = await sanityFetch({
    query: SIMILAR_LISTINGS_QUERY,
    params: { type: sanityType, city: cityName, slug },
  });

  // Fetch Supabase menu data for restaurants only
  const isRestaurantListing =
    listing.subcategory === "restaurants" || sanityType === "restaurant";
  let menuData: MenuData | null = null;
  if (isRestaurantListing) {
    const { data } = await adminClient
      .from("menus")
      .select(
        `
        id, slug, name, is_published,
        menu_sections (
          id, title, display_order, is_visible,
          menu_items (
            id, name, description, price_kes,
            dietary_tags, is_available, display_order, photo_url
          )
        )
      `
      )
      .eq("slug", slug)
      .eq("is_published", true)
      .single();
    menuData = (data as MenuData) ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const similarCards: ListingCardProps[] = (similar ?? []).map((l: any) => {
    const lSlug = l.slug?.current ?? l.slug ?? "";
    const lCity = (l.city ?? "").toLowerCase().replace(/\s+/g, "-");
    const photoUrl = l.coverPhoto
      ? urlForImage(l.coverPhoto).width(800).url()
      : "";

    return {
      id: l._id,
      title: l.title ?? "Untitled",
      city: l.city ?? "",
      price: l.price ?? 0,
      priceUnit: l.priceUnit ?? "night",
      type: sanityType as ListingCardProps["type"],
      isVerified: l.isVerified ?? false,
      hostName: l.hostName,
      photos: photoUrl ? [photoUrl] : [],
      href: `/${type}/${lCity}/${lSlug}`,
    };
  });

  const jsonLd = buildJsonLd(listing, type, photos);
  const citySlug = city;

  // For restaurant subcategory, override labels
  const isRestaurant = listing.subcategory === "restaurants";
  const effectiveSingularLabel = isRestaurant ? "Restaurant" : singularLabel;
  const effectiveSanityType = isRestaurant ? "restaurant" : sanityType;

  // Fetch attendees for events
  let attendeeCount = 0;
  let attendees: { name: string }[] = [];
  if (sanityType === "event") {
    const [countRes, attendeesRes] = await Promise.all([
      adminClient
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("event_sanity_id", listing._id)
        .eq("status", "confirmed"),
      adminClient
        .from("event_attendees")
        .select("name")
        .eq("event_sanity_id", listing._id)
        .eq("status", "confirmed")
        .order("joined_at", { ascending: false })
        .limit(5),
    ]);
    attendeeCount = countRes.count ?? 0;
    attendees = (attendeesRes.data ?? []) as { name: string }[];
  }

  // Fetch real room availability + prices from Supabase PMS for stays
  let roomAvailability: Record<string, boolean> | undefined;
  let roomPriceOverrides: Record<string, number> | undefined;
  let entirePropertyAvailable: boolean | undefined;
  if (sanityType === "stay") {
    try {
      const { data: linkedProps } = await adminClient
        .from("properties")
        .select("id")
        .eq("listing_slug", slug)
        .eq("is_active", true);

      const propertyIds = linkedProps?.map((p: { id: string }) => p.id) ?? [];

      if (propertyIds.length > 0) {
        const { data: pmsRooms } = await adminClient
          .from("rooms")
          .select("id, name, sanity_room_key, is_active, base_price_kes")
          .in("property_id", propertyIds)
          .eq("is_active", true);

        if (pmsRooms && pmsRooms.length > 0) {
          const todayStr = new Date().toISOString().split("T")[0];
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
          const avail: Record<string, boolean> = {};
          const prices: Record<string, number> = {};

          // Check availability for all active PMS rooms
          const roomAvailResults = await Promise.all(
            pmsRooms.map(async (r) => {
              const { data: available } = await adminClient.rpc("is_room_available", {
                p_room_id: r.id,
                p_check_in: todayStr,
                p_check_out: tomorrowStr,
              });
              return { ...r, available: available === true };
            })
          );

          // Entire property = available only when ALL rooms are free
          entirePropertyAvailable = roomAvailResults.every((r) => r.available);

          // Helper: match PMS room to Sanity room
          const matchPmsRoom = (sanityRoom: { _key: string; roomName: string }) => {
            // Try exact sanity_room_key match
            const keyMatch = roomAvailResults.find(
              (r) => r.sanity_room_key && r.sanity_room_key === sanityRoom._key
            );
            if (keyMatch) return keyMatch;

            // Try name-based match
            const nameMatch = roomAvailResults.find(
              (r) =>
                !r.sanity_room_key &&
                r.name.toLowerCase().includes(sanityRoom.roomName.toLowerCase())
            );
            if (nameMatch) return nameMatch;

            return null;
          };

          // Map availability + prices to Sanity room _keys
          const sanityRooms = listing.rooms ?? [];
          for (const sanityRoom of sanityRooms) {
            const match = matchPmsRoom(sanityRoom);
            if (match) {
              avail[sanityRoom._key] = match.available;
              if (match.base_price_kes != null) {
                prices[sanityRoom._key] = match.base_price_kes;
              }
            } else {
              // Fallback: any room available = this room available
              avail[sanityRoom._key] = roomAvailResults.some((r) => r.available);
            }
          }

          if (Object.keys(avail).length > 0) {
            roomAvailability = avail;
          }
          if (Object.keys(prices).length > 0) {
            roomPriceOverrides = prices;
          }
        }
      }
    } catch {
      // Non-blocking — fall back to Sanity isAvailable + prices
    }
  }

  // Common props shared by all detail components
  const detailProps = {
    listing,
    photos,
    urlType: type,
    typeLabel: label,
    singularLabel: effectiveSingularLabel,
    sanityType: effectiveSanityType,
    cityName,
    citySlug,
    similarCards,
    attendeeCount,
    attendees,
    menuData,
    roomAvailability,
    roomPriceOverrides,
    entirePropertyAvailable,
  };

  const Detail = (() => {
    // Restaurants are type:"experience" + subcategory:"restaurants"
    if (listing.subcategory === "restaurants") return RestaurantDetail;

    switch (sanityType) {
      case "stay":
        return StayDetail;
      case "restaurant":
        return RestaurantDetail;
      case "experience":
        return ExperienceDetail;
      case "event":
        return EventDetail;
      case "service":
        return ServiceDetail;
      default:
        return StayDetail;
    }
  })();

  return (
    <>
      <JsonLd schema={jsonLd} />
      <Detail {...detailProps} />
    </>
  );
}
