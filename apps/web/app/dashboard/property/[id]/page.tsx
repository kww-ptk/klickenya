import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getAuthUser } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { RoomManagementSection } from "./_components/RoomManagementSection";
import type { RoomData } from "./_components/RoomEditPanel";

export default async function PropertyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  // Fetch property
  const { data: property } = await adminClient
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

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

  // Parallel: rooms + today's check-ins/outs
  const todayStr = new Date().toISOString().split("T")[0];

  const [roomsResult, checkInsResult, checkOutsResult] = await Promise.all([
    adminClient
      .from("rooms")
      .select("id, name, room_number, room_type, bed_type, room_size_sqm, max_guests, base_price_kes, description, amenities, photos, is_active, display_order")
      .eq("property_id", id)
      .order("display_order"),
    adminClient
      .from("bookings")
      .select("id, guest_name, room_id, check_in_date, check_out_date, status, source")
      .eq("property_id", id)
      .eq("check_in_date", todayStr)
      .neq("status", "cancelled"),
    adminClient
      .from("bookings")
      .select("id, guest_name, room_id, check_in_date, check_out_date, status, source")
      .eq("property_id", id)
      .eq("check_out_date", todayStr)
      .neq("status", "cancelled"),
  ]);

  const allRooms = (roomsResult.data ?? []).map((r) => ({
    ...r,
    amenities: r.amenities ?? [],
    photos: r.photos ?? [],
  })) as RoomData[];
  const rooms = allRooms.filter((r) => r.is_active);
  const checkIns = checkInsResult.data ?? [];
  const checkOuts = checkOutsResult.data ?? [];

  const availableTonight = rooms.length - checkIns.length;

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
          <Link href="/dashboard/property/calendar" className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
            ← Calendar
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
      {/* SECTION 1 — Header */}
      <div className="mb-5">
        <Link href="/dashboard/property/calendar" className="text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
          ← Calendar
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
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <Link
              href="/dashboard/property/calendar"
              className="text-[12px] font-semibold text-white bg-[#4F46E5] px-3 h-[34px] rounded-lg hover:bg-[#4338CA] transition-colors flex items-center gap-1.5"
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              Calendar
            </Link>
            <Link
              href={`/dashboard/property/${property.id}/settings`}
              className="text-[12px] font-semibold text-[#5E5848] bg-white border border-[#E2DDD5] px-3 h-[34px] rounded-lg hover:border-[#9C9485] transition-colors flex items-center"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 2 — Today's Snapshot */}
      <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4">
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm">
          <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#16A34A]">
            {checkIns.length}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            Checking in
          </p>
        </div>
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm">
          <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#E8A020]">
            {checkOuts.length}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            Checking out
          </p>
        </div>
        <div className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm">
          <p className="font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none text-[#4F46E5]">
            {availableTonight < 0 ? 0 : availableTonight}
          </p>
          <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
            Available tonight
          </p>
        </div>
      </div>

      {/* Arriving today list */}
      {checkIns.length > 0 && (
        <div className="mb-3 bg-white rounded-xl border border-[#E2DDD5] p-3 shadow-sm">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
            Arriving today
          </p>
          <div className="space-y-1.5">
            {checkIns.map((b) => {
              const room = allRooms.find((r) => r.id === b.room_id);
              return (
                <div key={b.id} className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#16130C]">{b.guest_name}</span>
                  <span className="text-[#9C9485]">{room?.name ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Departing today list */}
      {checkOuts.length > 0 && (
        <div className="mb-5 bg-white rounded-xl border border-[#E2DDD5] p-3 shadow-sm">
          <p className="text-[11px] font-bold text-[#9C9485] uppercase tracking-wider mb-2">
            Departing today
          </p>
          <div className="space-y-1.5">
            {checkOuts.map((b) => {
              const room = allRooms.find((r) => r.id === b.room_id);
              return (
                <div key={b.id} className="flex items-center justify-between text-[13px]">
                  <span className="font-medium text-[#16130C]">{b.guest_name}</span>
                  <span className="text-[#9C9485]">{room?.name ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3 — Linked listing card */}
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
                    const typeSlug = linkedListing.type === "experience" ? "experiences" : linkedListing.type + "s";
                    const citySlug = (linkedListing.city ?? "").toLowerCase().replace(/\s+/g, "-");
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
      <div className="mb-6">
        <RoomManagementSection
          initialRooms={allRooms}
          propertyId={property.id}
          propertyName={property.name}
        />
      </div>

      {/* SECTION 5 — Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-8">
        {[
          {
            label: "Open Calendar",
            description: "Block dates, view bookings",
            href: "/dashboard/property/calendar",
            icon: (
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            ),
          },
          {
            label: "Manage bookings",
            description: "View all reservations",
            href: `/dashboard/property/${property.id}/bookings`,
            icon: (
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            ),
          },
          {
            label: "Settings",
            description: "Edit property details",
            href: `/dashboard/property/${property.id}/settings`,
            icon: (
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            ),
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 bg-white rounded-xl border border-[#E2DDD5] p-3.5 shadow-sm hover:shadow-md hover:border-[#4F46E5]/30 transition-all"
          >
            <span className="size-8 rounded-lg bg-[#F4F1EC] flex items-center justify-center text-[#5E5848] shrink-0">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#16130C]">{item.label}</p>
              <p className="text-[11px] text-[#9C9485] truncate">{item.description}</p>
            </div>
            <span className="text-[11px] text-[#4F46E5] ml-auto shrink-0">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
