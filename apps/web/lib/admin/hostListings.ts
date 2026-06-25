import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { sanityPreviewClient } from "@/lib/sanity/client";

/** Minimal host shape needed to locate a host's Sanity listings. */
export interface HostRef {
  user_id: string;
  sanity_host_id: string | null;
}

// Three ways a listing links to a host (mirrors the admin host detail page query):
//   1. hostId == user_id              2. host._ref == sanity_host_id
//   3. _id appears in the host doc's listings[] array
const ASSIGNED_QUERY = `*[_type == "listing" && (
  hostId == $hostId
  || host._ref == $sanityHostId
  || (_id in *[_type == "host" && _id == $sanityHostId][0].listings[]._ref)
)]{ _id, title }`;

export async function getAssignedListings(
  host: HostRef
): Promise<{ _id: string; title: string }[]> {
  return sanityPreviewClient.fetch(ASSIGNED_QUERY, {
    hostId: host.user_id,
    sanityHostId: host.sanity_host_id ?? "",
  });
}

/**
 * Detach a single listing from a host: clear host fields, reset notificationEmail1
 * to the admin address, mark unverified, drop the host reference, and remove the
 * listing from the host doc's listings[] array. (No emails — callers handle those.)
 */
export async function unassignListingFromHost(
  host: HostRef,
  sanityId: string
): Promise<void> {
  await sanityWriteClient
    .patch(sanityId)
    .set({
      hostId: "",
      hostName: "",
      notificationEmail1: process.env.ADMIN_EMAIL ?? "",
      isVerified: false,
      verificationStatus: "pending",
    })
    .commit();

  await sanityWriteClient.patch(sanityId).unset(["host"]).commit();

  if (host.sanity_host_id) {
    await sanityWriteClient
      .patch(host.sanity_host_id)
      .unset([`listings[_ref=="${sanityId}"]`])
      .commit()
      .catch((err: unknown) =>
        console.error("Remove listing from host error:", err)
      );
  }
}

/** Point notificationEmail1 on every assigned listing at a new email (best-effort per listing). */
export async function setNotificationEmailForAssignedListings(
  host: HostRef,
  email: string
): Promise<void> {
  const listings = await getAssignedListings(host);
  for (const l of listings) {
    await sanityWriteClient
      .patch(l._id)
      .set({ notificationEmail1: email })
      .commit()
      .catch((err: unknown) =>
        console.error(`Set notificationEmail1 on ${l._id} failed:`, err)
      );
  }
}
