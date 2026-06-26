import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { AttendeeActions } from "./AttendeeActions";
import { getAuthUser, getHostProfile } from "../../../_lib/auth";

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  joined_at: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function AttendeesPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  // Return the host to wherever they opened this page from: the dashboard
  // home's "My Events" section (?from=dashboard) or the dedicated Events page.
  const backHref = from === "dashboard" ? "/dashboard" : "/dashboard/events";

  const { user, supabase } = await getAuthUser();
  if (!user) redirect("/login");

  // Parallel: fetch events_pending + host profile together
  const [{ data: pendingEvent }, hostProfile] = await Promise.all([
    supabase
      .from("events_pending")
      .select("id, title, sanity_event_id, host_id")
      .eq("id", id)
      .eq("host_id", user.id)
      .single(),
    getHostProfile(user.id),
  ]);

  let eventTitle = "";
  let sanityEventId = "";

  if (pendingEvent) {
    eventTitle = pendingEvent.title;
    sanityEventId = pendingEvent.sanity_event_id ?? "";
  } else {
    // Fallback: id might be a Sanity event ID (hostProfile already loaded in parallel)
    const sanityEvent = await sanityClient.fetch<{ _id: string; title: string } | null>(
      `*[_type == "listing" && _id == $id && (hostId == $userId || host._ref == $sanityHostId)][0]{ _id, title }`,
      { id, userId: user.id, sanityHostId: hostProfile?.sanity_host_id ?? "" }
    );

    if (!sanityEvent) notFound();
    eventTitle = sanityEvent.title;
    sanityEventId = sanityEvent._id;
  }

  if (!sanityEventId) notFound();

  // Fetch attendees
  const { data: attendees } = await adminClient
    .from("event_attendees")
    .select("*")
    .eq("event_sanity_id", sanityEventId)
    .order("joined_at", { ascending: false });

  const rows = (attendees ?? []) as Attendee[];
  const confirmed = rows.filter((r) => r.status === "confirmed");

  return (
    <div>
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text2 hover:text-text transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Back to My Events
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-[clamp(20px,3vw,28px)] font-bold text-text tracking-[-0.03em]">
            Attendees
          </h1>
          <p className="text-text2 text-[14px] mt-1">
            {eventTitle} · {confirmed.length} confirmed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {confirmed.length > 0 && (
            <ExportCSVButton attendees={confirmed} eventTitle={eventTitle} />
          )}
        </div>
      </div>

      {/* Attendee list with actions */}
      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border bg-white p-12 text-center mt-6">
          <Users className="size-10 text-text3 mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-text mb-1">
            No attendees yet
          </p>
          <p className="text-[13px] text-text2 max-w-[320px] mx-auto">
            Share your event to start getting people to join.
          </p>
        </div>
      ) : (
        <AttendeeActions
          attendees={rows}
          eventTitle={eventTitle}
          eventSanityId={sanityEventId}
        />
      )}
    </div>
  );
}
