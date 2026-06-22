import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { adminClient } from "@/lib/supabase/admin";
import { EmbeddedBooking } from "./EmbeddedBooking";

// Uncached so the parent hostname (Referer) and ?ref are evaluated per request,
// and owner edits in the PMS appear on next load. Same posture as the other
// /embed/* routes.
export const dynamic = "force-dynamic";

interface EmbedBookingPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEFAULT_ACCENT = "E8A020";
const DEFAULT_BG = "white";

function sanitizeHex(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  return /^[0-9a-fA-F]{3,8}$/.test(raw) ? raw : fallback;
}
function sanitizeBg(raw: string | undefined): string {
  if (!raw) return DEFAULT_BG;
  if (raw === "transparent" || raw === "white") return raw;
  return /^[0-9a-fA-F]{3,8}$/.test(raw) ? `#${raw}` : DEFAULT_BG;
}
function sanitizeTheme(raw: string | undefined): "light" | "dark" {
  return raw === "dark" ? "dark" : "light";
}
function parseRefererHostname(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * /embed/booking/[slug] — iframe-friendly room-booking widget.
 *
 * Parallel to /embed/reservations/[slug] but for properties/PMS. The owner
 * pastes one snippet (or the embed.js data-attribute) and guests can check
 * availability and send a booking enquiry from the owner's own site. Submits
 * to /api/properties/booking-enquiry; the host converts it in the PMS.
 *
 * Lookup is by booking_slug — same key the public /b/[slug] page uses.
 */
export default async function EmbedBookingPage({
  params,
  searchParams,
}: EmbedBookingPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const { data: property } = await adminClient
    .from("properties")
    .select(
      "id, name, city, renting_type, entire_place_price, listing_slug, booking_slug, is_active",
    )
    .eq("booking_slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!property) notFound();

  const { data: rooms } = await adminClient
    .from("rooms")
    .select(
      "id, name, description, photos, amenities, bed_type, room_size_sqm, max_guests, base_price_kes, sanity_room_key, is_active, display_order",
    )
    .eq("property_id", property.id)
    .eq("is_active", true)
    .order("display_order");

  const widgetRooms = (rooms ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    photos: r.photos ?? [],
    amenities: r.amenities ?? [],
    bedType: r.bed_type,
    sizeSqm: r.room_size_sqm,
    maxGuests: r.max_guests,
    pricePerNight: r.base_price_kes,
    sanityKey: r.sanity_room_key,
  }));

  // Attribution — source_origin from Referer (server-side, un-forgeable),
  // source_ref from the owner's ?ref campaign tag.
  const referer = (await headers()).get("referer");
  const sourceOrigin = parseRefererHostname(referer);
  const rawRef = typeof sp.ref === "string" ? sp.ref : null;
  const sourceRef = rawRef ? rawRef.slice(0, 64) : null;

  // Theming (mirror of the snippet generator + other embeds).
  const theme = sanitizeTheme(typeof sp.theme === "string" ? sp.theme : undefined);
  const accent = `#${sanitizeHex(typeof sp.accent === "string" ? sp.accent : undefined, DEFAULT_ACCENT)}`;
  const background = sanitizeBg(typeof sp.bg === "string" ? sp.bg : undefined);

  return (
    <EmbeddedBooking
      propertyId={property.id}
      propertyName={property.name}
      propertyCity={property.city}
      listingSlug={property.listing_slug}
      bookingSlug={slug}
      rentingType={property.renting_type ?? "both"}
      entirePlacePrice={property.entire_place_price}
      rooms={widgetRooms}
      sourceOrigin={sourceOrigin}
      sourceRef={sourceRef}
      theme={theme}
      accent={accent}
      background={background}
    />
  );
}
