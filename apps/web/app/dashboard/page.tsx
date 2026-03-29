import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { DashboardShell } from "./DashboardShell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, email")
    .eq("id", user.id)
    .single();

  // Fetch host profile
  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("id, display_name, plan_tier, total_listings, password_changed, user_id")
    .eq("user_id", user.id)
    .single();

  // Fetch listings from Sanity where hostId matches
  let listings: {
    _id: string;
    title: string;
    slug: string;
    type: string;
    city: string | null;
    coverPhoto: unknown;
    isVerified: boolean;
    verificationStatus: string;
  }[] = [];

  if (hostProfile) {
    try {
      listings = await sanityClient.fetch(
        `*[_type == "listing" && hostId == $hostId] | order(_createdAt desc) {
          _id,
          title,
          "slug": slug.current,
          type,
          city,
          coverPhoto,
          isVerified,
          verificationStatus
        }`,
        { hostId: hostProfile.user_id }
      );
    } catch (err) {
      console.error("Sanity listing fetch error:", err);
    }
  }

  const showPasswordBanner =
    profile?.role === "host" && hostProfile?.password_changed === false;

  return (
    <DashboardShell
      displayName={hostProfile?.display_name ?? profile?.full_name ?? "Host"}
      email={profile?.email ?? user.email ?? ""}
      planTier={hostProfile?.plan_tier ?? "basic"}
      showPasswordBanner={showPasswordBanner}
      listings={listings}
    />
  );
}
