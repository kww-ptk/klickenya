// apps/web/lib/listings/events.ts
import { adminClient } from "@/lib/supabase/admin";

/** Keep the events_pending mirror row in sync with a Sanity event. No-op for non-events.
 *
 *  Best-effort: the primary Sanity write has already committed by the time this runs,
 *  so a Supabase hiccup must NOT fail the request. Errors are logged and swallowed;
 *  the mirror is a secondary index for the pending-review workflow, not the source of truth. */
export async function syncEventPending(
  sanityId: string,
  type: string,
  action: "update" | "archive" | "delete",
  fields?: { title?: string; city?: string },
) {
  if (type !== "event") return;
  try {
    if (action === "delete" || action === "archive") {
      await adminClient.from("events_pending").delete().eq("sanity_event_id", sanityId);
      return;
    }
    if (action === "update" && fields) {
      await adminClient
        .from("events_pending")
        .update({ title: fields.title, city: fields.city })
        .eq("sanity_event_id", sanityId);
    }
  } catch (err) {
    console.error("syncEventPending failed (Sanity write already committed):", sanityId, action, err);
  }
}
