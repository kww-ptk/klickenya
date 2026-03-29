import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { EditProfileForm } from "./EditProfileForm";

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

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("sanity_host_id, display_name, phone")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile?.sanity_host_id) {
    redirect("/dashboard");
  }

  const host: SanityHost | null = await sanityClient.fetch(
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

  if (!host) redirect("/dashboard");

  return (
    <div>
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
    </div>
  );
}
