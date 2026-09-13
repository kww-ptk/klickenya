import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { sanityClient, sanityFetch } from "@/lib/sanity/client";
import { LISTINGS_TAG, listingTag } from "@/lib/listings/revalidate";
import { adminClient } from "@/lib/supabase/admin";
import {
  LISTING_BY_SLUG_QUERY,
  EVENT_BY_SLUG_QUERY,
  LISTING_SLUGS_QUERY,
  SIMILAR_LISTINGS_QUERY,
  EVENTS_AT_VENUE_QUERY,
} from "@/lib/sanity/queries";
import { urlForImage } from "@/lib/sanity/image";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";
import {
  pickSocialImages,
  schemaImages,
  breadcrumbJsonLd,
  openingHoursSpecification,
  type Crumb,
} from "@/lib/seo/listing";
import type { ListingCardProps } from "@/components/listings/ListingCard";
import type { MenuData } from "@/components/listings/detail/restaurant/MenuDisplay";
import type { RestaurantArea } from "@/components/reservations/ReservationSheet";
import { StayDetail } from "@/components/listings/detail/StayDetail";
import { RestaurantDetail } from "@/components/listings/detail/RestaurantDetail";
import { ExperienceDetail } from "@/components/listings/detail/ExperienceDetail";
import { EventDetail } from "@/components/listings/detail/EventDetail";
import { ServiceDetail } from "@/components/listings/detail/ServiceDetail";
import { EventsHere, type EventsHereItem } from "@/components/listings/EventsHere";

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

/**
 * Sanity stores the restaurant price band as budget | mid-range | fine-dining.
 * schema.org priceRange expects the "$$" convention, which is what Google
 * renders in the local pack; the raw slug renders as literal text.
 */
const PRICE_BAND_TO_SCHEMA: Record<string, string> = {
  budget: "$",
  "mid-range": "$$",
  "fine-dining": "$$$",
};

/**
 * The Sanity `type` a listing is filed under is not always the thing it is.
 * 38 of the 39 restaurants on the marketplace are `type: "experience"` with
 * `subcategory: "restaurants"` — they live at /experiences/<city>/<slug> and
 * the page already reads the subcategory to decide whether to render a menu.
 * The structured data has to read it too, otherwise every restaurant on the
 * site is published to Google as a TouristAttraction and forfeits the
 * Restaurant rich result (cuisine, hours, price range, menu).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function effectiveSchemaType(listing: any, sanityType: string): string {
  if (listing?.subcategory === "restaurants") return "restaurant";
  return sanityType;
}

function buildJsonLd(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listing: any,
  urlType: UrlType,
  photoUrls: string[],
  pagePath: string,
) {
  const sanityType = effectiveSchemaType(listing, TYPE_TO_SANITY[urlType]);
  const pageUrl = absoluteUrl(pagePath);
  const cityName = listing.city ?? "";
  const description =
    listing.seoDescription ??
    `${SINGULAR_LABELS[sanityType] ?? "Listing"} in ${cityName}, Kenya.`;

  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: TYPE_LABELS[urlType], path: `/${urlType}` },
    ...(cityName
      ? [
          {
            name: cityName,
            path: `/${urlType}/${cityName.toLowerCase().trim().replace(/\s+/g, "-")}`,
          },
        ]
      : []),
    { name: listing.title, path: pagePath },
  ];

  const base: Record<string, unknown> = {
    "@id": `${pageUrl}#listing`,
    name: listing.title,
    description,
    url: pageUrl,
    ...(photoUrls.length > 0 ? { image: photoUrls } : {}),
    address: {
      "@type": "PostalAddress",
      ...(listing.address ? { streetAddress: listing.address } : {}),
      addressLocality: cityName,
      addressRegion: listing.county,
      addressCountry: "KE",
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  // A price of 0 is "free", not "unpriced" — only drop the offer when there is
  // genuinely no number. Offers without a price are invalid and get ignored.
  const hasPrice = typeof listing.price === "number";
  const offer = hasPrice
    ? {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: "KES",
        url: pageUrl,
        availability: "https://schema.org/InStock",
      }
    : undefined;

  const openingHours = openingHoursSpecification(listing.openingHours);

  let entity: Record<string, unknown>;

  switch (sanityType) {
    case "stay":
      entity = {
        ...base,
        "@type": "LodgingBusiness",
        ...(hasPrice ? { priceRange: `From KSh ${listing.price}` } : {}),
        ...(listing.maxGuests ? { maximumAttendeeCapacity: listing.maxGuests } : {}),
        ...(Array.isArray(listing.amenities) && listing.amenities.length > 0
          ? {
              amenityFeature: listing.amenities.map((a: string) => ({
                "@type": "LocationFeatureSpecification",
                name: a,
                value: true,
              })),
            }
          : {}),
      };
      break;

    case "restaurant":
      entity = {
        ...base,
        "@type": "Restaurant",
        ...(listing.cuisine ? { servesCuisine: listing.cuisine } : {}),
        ...(listing.priceRange
          ? { priceRange: PRICE_BAND_TO_SCHEMA[listing.priceRange] ?? listing.priceRange }
          : {}),
        ...(openingHours ? { openingHoursSpecification: openingHours } : {}),
        ...(typeof listing.reservationRequired === "boolean"
          ? { acceptsReservations: listing.reservationRequired }
          : {}),
        ...(Array.isArray(listing.menu) && listing.menu.length > 0
          ? { hasMenu: `${pageUrl}#menu` }
          : {}),
      };
      break;

    case "experience":
      entity = {
        ...base,
        "@type": "TouristAttraction",
        ...(cityName ? { touristType: "Leisure" } : {}),
        ...(offer ? { isAccessibleForFree: listing.price === 0 } : {}),
      };
      break;

    case "event": {
      // Google drops an Event with no startDate outright. A weekly night out
      // ("Every Saturday") has no single start date but does have a schedule,
      // and schema.org models that with eventSchedule — which is how both live
      // recurring events on the site get to be Events at all. Only a dateless
      // event with no schedule either falls back to a plain Place.
      const weekly = Array.isArray(listing.schedule)
        ? listing.schedule.filter(
            (sl: { day?: string; startTime?: string }) => sl?.day && sl?.startTime,
          )
        : [];

      if (!listing.eventDate && weekly.length === 0) {
        entity = { ...base, "@type": "Place" };
        break;
      }
      const priceFrom =
        typeof listing.priceFrom === "number"
          ? listing.priceFrom
          : listing.isFree
            ? 0
            : hasPrice
              ? listing.price
              : undefined;

      entity = {
        ...base,
        "@type": "Event",
        ...(listing.eventDate
          ? {
              startDate: listing.eventDate,
              ...(listing.eventEndDate ? { endDate: listing.eventEndDate } : {}),
            }
          : {
              eventSchedule: weekly.map(
                (sl: { day: string; startTime: string; endTime?: string }) => ({
                  "@type": "Schedule",
                  repeatFrequency: "P1W",
                  byDay: `https://schema.org/${sl.day.charAt(0).toUpperCase()}${sl.day.slice(1)}`,
                  startTime: sl.startTime,
                  ...(sl.endTime ? { endTime: sl.endTime } : {}),
                  scheduleTimezone: "Africa/Nairobi",
                }),
              ),
            }),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: listing.venue ?? listing.title,
          address: listing.venueAddress
            ? {
                "@type": "PostalAddress",
                streetAddress: listing.venueAddress,
                addressLocality: cityName,
                addressRegion: listing.county,
                addressCountry: "KE",
              }
            : base.address,
        },
        ...(listing.organizer
          ? { organizer: { "@type": "Organization", name: listing.organizer } }
          : {}),
        ...(Array.isArray(listing.performers) && listing.performers.length > 0
          ? {
              performer: listing.performers.map((p: { name: string }) => ({
                "@type": "PerformingGroup",
                name: p.name,
              })),
            }
          : {}),
        ...(typeof priceFrom === "number"
          ? {
              offers: {
                "@type": "Offer",
                price: priceFrom,
                priceCurrency: "KES",
                url: pageUrl,
                availability: "https://schema.org/InStock",
              },
            }
          : {}),
      };
      break;
    }

    default:
      // Services and rentals are businesses with an address, not Products.
      // LocalBusiness is what Google matches against local intent queries.
      entity = {
        ...base,
        "@type": "LocalBusiness",
        ...(hasPrice ? { priceRange: `From KSh ${listing.price}` } : {}),
        ...(openingHours ? { openingHoursSpecification: openingHours } : {}),
        ...(offer ? { makesOffer: offer } : {}),
      };
  }

  // A WebPage node naming its own primaryImageOfPage is the one explicit way
  // to tell Google which image represents this page. Without it Google picks
  // the largest prominent image it can find, which on a listing page is often
  // a photo from the "Similar listings" rail — i.e. a different business's
  // storefront shown as this listing's thumbnail.
  const webPage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: listing.seoTitle ?? listing.title,
    description,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${pageUrl}#listing` },
    breadcrumb: { "@id": `${pageUrl}#breadcrumb` },
    ...(photoUrls.length > 0
      ? {
          primaryImageOfPage: {
            "@type": "ImageObject",
            "@id": `${pageUrl}#primaryimage`,
            url: photoUrls[0],
            contentUrl: photoUrls[0],
          },
        }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [webPage, entity, breadcrumbJsonLd(crumbs, pageUrl)],
  };
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
  const listing = await sanityClient.fetch(metaQuery, { slug }, {
    next: { revalidate: 60, tags: [listingTag(slug)] },
  });

  if (!listing) return {};

  const cityName = listing.city ?? capitalize(city);
  const pagePath = `/${type}/${city}/${slug}`;
  const canonical = absoluteUrl(pagePath);

  // Bare — the root layout's "%s | Klickenya" template appends the brand.
  // Appending it here as well would double it in the <title>.
  const title = listing.seoTitle ?? listing.title;

  const description =
    listing.seoDescription ??
    `${SINGULAR_LABELS[TYPE_TO_SANITY[type]] ?? "Listing"} in ${cityName}, Kenya.`;

  const images = pickSocialImages(listing.photos, `${listing.title} — ${cityName}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images,
      // siteName and locale live on the root layout, but Next replaces the
      // openGraph object wholesale rather than merging it, so every listing
      // page was shipping social cards with no site name and no locale.
      siteName: "Klickenya",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
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
    tags: [listingTag(slug)],
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
    tags: [LISTINGS_TAG],
  });

  // Events happening at THIS listing (its venueListing points here). Runs for
  // every listing type — any listing can be a venue. Single GROQ call reusing
  // the page's cached sanityFetch.
  const { data: venueEvents } = await sanityFetch({
    query: EVENTS_AT_VENUE_QUERY,
    params: { id: listing._id },
    tags: [LISTINGS_TAG],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventsHereItems: EventsHereItem[] = (venueEvents ?? []).map((e: any) => ({
    id: e._id,
    title: e.title ?? "Untitled",
    slug: e.slug ?? "",
    city: e.city ?? "",
    subcategory: e.subcategory ?? null,
    coverPhotoUrl: e.coverPhotoUrl ?? null,
    eventDate: e.eventDate ?? "",
    isFree: e.isFree ?? false,
    priceFrom: e.priceFrom ?? e.price ?? null,
    isRecurring: e.isRecurring ?? false,
    recurrenceRule: e.recurrenceRule ?? null,
  }));

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

  const jsonLd = buildJsonLd(listing, type, schemaImages(listing.photos), `/${type}/${city}/${slug}`);
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
    eventsHere: eventsHereItems,
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
      {/* Restaurants render "Events happening here" under the menu inside
          RestaurantDetail; every other listing type renders it here. */}
      {listing.subcategory !== "restaurants" && sanityType !== "restaurant" && eventsHereItems.length > 0 && (
        <div className="max-w-[1280px] mx-auto px-5 md:px-10">
          <EventsHere events={eventsHereItems} />
        </div>
      )}
    </>
  );
}
