import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAuthUser, getIsAdmin } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { RoomManagementSection } from "./_components/RoomManagementSection";
import { PropertyCalendarWrapper } from "./_components/PropertyCalendarWrapper";
import { TodaySnapshot } from "./_components/TodaySnapshot";
import type { RoomData } from "./_components/RoomEditPanel";

export default async function PropertyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const isAdmin = await getIsAdmin(user.id);

  // Fetch property — admin bypasses owner_id filter
  let propertyQuery = adminClient
    .from("properties")
    .select("*")
    .eq("id", id);
  if (!isAdmin) propertyQuery = propertyQuery.eq("owner_id", user.id);
  const { data: property } = await propertyQuery.single();

  if (!property) notFound();

  // Fetch linked Sanity listing if slug exists
  let linkedListing: {
    title: string;
    city: string | null;
    type: string;
    coverPhoto: string | null;
    slug: string;
  } | null = null;
  if (property.listing_slug) {
    const listing = await sanityClient.fetch(
      `*[_type == "listing" && slug.current == $slug][0]{
        title, city, type,
        "coverPhoto": photos[0]{ asset->{ url } },
        "slug": slug.current
      }`,
      { slug: property.listing_slug }
    );
    if (listing) {
      linkedListing = {
        title: listing.title,
        city: listing.city,
        type: listing.type,
        coverPhoto: listing.coverPhoto?.asset?.url ?? null,
        slug: listing.slug,
      };
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const sixtyDaysOut = new Date();
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
  const sixtyStr = sixtyDaysOut.toISOString().split("T")[0];

  // Parallel: rooms + 60-day bookings + enquiries
  const [roomsResult, calBookingsResult, enquiriesResult] = await Promise.all([
    adminClient
      .from("rooms")
      .select(
        "id, name, room_number, room_type, bed_type, room_size_sqm, max_guests, base_price_kes, description, amenities, photos, is_active, display_order"
      )
      .eq("property_id", id)
      .order("display_order"),
    adminClient
      .from("bookings")
      .select(
        "id, property_id, room_id, guest_name, guest_email, guest_phone, guest_count, guest_notes, check_in_date, check_out_date, nights, source, external_id, rate_per_night, subtotal_kes, discount_kes, extras_kes, total_kes, amount_paid_kes, balance_kes, status, payment_status, mpesa_ref, internal_notes, created_at"
      )
      .eq("property_id", id)
      .neq("status", "cancelled")
      .lt("check_in_date", sixtyStr)
      .gt("check_out_date", todayStr),
    adminClient
      .from("contact_requests")
      .select(
        "id, full_name, email, phone, room_id, check_in, check_out, guests, calendar_status, hold_type, expires_at, listing_title, notes, property_id"
      )
      .eq("property_id", id)
      .in("calendar_status", ["pending", "held"])
      .not("room_id", "is", null)
      .not("check_in", "is", null)
      .not("check_out", "is", null),
  ]);

  const allRooms = (roomsResult.data ?? []).map((r) => ({
    ...r,
    amenities: r.amenities ?? [],
    photos: r.photos ?? [],
  })) as RoomData[];
  const activeRooms = allRooms.filter((r) => r.is_active);
  const calBookings = calBookingsResult.data ?? [];
  const enquiries = enquiriesResult.data ?? [];

  // Fetch blocked dates after we have room IDs
  const roomIds = activeRooms.map((r) => r.id);
  const blockedResult =
    roomIds.length > 0
      ? await adminClient
          .from("blocked_dates")
          .select("id, room_id, start_date, end_date, reason")
          .in("room_id", roomIds)
          .lt("start_date", sixtyStr)
          .gt("end_date", todayStr)
      : { data: [] };
  const blockedDates = blockedResult.data ?? [];

  const typeLabels: Record<string, string> = {
    villa: "Villa / Holiday Home",
    hotel: "Hotel",
    guesthouse: "Guesthouse",
    apartment: "Apartment",
    cottage: "Beach Cottage",
    camp: "Safari Camp",
  };

  // If no rooms at all, show setup prompt
  if (allRooms.length === 0) {
    return (
      <div>
        <div className="mb-5">
          <Link
            href="/dashboard/property"
            className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
          >
            ← Property PMS
          </Link>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C] mt-2">
            {property.name}
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            {typeLabels[property.property_type] ?? property.property_type}
            {property.city ? ` · ${property.city}` : ""}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-3">
            <span className="text-[28px]">🛏️</span>
          </div>
          <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
            No rooms set up yet
          </p>
          <p className="text-[13px] text-[#9C9485] mb-4 max-w-[320px] mx-auto">
            Add your rooms to start managing availability and bookings on the calendar.
          </p>
          <Link
            href={`/dashboard/property/new?edit=${property.id}`}
            className="inline-block bg-[#4F46E5] text-white font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            Set up rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <Link
          href="/dashboard/property"
          className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          ← Property PMS
        </Link>
        <div className="flex items-start justify-between mt-2 gap-3">
          <div>
            <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
              {property.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#F4F1EC] text-[11px] font-semibold text-[#5E5848]">
                {typeLabels[property.property_type] ?? property.property_type}
              </span>
              {property.city && (
                <span className="text-[13px] text-[#9C9485]">{property.city}</span>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/property/${property.id}/settings`}
            className="text-[12px] font-semibold text-[#5E5848] bg-white border border-[#E2DDD5] px-3 h-[34px] rounded-lg hover:border-[#9C9485] transition-colors flex items-center shrink-0 mt-1"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* SECTION 1 — Today's Snapshot */}
      <div className="mb-5">
        <TodaySnapshot
          bookings={calBookings}
          rooms={allRooms}
          propertyId={id}
          enquiries={enquiries}
        />
      </div>

      {/* SECTION 2 — Single-property calendar */}
      <div className="mb-8">
        <PropertyCalendarWrapper
          propertyId={id}
          rooms={activeRooms}
          bookings={calBookings}
          blockedDates={blockedDates}
          enquiries={enquiries}
        />
      </div>

      {/* SECTION 3 — Linked listing */}
      {linkedListing ? (
        <div className="mb-5 bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-3 lg:p-4 shadow-sm">
          <div className="flex gap-3 items-center">
            <div className="shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-[#F4F1EC] relative">
              {linkedListing.coverPhoto ? (
                <Image
                  src={`${linkedListing.coverPhoto}?w=200&auto=format`}
                  alt={linkedListing.title}
                  fill
                  sizes="72px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[28px]">🏨</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#16130C] truncate">
                {linkedListing.title}
              </p>
              {linkedListing.city && (
                <p className="text-[13px] text-[#9C9485]">{linkedListing.city}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <a
                  href={(() => {
                    const typeSlug =
                      linkedListing.type === "experience"
                        ? "experiences"
                        : linkedListing.type + "s";
                    const citySlug = (linkedListing.city ?? "")
                      .toLowerCase()
                      .replace(/\s+/g, "-");
                    return citySlug
                      ? `/${typeSlug}/${citySlug}/${linkedListing.slug}`
                      : `/${typeSlug}/${linkedListing.slug}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                >
                  View on Klickenya ↗
                </a>
              </div>
              <p className="text-[10px] text-[#9C9485] mt-0.5">
                Guests who enquire through your listing appear here automatically
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-5 bg-[#F4F1EC] rounded-xl p-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#9C9485]">No listing linked</p>
            <Link
              href={`/dashboard/property/${property.id}/settings`}
              className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA]"
            >
              Link a Klickenya listing
            </Link>
          </div>
        </div>
      )}

      {/* SECTION 4 — Room management */}
      <div className="mb-8">
        <RoomManagementSection
          initialRooms={allRooms}
          propertyId={property.id}
          propertyName={property.name}
        />
      </div>
    </div>
  );
}
