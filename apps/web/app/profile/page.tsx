import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?returnTo=/profile");

  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name, email, role, avatar_url")
    .eq("id", user.id)
    .single();

  // Hosts go to dashboard
  if (userProfile?.role === "host") redirect("/dashboard");
  if (userProfile?.role === "admin") redirect("/admin");

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
      display_name: userProfile?.full_name ?? user.email?.split("@")[0] ?? "Guest",
      avatar_url: userProfile?.avatar_url ?? null,
      email: userProfile?.email ?? user.email,
    });
    guestProfile = {
      display_name: userProfile?.full_name ?? "Guest",
      avatar_url: userProfile?.avatar_url ?? null,
      email: userProfile?.email ?? user.email,
      location: null,
    };
  }

  // Fetch saved listings count
  const { count: savedCount } = await supabase
    .from("saved_listings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

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

  // Fetch enquiries
  const { data: enquiries } = await adminClient
    .from("contact_requests")
    .select("id, listing_title, listing_type, message, created_at")
    .eq("guest_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <ProfileClient
      userId={user.id}
      displayName={guestProfile.display_name ?? "Guest"}
      email={guestProfile.email ?? user.email ?? ""}
      avatarUrl={guestProfile.avatar_url ?? userProfile?.avatar_url ?? null}
      location={guestProfile.location ?? null}
      savedCount={savedCount ?? 0}
      rsvps={rsvps}
      enquiries={(enquiries ?? []) as { id: string; listing_title: string | null; listing_type: string | null; message: string | null; created_at: string }[]}
    />
  );
}
