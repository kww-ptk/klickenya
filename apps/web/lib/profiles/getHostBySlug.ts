import { sanityClient } from "@/lib/sanity/client";
import type { HostProfile } from "@klickenya/shared";

const IMAGE_FIELDS = `asset->{ _id, url, metadata{ dimensions } }, alt, hotspot, crop`;

const HOST_PROFILE_QUERY = `
  *[_type == "host" && slug.current == $slug][0]{
    _id,
    name,
    slug,
    "photo": photo{ ${IMAGE_FIELDS} },
    bio,
    email,
    phone,
    website,
    instagram,
    facebook,
    planTier,
    supabaseUserId,
    verified,
    createdAt,
    "listings": listings[]->{
      _id,
      title,
      "slug": slug.current,
      type,
      city,
      isVerified,
      verificationStatus,
      "coverPhotoUrl": photos[0].asset->url
    }
  }
`;

export async function getHostBySlug(slug: string): Promise<HostProfile | null> {
  const host = await sanityClient.fetch(HOST_PROFILE_QUERY, { slug });
  return host ?? null;
}
