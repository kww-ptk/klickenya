import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const initialTab = sp.tab ?? "profile";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?returnTo=/profile");

  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name, email, role, avatar_url")
    .eq("id", user.id)
    .single();

  // Admins go to admin dashboard
  if (userProfile?.role === "admin") redirect("/admin");

  // For hosts: fetch photo from Sanity + host display name as fallbacks
  let hostPhotoUrl: string | null = null;
  let hostDisplayName: string | null = null;
  if (userProfile?.role === "host") {
    const { data: hostProfile } = await adminClient
      .from("host_profiles")
      .select("display_name, sanity_host_id")
      .eq("user_id", user.id)
      .single();
    hostDisplayName = hostProfile?.display_name ?? null;
    if (hostProfile?.sanity_host_id) {
      const { sanityClient } = await import("@/lib/sanity/client");
      const host = await sanityClient.fetch<{ photo?: { asset?: { url?: string } } } | null>(
        `*[_type == "host" && _id == $id][0]{ photo{ asset->{ url } } }`,
        { id: hostProfile.sanity_host_id }
      );
      hostPhotoUrl = host?.photo?.asset?.url ?? null;
    }
  }

  // Fetch or create guest profile
  let guestProfile = await adminClient
    .from("guest_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
    .then((r) => r.data);

  if (!guestProfile) {
    await adminClient.from("guest_profiles").insert({
      user_id: user.id,
      display_name: hostDisplayName ?? userProfile?.full_name ?? user.email?.split("@")[0] ?? "Guest",
      avatar_url: hostPhotoUrl ?? userProfile?.avatar_url ?? null,
      email: userProfile?.email ?? user.email,
    });
    guestProfile = {
      display_name: hostDisplayName ?? userProfile?.full_name ?? "Guest",
      avatar_url: hostPhotoUrl ?? userProfile?.avatar_url ?? null,
      email: userProfile?.email ?? user.email,
      location: null,
    };
  }

  // Fetch saved listings (id + sanity ref + timestamp)
  const { data: savedRows } = await adminClient
    .from("saved_listings")
    .select("id, sanity_listing_id, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  // Fetch events the user has joined (from event_attendees)
  const { data: joinedEvents } = await adminClient
    .from("event_attendees")
    .select("id, event_sanity_id, name, email, status, joined_at")
    .eq("email", userProfile?.email ?? user.email ?? "")
    .eq("status", "confirmed")
    .order("joined_at", { ascending: false });

  // Also check by user_id
  const { data: joinedByUserId } = await adminClient
    .from("event_attendees")
    .select("id, event_sanity_id, name, email, status, joined_at")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .order("joined_at", { ascending: false });

  // Merge and deduplicate
  const allJoined = [...(joinedEvents ?? []), ...(joinedByUserId ?? [])];
  const seenIds = new Set<string>();
  const uniqueJoined = allJoined.filter((j) => {
    if (seenIds.has(j.id)) return false;
    seenIds.add(j.id);
    return true;
  });

  // Fetch event details from Sanity for display
  const eventSanityIds = [...new Set(uniqueJoined.map((j) => j.event_sanity_id))];
  let eventDetailsMap = new Map<string, { title: string; eventDate: string | null; city: string | null; slug: string | null }>();
  if (eventSanityIds.length > 0) {
    const { sanityClient } = await import("@/lib/sanity/client");
    const details = await sanityClient.fetch<{ _id: string; title: string; eventDate: string | null; city: string | null; slug: string }[]>(
      `*[_type == "listing" && _id in $ids]{ _id, title, eventDate, city, "slug": slug.current }`,
      { ids: eventSanityIds }
    );
    eventDetailsMap = new Map(details.map((d) => [d._id, { title: d.title, eventDate: d.eventDate, city: d.city, slug: d.slug }]));
  }

  const rsvps = uniqueJoined.map((j) => {
    const detail = eventDetailsMap.get(j.event_sanity_id);
    return {
      id: j.id,
      event_title: detail?.title ?? "Event",
      event_date: detail?.eventDate ?? null,
      event_city: detail?.city ?? null,
      event_slug: detail?.slug ?? null,
      sanity_event_id: j.event_sanity_id,
      status: "going" as const,
      created_at: j.joined_at,
    };
  });

  // Fetch enquiries (richer: include PMS fields)
  const { data: enquiries } = await adminClient
    .from("contact_requests")
    .select("id, listing_title, listing_type, listing_sanity_id, message, check_in, check_out, guests, calendar_status, created_at")
    .eq("guest_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch bookings where guest_user_id matches
  const { data: guestBookings } = await adminClient
    .from("bookings")
    .select(`
      id, check_in_date, check_out_date, nights, guest_count,
      status, payment_status, total_kes, amount_paid_kes, balance_kes,
      rate_per_night, subtotal_kes, discount_kes,
      property_id, room_id,
      property:properties(name, address, check_in_time),
      room:rooms(name),
      booking_fees(name, amount_kes)
    `)
    .eq("guest_user_id", user.id)
    .order("check_in_date", { ascending: false });

  return (
    <ProfileClient
      userId={user.id}
      displayName={guestProfile.display_name ?? hostDisplayName ?? "Guest"}
      email={guestProfile.email ?? user.email ?? ""}
      avatarUrl={guestProfile.avatar_url ?? hostPhotoUrl ?? userProfile?.avatar_url ?? null}
      location={guestProfile.location ?? null}
      savedListings={(savedRows ?? []) as { id: string; sanity_listing_id: string; saved_at: string }[]}
      rsvps={rsvps}
      enquiries={(enquiries ?? []) as { id: string; listing_title: string | null; listing_type: string | null; listing_sanity_id: string | null; message: string | null; check_in: string | null; check_out: string | null; guests: number | null; calendar_status: string | null; created_at: string }[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bookings={(guestBookings ?? []) as any[]}
      initialTab={initialTab}
      isHost={userProfile?.role === "host"}
    />
  );
}
