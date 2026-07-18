import type { SupabaseClient } from "@supabase/supabase-js";
import { sanityClient } from "@/lib/sanity/client";

/** Resolve a dashboard event [id] (which may be an events_pending.id OR a Sanity
 *  listing _id) to the real Sanity _id + title, verifying the user owns it.
 *  Returns null if not found or not owned. Mirrors the check in the attendees page. */
export async function resolveOwnedEvent(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<{ sanityEventId: string; eventTitle: string } | null> {
  const { data: hostProfile } = await supabase
    .from("host_profiles").select("sanity_host_id").eq("user_id", userId).maybeSingle();

  const { data: pending } = await supabase
    .from("events_pending").select("title, sanity_event_id").eq("id", id).eq("host_id", userId).maybeSingle();
  if (pending?.sanity_event_id) {
    return { sanityEventId: pending.sanity_event_id, eventTitle: pending.title ?? "Event" };
  }

  const sanityEvent = await sanityClient.fetch<{ _id: string; title: string } | null>(
    `*[_type == "listing" && _id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{ _id, title }`,
    { id, userId, sanityHostId: hostProfile?.sanity_host_id ?? "" },
  );
  if (!sanityEvent) return null;
  return { sanityEventId: sanityEvent._id, eventTitle: sanityEvent.title ?? "Event" };
}
