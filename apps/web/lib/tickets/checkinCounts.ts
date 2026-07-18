import { adminClient } from "@/lib/supabase/admin";

/** Live check-in totals for an event: issued (non-cancelled) tickets and how
 *  many are checked in. Seeds the scanner's analytics counter on load. */
export async function getCheckinCounts(
  eventSanityId: string,
): Promise<{ total: number; checkedIn: number }> {
  const [totalRes, checkedRes] = await Promise.all([
    adminClient
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_sanity_id", eventSanityId)
      .neq("status", "cancelled"),
    adminClient
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("event_sanity_id", eventSanityId)
      .eq("status", "checked_in"),
  ]);
  return { total: totalRes.count ?? 0, checkedIn: checkedRes.count ?? 0 };
}
