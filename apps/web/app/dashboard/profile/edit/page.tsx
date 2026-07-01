import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { EditProfileForm } from "./EditProfileForm";
import { AccountSettings } from "./AccountSettings";

interface SanityHost {
  _id: string;
  name: string;
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  photo?: { asset?: { url?: string } };
}

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: hostProfile }] = await Promise.all([
    supabase.from("users").select("email, role").eq("id", user.id).single(),
    supabase
      .from("host_profiles")
      .select("sanity_host_id, display_name, phone, password_changed")
      .eq("user_id", user.id)
      .single(),
  ]);

  // Not a host at all — nothing to edit here.
  if (!hostProfile) {
    redirect("/dashboard");
  }

  // The public-profile form needs a Sanity host doc; fetch it only if present.
  let host: SanityHost | null = null;
  if (hostProfile.sanity_host_id) {
    host = await sanityClient.fetch(
      `*[_type == "host" && _id == $id][0]{
        _id,
        name,
        bio,
        website,
        instagram,
        facebook,
        photo{ asset->{ url } }
      }`,
      { id: hostProfile.sanity_host_id }
    );
  }

  return (
    <div>
      {host ? (
        <EditProfileForm
          sanityHostId={host._id}
          currentName={host.name ?? hostProfile.display_name ?? ""}
          currentBio={host.bio ?? ""}
          currentWebsite={host.website ?? ""}
          currentInstagram={host.instagram ?? ""}
          currentFacebook={host.facebook ?? ""}
          currentPhone={hostProfile.phone ?? ""}
          currentPhotoUrl={host.photo?.asset?.url ?? null}
        />
      ) : (
        <div className="max-w-[600px]">
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark mb-2">
            Edit Profile
          </h1>
          <p className="text-[13px] text-text3">
            Your public profile becomes editable once a listing is assigned to you.
          </p>
        </div>
      )}

      <AccountSettings
        email={profile?.email ?? user.email ?? ""}
        role={profile?.role ?? "guest"}
        passwordChanged={hostProfile.password_changed !== false}
        userId={user.id}
      />
    </div>
  );
}
