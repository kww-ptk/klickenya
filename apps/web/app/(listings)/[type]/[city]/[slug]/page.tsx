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
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";
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
    urlForImage(p).width(1500).auto("format").quality(85).url()
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
  let reservationsConfig: {
    enabled: boolean;
    menuId: string;
    menuName: string;
    leadTimeHours: number;
    maxPartySize: number;
    maxAdvanceDays: number;
    durationMinutes: number;
    areas: RestaurantArea[];
    restaurantPhone: string | null;
    timeWindows: Array<{ open_time: string; close_time: string; is_active: boolean }>;
  } | null = null;

  if (isRestaurantListing) {
    // Fetch the menu row regardless of publish state so reservation + other
    // feature settings (reservations_enabled, areas, time windows, max party
    // size, etc.) can light up the listing page even when the menu sections
    // themselves are still in draft. menuData (the public items grid) is only
    // assigned when is_published === true, so a draft menu is never shown
    // to guests.
    const { data } = await adminClient
      .from("menus")
      .select(
        `
        id, slug, name, is_published, table_ordering,
        reservations_enabled, default_reservation_duration,
        reservations_lead_time_hours, reservations_max_party_size,
        reservations_max_advance_days, business_id,
        menu_sections (
          id, title, display_order, is_visible, station,
          menu_items (
            id, name, description, price_kes,
            dietary_tags, is_available, display_order, photo_url, is_featured
          )
        )
      `
      )
      .eq("listing_slug", slug)
      .single();

    if (data) {
      // Items grid is gated on publish; reservations are not.
      if ((data as Record<string, unknown>).is_published === true) {
        menuData = data as MenuData;
      }

      // Fetch restaurant areas + host phone + time windows in parallel (non-blocking on error)
      const [areasResult, hostResult, windowsResult] = await Promise.allSettled([
        adminClient
          .from("restaurant_areas")
          .select("id, name, capacity_total, color_hex, display_order, is_active")
          .eq("menu_id", data.id)
          .eq("is_active", true)
          .order("display_order"),
        data.business_id
          ? adminClient
              .from("host_profiles")
              .select("phone")
              .eq("user_id", data.business_id)
              .single()
          : Promise.resolve({ data: null }),
        adminClient
          .from("reservation_time_windows")
          .select("open_time, close_time, is_active")
          .eq("menu_id", data.id)
          .eq("is_active", true)
          .order("display_order"),
      ]);

      const areas =
        areasResult.status === "fulfilled"
          ? ((areasResult.value.data ?? []) as RestaurantArea[])
          : [];

      const restaurantPhone =
        hostResult.status === "fulfilled" && hostResult.value.data
          ? (hostResult.value.data as { phone?: string | null }).phone ?? null
          : null;

      const timeWindows =
        windowsResult.status === "fulfilled"
          ? ((windowsResult.value.data ?? []) as Array<{ open_time: string; close_time: string; is_active: boolean }>)
          : [];

      reservationsConfig = {
        enabled: (data as Record<string, unknown>).reservations_enabled === true,
        menuId: data.id,
        menuName: data.name,
        leadTimeHours: ((data as Record<string, unknown>).reservations_lead_time_hours as number) ?? 2,
        maxPartySize: ((data as Record<string, unknown>).reservations_max_party_size as number) ?? 12,
        maxAdvanceDays: ((data as Record<string, unknown>).reservations_max_advance_days as number) ?? 30,
        durationMinutes: ((data as Record<string, unknown>).default_reservation_duration as number) ?? 90,
        areas,
        restaurantPhone,
        timeWindows,
      };
    }
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

  // Fetch room data from Supabase PMS for stays — replaces Sanity rooms when PMS linked
  let roomAvailability: Record<string, boolean> | undefined;
  let roomPriceOverrides: Record<string, number> | undefined;
  let entirePropertyAvailable: boolean | undefined;
  let recentBookings: number | undefined;
  let hasPms = false;
  if (sanityType === "stay") {
    try {
      // Fetch linked property — try with extended columns, fall back to basic
      let linkedProps: any[] | null = null;
      {
        const res = await adminClient
          .from("properties")
          .select("id, renting_type, entire_place_price")
          .eq("listing_slug", slug)
          .eq("is_active", true);
        if (!res.error) {
          linkedProps = res.data;
        } else {
          // Columns not migrated yet — basic query
          const basic = await adminClient
            .from("properties")
            .select("id")
            .eq("listing_slug", slug)
            .eq("is_active", true);
          linkedProps = basic.data;
        }
      }

      const property = linkedProps?.[0];
      const propertyIds = linkedProps?.map((p: { id: string }) => p.id) ?? [];

      if (property && propertyIds.length > 0) {
        // Fetch room fields from Supabase — try full, fall back to basic
        let pmsRooms: any[] | null = null;
        {
          const res = await adminClient
            .from("rooms")
            .select("id, name, description, photos, amenities, bed_type, room_size_sqm, max_guests, base_price_kes, sanity_room_key, is_active")
            .in("property_id", propertyIds)
            .eq("is_active", true)
            .order("display_order");
          if (!res.error) {
            pmsRooms = res.data;
          } else {
            // New columns not migrated — basic query
            const basic = await adminClient
              .from("rooms")
              .select("id, name, description, photos, amenities, max_guests, base_price_kes, sanity_room_key, is_active")
              .in("property_id", propertyIds)
              .eq("is_active", true)
              .order("display_order");
            pmsRooms = basic.data;
          }
        }

        if (pmsRooms && pmsRooms.length > 0) {
          const todayStr = new Date().toISOString().split("T")[0];
          const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

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

          entirePropertyAvailable = roomAvailResults.every((r) => r.available);

          // Build RoomType objects from Supabase data — REPLACES Sanity rooms
          const supabaseRooms = roomAvailResults.map((r) => ({
            _key: r.sanity_room_key ?? r.id,
            roomName: r.name,
            roomDescription: r.description ?? undefined,
            photos: (r.photos ?? []).map((url: string) => ({
              asset: { _id: url, url, metadata: undefined },
              alt: r.name,
            })),
            pricePerNight: r.base_price_kes,
            capacity: r.max_guests,
            bedType: r.bed_type ?? undefined,
            roomSizeSqm: r.room_size_sqm ?? undefined,
            roomAmenities: r.amenities ?? [],
            isAvailable: true, // Default to available — actual availability checked when guest picks dates
            quantity: 1,
          }));

          // Override listing data with PMS data
          hasPms = true;
          listing.rooms = supabaseRooms;
          if (property.renting_type) listing.rentingType = property.renting_type;
          if (property.entire_place_price) listing.price = property.entire_place_price;

          // Build avail/price maps for the availability-by-slug API (client-side checks)
          const avail: Record<string, boolean> = {};
          const prices: Record<string, number> = {};
          for (const r of supabaseRooms) {
            avail[r._key] = r.isAvailable;
            prices[r._key] = r.pricePerNight;
          }
          roomAvailability = avail;
          roomPriceOverrides = prices;

          // Count recent bookings (last 30 days) for social proof
          const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
          const { count: bookingCount } = await adminClient
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .in("property_id", propertyIds)
            .gte("created_at", thirtyDaysAgo)
            .neq("status", "cancelled");
          recentBookings = bookingCount ?? 0;
        }
      }
    } catch {
      // Non-blocking — fall back to Sanity rooms
    }
  }

  // TODO: Remove — test data for Maya Kobe demo
  if (slug === "maya-kobe") {
    listing.avgRating = listing.avgRating || 4.8;
    listing.reviewCount = listing.reviewCount || 27;
    listing.isVerified = true;
    recentBookings = recentBookings || 9;
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
    recentBookings,
    hasPms,
    reservationsConfig,
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
