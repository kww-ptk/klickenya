// apps/web/lib/listings/events.ts
import { adminClient } from "@/lib/supabase/admin";

/** Keep the events_pending mirror row in sync with a Sanity event. No-op for non-events. */
export async function syncEventPending(
  sanityId: string,
  type: string,
  action: "update" | "archive" | "delete",
  fields?: { title?: string; city?: string },
) {
  if (type !== "event") return;
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
}
