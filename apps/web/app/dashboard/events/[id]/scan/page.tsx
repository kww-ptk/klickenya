import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { resolveManageableEvent } from "@/lib/events/manageableEvent";
import { getCheckinCounts } from "@/lib/tickets/checkinCounts";
import { nextOccurrences } from "@/lib/tickets/occurrences";
import ScannerClient from "./ScannerClient";

export const metadata = { title: "Scan tickets — Klickenya" };

// [id] is polymorphic — same convention as the attendees page: it is EITHER an
// events_pending row id OR a Sanity listing _id. Tickets are keyed by the real
// Sanity _id (event_sanity_id), so we must resolve [id] down to that before
// handing it to the scanner, otherwise validation would key on the wrong id.
export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const manageable = await resolveManageableEvent(supabase, user.id, id);
  if (!manageable) notFound();
  const { sanityEventId: eventSanityId, eventTitle } = manageable;

  const [{ total, checkedIn }, event] = await Promise.all([
    getCheckinCounts(eventSanityId),
    sanityClient.fetch<{
      isRecurring: boolean | null;
      schedule: { day?: string; startTime?: string; endTime?: string }[] | null;
    } | null>(
      `*[_type == "listing" && _id == $id][0]{ isRecurring, schedule[]{day, startTime, endTime} }`,
      { id: eventSanityId },
    ),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const occurrenceDates = event?.isRecurring
    ? nextOccurrences(event.schedule ?? [], today, 8)
    : [];
  const defaultScanDate = occurrenceDates.includes(today)
    ? today
    : (occurrenceDates[0] ?? null);

  return (
    <ScannerClient
      eventSanityId={eventSanityId}
      eventTitle={eventTitle}
      initialCheckedIn={checkedIn}
      totalIssued={total}
      occurrenceDates={occurrenceDates}
      defaultScanDate={defaultScanDate}
    />
  );
}
