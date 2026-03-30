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

  // Fetch event RSVPs
  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
      rsvps={(rsvps ?? []) as { id: string; event_title: string; event_date: string | null; event_city: string | null; event_slug: string | null; sanity_event_id: string; status: string; created_at: string }[]}
      enquiries={(enquiries ?? []) as { id: string; listing_title: string | null; listing_type: string | null; message: string | null; created_at: string }[]}
    />
  );
}
