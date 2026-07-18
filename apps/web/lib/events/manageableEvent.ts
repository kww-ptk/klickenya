import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { resolveOwnedEvent } from "./ownedEvent";

/** Resolve an event [id] the current user may MANAGE: the host who owns it,
 *  or any admin. [id] may be an events_pending.id OR a Sanity _id.
 *  Returns { sanityEventId, eventTitle, isAdmin } or null. */
export async function resolveManageableEvent(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<{ sanityEventId: string; eventTitle: string; isAdmin: boolean } | null> {
  const owned = await resolveOwnedEvent(supabase, userId, id);
  if (owned) return { ...owned, isAdmin: false };

  const { data: profile } = await adminClient
    .from("users").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") return null;

  const { data: pending } = await adminClient
    .from("events_pending").select("title, sanity_event_id").eq("id", id).maybeSingle();
  if (pending?.sanity_event_id) {
    return { sanityEventId: pending.sanity_event_id, eventTitle: pending.title ?? "Event", isAdmin: true };
  }
  const ev = await sanityClient.fetch<{ _id: string; title: string } | null>(
    `*[_type == "listing" && _id == $id && type == "event"][0]{ _id, title }`,
    { id },
  );
  if (!ev) return null;
  return { sanityEventId: ev._id, eventTitle: ev.title ?? "Event", isAdmin: true };
}
