import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveOwnedEvent } from "@/lib/events/ownedEvent";
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

  const owned = await resolveOwnedEvent(supabase, user.id, id);
  if (!owned) notFound();
  const { sanityEventId: eventSanityId, eventTitle } = owned;

  return <ScannerClient eventSanityId={eventSanityId} eventTitle={eventTitle} />;
}
