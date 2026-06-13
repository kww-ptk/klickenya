import { type Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { BookingWidget } from "@/components/booking/BookingWidget";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProperty(bookingSlug: string) {
  const { data: property } = await adminClient
    .from("properties")
    .select("id, name, city, property_type, renting_type, entire_place_price, listing_slug, is_active")
    .eq("booking_slug", bookingSlug)
    .eq("is_active", true)
    .single();

  if (!property) return null;

  const { data: rooms } = await adminClient
    .from("rooms")
    .select("id, name, description, photos, amenities, bed_type, room_size_sqm, max_guests, base_price_kes, sanity_room_key, is_active")
    .eq("property_id", property.id)
    .eq("is_active", true)
    .order("display_order");

  return { property, rooms: rooms ?? [] };
}

export async function generateStaticParams() {
  const { data } = await adminClient
    .from("properties")
    .select("booking_slug")
    .eq("is_active", true)
    .not("booking_slug", "is", null);
  return (data ?? []).map((p) => ({ slug: p.booking_slug! }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProperty(slug);
  if (!result) return { title: "Book your stay" };
  return {
    title: `Book at ${result.property.name} | Klickenya`,
    description: `Check availability and book your stay at ${result.property.name}${result.property.city ? ` in ${result.property.city}` : ""}.`,
  };
}

export default async function BookingWidgetPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getProperty(slug);
  if (!result) notFound();

  const { property, rooms } = result;

  // Format rooms for the widget
  const widgetRooms = rooms.map((r) => ({
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

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-5 py-4">
        <div className="max-w-[520px] mx-auto">
          <h1 className="font-display text-[20px] font-bold text-dark tracking-[-0.02em]">
            {property.name}
          </h1>
          {property.city && (
            <p className="text-[13px] text-text3">{property.city}</p>
          )}
        </div>
      </header>

      {/* Widget */}
      <main className="flex-1 px-5 py-6">
        <div className="max-w-[520px] mx-auto">
          <BookingWidget
            propertyName={property.name}
            propertyCity={property.city}
            listingSlug={property.listing_slug}
            bookingSlug={slug}
            rentingType={property.renting_type ?? "both"}
            entirePlacePrice={property.entire_place_price}
            rooms={widgetRooms}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-5 py-4 text-center">
        <Link
          href="https://klickenya.com"
          className="text-[12px] text-text3 hover:text-dark transition-colors"
        >
          Powered by <span className="font-semibold text-amber">Klickenya</span>
        </Link>
      </footer>
    </div>
  );
}
