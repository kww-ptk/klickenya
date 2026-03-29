import { sanityClient } from "@/lib/sanity/client";
import type { AuthorProfile } from "@klickenya/shared";

const IMAGE_FIELDS = `asset->{ _id, url, metadata{ dimensions } }, alt, hotspot, crop`;

const AUTHOR_PROFILE_QUERY = `
  *[_type == "author" && slug.current == $slug][0]{
    _id,
    name,
    slug,
    "avatar": avatar{ ${IMAGE_FIELDS} },
    "photo": avatar{ ${IMAGE_FIELDS} },
    bio,
    role,
    website,
    instagram,
    facebook,
    twitter,
    "posts": *[_type == "blogPost" && status == "published" && references(^._id)] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      excerpt,
      "coverImageUrl": coverImage.asset->url,
      publishedAt,
      readingTime
    }
  }
`;

export async function getAuthorBySlug(slug: string): Promise<AuthorProfile | null> {
  const author = await sanityClient.fetch(AUTHOR_PROFILE_QUERY, { slug });
  return author ?? null;
}
