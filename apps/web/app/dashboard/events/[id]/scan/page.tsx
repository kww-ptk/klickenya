import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
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

  let eventSanityId = "";
  let eventTitle = "Event";

  // 1. Try events_pending (host-scoped by RLS + explicit host_id filter).
  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("sanity_host_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: pendingEvent } = await supabase
    .from("events_pending")
    .select("title, sanity_event_id")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();

  if (pendingEvent?.sanity_event_id) {
    eventSanityId = pendingEvent.sanity_event_id;
    eventTitle = pendingEvent.title ?? "Event";
  } else {
    // 2. Fallback: id is a Sanity listing _id — scope to this host for ownership.
    const sanityEvent = await sanityClient.fetch<{ _id: string; title: string } | null>(
      `*[_type == "listing" && _id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{ _id, title }`,
      { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" },
    );
    if (!sanityEvent) notFound();
    eventSanityId = sanityEvent._id;
    eventTitle = sanityEvent.title ?? "Event";
  }

  if (!eventSanityId) notFound();

  return <ScannerClient eventSanityId={eventSanityId} eventTitle={eventTitle} />;
}
