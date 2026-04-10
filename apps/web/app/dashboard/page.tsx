import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getAuthUser, getUserProfile, getHostProfile } from "./_lib/auth";
import { getMenusForOwner } from "@/lib/cache/menu";

export default async function DashboardPage() {
  const { user, supabase } = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  // Cached — already fetched in layout, returns instantly
  const [profile, hostProfile] = await Promise.all([
    getUserProfile(user.id),
    getHostProfile(user.id),
  ]);

  // Fetch listings from Sanity
  let listings: {
    _id: string;
    title: string;
    slug: string;
    type: string;
    subcategory: string | null;
    city: string | null;
    imageUrl: string | null;
    isVerified: boolean;
  }[] = [];

  let hostSlug: string | null = null;
  let enquiryCountMap = new Map<string, number>();
  let totalEnquiries = 0;

  // Fetch events from Sanity
  let events: {
    _id: string;
    title: string;
    slug: string;
    city: string | null;
    eventDate: string | null;
    imageUrl: string | null;
    status: string;
    attendees: number;
  }[] = [];

  if (hostProfile) {
    // Parallel: host slug + all listings/events + pending events
    const [hostSlugResult, rawResult, pendingResult] = await Promise.allSettled([
      hostProfile.sanity_host_id
        ? sanityClient.fetch<{ slug: string } | null>(
            `*[_type == "host" && _id == $id][0]{ "slug": slug.current }`,
            { id: hostProfile.sanity_host_id }
          )
        : Promise.resolve(null),
      sanityClient.fetch<
        { _id: string; title: string; slug: string; type: string; subcategory: string | null; listingType: string | null; city: string | null; eventDate: string | null; coverPhoto: { asset?: { url?: string } } | null; isVerified: boolean; status: string }[]
      >(
        `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)] | order(_createdAt desc) {
          _id,
          title,
          "slug": slug.current,
          type,
          subcategory,
          listingType,
          city,
          eventDate,
          "coverPhoto": photos[0]{ asset->{ _id, url } },
          isVerified,
          status
        }`,
        { hostId: hostProfile.user_id, sanityHostId: hostProfile.sanity_host_id ?? "" }
      ),
      supabase.from("events_pending").select("*").eq("host_id", user.id),
    ]);

    if (hostSlugResult.status === "fulfilled" && hostSlugResult.value) {
      hostSlug = hostSlugResult.value.slug ?? null;
    }

    if (rawResult.status === "fulfilled") {
      for (const l of rawResult.value) {
        const imageUrl = l.coverPhoto?.asset?.url
          ? `${l.coverPhoto.asset.url}?w=400&auto=format`
          : null;

        if (l.listingType === "event" || l.type === "event") {
          events.push({
            _id: l._id,
            title: l.title,
            slug: l.slug,
            city: l.city,
            eventDate: l.eventDate,
            imageUrl,
            status: l.status,
            attendees: 0,
          });
        } else {
          listings.push({
            _id: l._id,
            title: l.title,
            slug: l.slug,
            type: l.type,
            subcategory: l.subcategory ?? null,
            city: l.city,
            imageUrl,
            isVerified: l.isVerified,
          });
        }
      }
    }

    const pendingEvents = pendingResult.status === "fulfilled" ? pendingResult.value.data : null;

    const eventSanityIds = new Set(events.map((e) => e._id));
    for (const pe of pendingEvents ?? []) {
      if (pe.sanity_event_id && !eventSanityIds.has(pe.sanity_event_id)) {
        events.push({
          _id: pe.sanity_event_id,
          title: pe.title,
          slug: "",
          city: pe.city,
          eventDate: null,
          imageUrl: null,
          status: pe.status === "approved" ? "published" : pe.status,
          attendees: 0,
        });
      }
    }

    // Parallel: fetch attendee counts + enquiry counts together
    const eventIds = events.map((e) => e._id);
    const listingIds = listings.map((l) => l._id);

    const [attendeeResult, enquiryResult] = await Promise.allSettled([
      eventIds.length > 0
        ? adminClient.from("event_attendees").select("event_sanity_id").in("event_sanity_id", eventIds).eq("status", "confirmed")
        : Promise.resolve({ data: null }),
      listingIds.length > 0
        ? adminClient.from("contact_requests").select("listing_sanity_id").in("listing_sanity_id", listingIds)
        : Promise.resolve({ data: null }),
    ]);

    if (attendeeResult.status === "fulfilled" && attendeeResult.value.data) {
      const countMap = new Map<string, number>();
      for (const row of attendeeResult.value.data) {
        countMap.set(row.event_sanity_id, (countMap.get(row.event_sanity_id) ?? 0) + 1);
      }
      for (const ev of events) {
        ev.attendees = countMap.get(ev._id) ?? 0;
      }
    }

    if (enquiryResult.status === "fulfilled" && enquiryResult.value.data) {
      for (const row of enquiryResult.value.data) {
        const id = row.listing_sanity_id;
        if (id) enquiryCountMap.set(id, (enquiryCountMap.get(id) ?? 0) + 1);
      }
      totalEnquiries = enquiryResult.value.data.length;
    }
  }

  // Check for properties needing setup (stay owners with no rooms)
  let propertyNeedsSetup: { id: string; name: string } | null = null;
  // Property status map for stay listing cards
  const propertyStatusMap = new Map<string, { id: string; is_active: boolean; room_count: number }>();
  {
    const { data: props } = await adminClient
      .from("properties")
      .select("id, name, listing_slug, is_active")
      .eq("owner_id", user.id)
      .limit(50);
    if (props && props.length > 0) {
      for (const p of props) {
        const { count } = await adminClient
          .from("rooms")
          .select("id", { count: "exact", head: true })
          .eq("property_id", p.id);
        const roomCount = count ?? 0;
        if (roomCount === 0 && !propertyNeedsSetup) {
          propertyNeedsSetup = { id: p.id, name: p.name };
        }
        if (p.listing_slug) {
          propertyStatusMap.set(p.listing_slug, {
            id: p.id,
            is_active: p.is_active,
            room_count: roomCount,
          });
        }
      }
    }
  }

  // Check for unpublished restaurant menus
  const isRestaurant = (l: { type: string; subcategory: string | null }) =>
    l.type === "restaurant" || (l.type === "experience" && l.subcategory === "restaurants");
  const restaurantListings = listings.filter(isRestaurant);
  const restaurantSlugs = restaurantListings.map((l) => l.slug);
  let unpublishedMenuSlug: string | null = null;

  if (restaurantSlugs.length > 0) {
    const allMenus = await getMenusForOwner(user.id);
    const ownerMenusBySlug = allMenus.filter((m) => restaurantSlugs.includes(m.slug));
    const unpub = ownerMenusBySlug.find((m) => !m.is_published);
    if (unpub) {
      unpublishedMenuSlug = unpub.slug;
    } else {
      // Check if any restaurant has no menu row at all
      const existingSlugs = new Set(ownerMenusBySlug.map((m) => m.slug));
      const missingSlug = restaurantSlugs.find((s) => !existingSlugs.has(s));
      if (missingSlug) unpublishedMenuSlug = missingSlug;
    }
  }

  const firstName = (hostProfile?.display_name ?? profile?.full_name ?? "Host").split(/\s+/)[0];
  const verifiedCount = listings.filter((l) => l.isVerified).length;
  const totalAttendees = events.reduce((sum, e) => sum + e.attendees, 0);

  // Time-based greeting
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            {greeting}, {firstName}
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            Here&apos;s an overview of your dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hostSlug && (
            <Link
              href={`/hosts/${hostSlug}`}
              className="text-[13px] font-medium text-[#9C9485] hover:text-[#16130C] transition-colors hidden sm:flex items-center"
            >
              View profile
            </Link>
          )}
          <Link
            href="/dashboard/profile/edit"
            className="text-[13px] font-semibold text-[#6B2D8B] bg-[#6B2D8B]/8 px-4 h-[40px] flex items-center rounded-xl hover:bg-[#6B2D8B]/15 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 lg:gap-3 mb-5">
        {[
          { label: "Events", value: events.length, color: "text-[#E8A020]" },
          { label: "Attendees", value: totalAttendees, color: "text-[#6B2D8B]" },
          { label: "Listings", value: listings.length, color: "text-[#16130C]" },
          { label: "Enquiries", value: totalEnquiries, color: "text-[#0D7377]" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] py-3 px-2 lg:p-4 text-center shadow-sm"
          >
            <p className={`font-display text-[20px] lg:text-[24px] font-bold tracking-[-0.02em] leading-none ${stat.color}`}>
              {stat.value}
            </p>
            <p className="text-[10px] lg:text-[11px] text-[#9C9485] font-medium mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Menu banner for restaurant owners */}
      {unpublishedMenuSlug && (
        <div className="mb-5 rounded-xl lg:rounded-2xl border border-[#E8A020]/20 bg-[#E8A020]/[0.06] p-4 shadow-sm" style={{ borderLeft: "4px solid #E8A020" }}>
          <div className="flex items-center gap-3">
            <span className="text-[24px] shrink-0">🍽️</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#16130C]">
                Your digital menu isn&apos;t live yet
              </p>
              <p className="text-[12.5px] text-[#5E5848] mt-0.5">
                Add your menu and print a QR code for your tables.
              </p>
            </div>
            <Link
              href="/dashboard/menus"
              className="shrink-0 bg-[#E8A020] text-[#16130C] font-bold text-[12px] px-4 h-[36px] flex items-center rounded-full hover:bg-[#d4911c] transition-colors whitespace-nowrap"
            >
              Set up your digital menu →
            </Link>
          </div>
        </div>
      )}

      {/* Property setup banner for stay owners */}
      {propertyNeedsSetup && (
        <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#6366F1] p-5 lg:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-[28px]">🏠</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-white">
                Your property calendar is ready to set up
              </p>
              <p className="text-[13px] text-white/70 mt-1">
                Add your rooms and start accepting direct bookings from your Klickenya listing — no OTA fees.
              </p>
            </div>
            <Link
              href={`/dashboard/property/${propertyNeedsSetup.id}`}
              className="shrink-0 bg-white text-[#4F46E5] font-bold text-[13px] px-6 h-[44px] flex items-center rounded-full hover:bg-white/90 transition-colors whitespace-nowrap shadow-sm"
            >
              Set up now →
            </Link>
          </div>
        </div>
      )}

      {/* Events Section — shown first */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em]">
            My Events
          </h2>
          <Link
            href="/dashboard/events/new"
            className="text-[13px] font-semibold text-[#E8A020] hover:text-[#d4911c] transition-colors"
          >
            Create event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-[28px]">🎟️</span>
            </div>
            <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
              No events yet
            </p>
            <p className="text-[13px] text-[#9C9485] mb-4 max-w-[280px] mx-auto">
              Create your first event and start getting attendees
            </p>
            <Link
              href="/dashboard/events/new"
              className="inline-block bg-[#E8A020] text-white font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
            >
              Create event
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const isLive = event.status === "published" || event.status === "approved";
              const eventDate = event.eventDate
                ? new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : null;

              return (
                <Link
                  key={event._id}
                  href={`/dashboard/events/${event._id}/attendees`}
                  className="block bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-3 lg:p-4 shadow-sm hover:shadow-md hover:border-[#E8A020]/30 transition-all"
                >
                  <div className="flex gap-3 items-center">
                    {/* Photo */}
                    <div className="shrink-0 w-[56px] h-[56px] lg:w-[80px] lg:h-[64px] rounded-lg lg:rounded-xl overflow-hidden bg-[#F4F1EC] relative">
                      {event.imageUrl ? (
                        <Image
                          src={event.imageUrl}
                          alt={event.title}
                          fill
                          sizes="(max-width: 1024px) 56px, 80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[24px] bg-gradient-to-br from-[#E8A020]/10 to-[#E8A020]/5">
                          🎟️
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] lg:text-[15px] font-semibold text-[#16130C] truncate leading-tight">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {eventDate && <span className="text-[11px] text-[#9C9485]">{eventDate}</span>}
                        {eventDate && event.city && <span className="text-[#E2DDD5]">·</span>}
                        {event.city && <span className="text-[11px] text-[#9C9485]">{event.city}</span>}
                      </div>
                      <div className="mt-1.5">
                        {isLive ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            Live
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            {event.status === "pending" ? "Pending" : event.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Attendee count */}
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6B2D8B]/8 text-[#6B2D8B] text-[12px] font-semibold">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                        {event.attendees}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Listings Section — shown second */}
      <div className="mb-5">
        <h2 className="font-display text-[17px] lg:text-[20px] font-bold text-[#16130C] tracking-[-0.02em] mb-3">
          My Listings
        </h2>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E2DDD5] p-8 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-[28px]">🏡</span>
            </div>
            <p className="font-display text-[16px] font-bold text-[#16130C] mb-1">
              No listings yet
            </p>
            <p className="text-[13px] text-[#9C9485] mb-4 max-w-[280px] mx-auto">
              Claim your first listing on Klickenya and start managing it from here
            </p>
            <Link
              href="/"
              className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] px-6 h-[40px] leading-[40px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
            >
              Claim a listing
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
              const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
              const href = `/${typeSlug}/${citySlug}/${listing.slug}`;
              const listingEnquiries = enquiryCountMap.get(listing._id) ?? 0;
              const isStay = listing.type === "stay";
              const isRestaurantListing = listing.type === "restaurant" || listing.subcategory === "restaurants";
              const propStatus = isStay ? propertyStatusMap.get(listing.slug) : undefined;

              return (
                <div
                  key={listing._id}
                  className="bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-3 lg:p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-3">
                    {/* Photo */}
                    <div className="shrink-0 w-[56px] h-[56px] lg:w-[80px] lg:h-[64px] rounded-lg lg:rounded-xl overflow-hidden bg-[#F4F1EC] relative">
                      {listing.imageUrl ? (
                        <Image
                          src={listing.imageUrl}
                          alt={listing.title}
                          fill
                          sizes="(max-width: 1024px) 56px, 80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[24px] bg-gradient-to-br from-[#F4F1EC] to-[#E2DDD5]">
                          🏠
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] lg:text-[15px] font-semibold text-[#16130C] truncate leading-tight">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-[#9C9485] capitalize">{listing.type}</span>
                        {listing.city && (
                          <>
                            <span className="text-[#E2DDD5]">·</span>
                            <span className="text-[11px] text-[#9C9485]">{listing.city}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {listing.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/8 px-2 py-0.5 rounded-full">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#E8A020] bg-[#E8A020]/8 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                        {listingEnquiries > 0 && (
                          <Link href={`/dashboard/enquiries?listing=${listing._id}`} className="text-[11px] text-[#6B2D8B] font-medium hover:underline">
                            {listingEnquiries} enquir{listingEnquiries === 1 ? "y" : "ies"}
                          </Link>
                        )}
                        {isStay && propStatus && propStatus.is_active && propStatus.room_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#16A34A] bg-[#16A34A]/8 px-2 py-0.5 rounded-full">
                            Calendar active
                          </span>
                        )}
                        {isStay && propStatus && (!propStatus.is_active || propStatus.room_count === 0) && (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            Setup needed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View / PMS actions */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <Link
                        href={href}
                        className="text-[12px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
                      >
                        View
                      </Link>
                      {isRestaurantListing && (
                        <Link
                          href={`/dashboard/listings/${listing._id}`}
                          className="text-[11px] font-semibold text-[#E8A020] hover:text-[#d4911c] transition-colors"
                        >
                          Open dashboard →
                        </Link>
                      )}
                      {isStay && propStatus?.is_active && propStatus.room_count > 0 && (
                        <Link
                          href={`/dashboard/property/${propStatus.id}`}
                          className="text-[11px] font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
                        >
                          Manage bookings →
                        </Link>
                      )}
                      {isStay && propStatus && (!propStatus.is_active || propStatus.room_count === 0) && (
                        <Link
                          href={`/dashboard/property/new?edit=${propStatus.id}`}
                          className="text-[11px] font-semibold text-[#E8A020] hover:text-[#d4911c] transition-colors"
                        >
                          Complete setup →
                        </Link>
                      )}
                      {isStay && !propStatus && (
                        <Link
                          href={`/dashboard/property/new?listing_slug=${listing.slug}`}
                          className="text-[11px] font-semibold text-[#9C9485] hover:text-[#16130C] transition-colors"
                        >
                          Set up calendar →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim more CTA */}
      <div className="bg-gradient-to-br from-[#16130C] to-[#2A2520] rounded-xl lg:rounded-2xl p-5 lg:p-8 text-center shadow-sm">
        <p className="font-display text-[16px] lg:text-[20px] font-bold text-white tracking-[-0.02em] mb-1.5">
          Have more listings on Klickenya?
        </p>
        <p className="text-[13px] text-white/50 mb-4 max-w-[300px] mx-auto">
          Claim and verify them to get the green badge and manage enquiries.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#E8A020] text-[#16130C] font-bold text-[13px] lg:text-[14px] px-6 h-[44px] leading-[44px] rounded-full hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Claim another listing
        </Link>
      </div>
    </div>
  );
}
