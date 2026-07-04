// apps/web/lib/listings/ownership.ts
import { sanityWriteClient } from "@/lib/sanity/writeClient";

/** True if the host (Supabase user id + their sanity_host_id) owns the listing. */
export async function hostOwnsListing(
  listingId: string,
  userId: string,
  sanityHostId: string | null,
): Promise<{ ok: boolean; type?: string; city?: string; slug?: string }> {
  const doc = await sanityWriteClient.fetch<{ _id: string; type: string; hostId?: string; hostRef?: string; city?: string; slug?: string } | null>(
    `*[_id == $id && _type == "listing"][0]{ _id, type, hostId, "hostRef": host._ref, city, "slug": slug.current }`,
    { id: listingId },
  );
  if (!doc) return { ok: false };
  let owns = doc.hostId === userId || (!!sanityHostId && doc.hostRef === sanityHostId);
  if (!owns && sanityHostId) {
    const inList = await sanityWriteClient.fetch<boolean>(
      `count(*[_type == "host" && _id == $hid && $lid in listings[]._ref]) > 0`,
      { hid: sanityHostId, lid: listingId },
    );
    owns = inList;
  }
  return { ok: owns, type: doc.type, city: doc.city, slug: doc.slug };
}
