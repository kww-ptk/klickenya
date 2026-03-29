import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

interface EventPending {
  id: string;
  sanity_event_id: string | null;
  title: string;
  city: string | null;
  status: string;
  submitted_at: string;
  is_new_host: boolean;
}

interface SanityEventInfo {
  slug: string;
  eventDate: string | null;
  coverPhotoUrl: string | null;
  city: string | null;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  approved: { label: "Live", bg: "bg-emerald-100", text: "text-emerald-700" },
  pending: { label: "Pending review", bg: "bg-amber-100", text: "text-amber-700" },
  rejected: { label: "Rejected", bg: "bg-red-100", text: "text-red-700" },
};

export default async function MyEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: events } = await supabase
    .from("events_pending")
    .select("*")
    .eq("host_id", user.id)
    .order("submitted_at", { ascending: false });

  const eventRows = (events ?? []) as EventPending[];

  // Fetch Sanity data for events that have IDs
  const sanityIds = eventRows
    .map((e) => e.sanity_event_id)
    .filter((id): id is string => id !== null);

  let sanityMap = new Map<string, SanityEventInfo>();
  if (sanityIds.length > 0) {
    const sanityEvents = await sanityClient.fetch<
      { _id: string; slug: string; eventDate: string | null; coverPhotoUrl: string | null; city: string | null }[]
    >(
      `*[_type == "listing" && _id in $ids]{
        _id,
        "slug": slug.current,
        eventDate,
        city,
        "coverPhotoUrl": photos[0].asset->url
      }`,
      { ids: sanityIds }
    );
    sanityMap = new Map(
      sanityEvents.map((e) => [
        e._id,
        { slug: e.slug, eventDate: e.eventDate, coverPhotoUrl: e.coverPhotoUrl, city: e.city },
      ])
    );
  }

  // Fetch attendee counts per event
  const attendeeCountMap = new Map<string, number>();
  if (sanityIds.length > 0) {
    const { data: attendeeCounts } = await adminClient
      .from("event_attendees")
      .select("event_sanity_id")
      .in("event_sanity_id", sanityIds)
      .eq("status", "confirmed");
    for (const row of attendeeCounts ?? []) {
      attendeeCountMap.set(
        row.event_sanity_id,
        (attendeeCountMap.get(row.event_sanity_id) ?? 0) + 1
      );
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-[clamp(24px,3.5vw,32px)] font-bold text-text tracking-[-0.03em]">
            My Events
          </h1>
          <p className="text-text2 text-[15px] mt-1">
            Events you&apos;ve created on Klickenya
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="px-5 py-2.5 rounded-full bg-[#E8A020] text-white font-semibold text-[14px] hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Create event
        </Link>
      </div>

      {/* Event list */}
      {eventRows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-[#E2DDD5] bg-white p-12 text-center">
          <Calendar className="size-10 text-[#9C9485] mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-text mb-1">
            You haven&apos;t created any events yet
          </p>
          <p className="text-[13px] text-text2 max-w-[360px] mx-auto mb-6">
            Share what&apos;s happening in Kenya — parties, festivals, workshops and more.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex px-6 py-3 rounded-full bg-[#E8A020] text-white font-semibold text-[14px] hover:bg-[#d4911c] transition-colors"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {eventRows.map((event) => {
            const sanity = event.sanity_event_id ? sanityMap.get(event.sanity_event_id) : null;
            const status = STATUS_STYLES[event.status] ?? STATUS_STYLES.pending;
            const citySlug = (sanity?.city ?? event.city ?? "").toLowerCase().replace(/\s+/g, "-");
            const attendees = event.sanity_event_id ? (attendeeCountMap.get(event.sanity_event_id) ?? 0) : 0;
            const eventDate = sanity?.eventDate
              ? new Date(sanity.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : null;

            return (
              <div
                key={event.id}
                className="flex items-center gap-4 rounded-[16px] bg-white border border-[#E2DDD5] p-4 hover:shadow-sm transition-shadow"
              >
                {/* Image */}
                <div className="shrink-0 size-16 md:w-28 md:h-20 rounded-xl overflow-hidden bg-surface relative">
                  {sanity?.coverPhotoUrl ? (
                    <Image
                      src={sanity.coverPhotoUrl + "?w=200&h=140&fit=crop&auto=format&q=80"}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[24px]">
                      🎟️
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-text truncate">{event.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-text2">
                    {eventDate && <span>{eventDate}</span>}
                    {(sanity?.city ?? event.city) && <span>{sanity?.city ?? event.city}</span>}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col gap-2">
                  {event.status === "approved" && sanity?.slug && (
                    <Link
                      href={`/events/${citySlug}/${sanity.slug}`}
                      className="px-3.5 py-1.5 rounded-lg bg-[#E8A020]/10 text-[#E8A020] text-[12px] font-semibold hover:bg-[#E8A020]/20 transition-colors text-center"
                    >
                      View
                    </Link>
                  )}
                  {event.sanity_event_id && (
                    <Link
                      href={`/dashboard/events/${event.id}/attendees`}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600/10 text-purple-600 text-[12px] font-semibold hover:bg-purple-600/20 transition-colors text-center"
                    >
                      Attendees ({attendees})
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
