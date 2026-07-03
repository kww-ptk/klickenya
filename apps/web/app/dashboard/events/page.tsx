import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Calendar } from "lucide-react";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { ListingRowActions } from "@/components/listings/ListingRowActions";
import { getAuthUser, getHostProfile } from "../_lib/auth";

interface EventRow {
  id: string;
  sanity_event_id: string;
  sanityId: string | null;
  title: string;
  city: string | null;
  status: string;
  slug: string | null;
  eventDate: string | null;
  coverPhotoUrl: string | null;
  attendees: number;
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  approved: { label: "Live", bg: "bg-emerald-100", text: "text-emerald-700" },
  published: { label: "Live", bg: "bg-emerald-100", text: "text-emerald-700" },
  pending: { label: "Pending review", bg: "bg-amber-100", text: "text-amber-700" },
  draft: { label: "Draft", bg: "bg-amber-100", text: "text-amber-700" },
  rejected: { label: "Rejected", bg: "bg-red-100", text: "text-red-700" },
};

export default async function MyEventsPage() {
  const { user, supabase } = await getAuthUser();
  if (!user) redirect("/login");

  // Cached — already fetched in layout
  const hostProfile = await getHostProfile(user.id);
  const sanityHostId = hostProfile?.sanity_host_id ?? "";

  // Parallel: fetch events_pending + Sanity events together
  const [{ data: pendingEvents }, sanityEvents] = await Promise.all([
    supabase
      .from("events_pending")
      .select("*")
      .eq("host_id", user.id)
      .order("submitted_at", { ascending: false }),
    sanityClient.fetch<
      { _id: string; title: string; slug: string; status: string; city: string | null; eventDate: string | null; coverPhotoUrl: string | null }[]
    >(
      `*[_type == "listing" && listingType == "event" && (hostId == $userId || host._ref == $sanityHostId)]{
        _id,
        title,
        "slug": slug.current,
        status,
        city,
        eventDate,
        "coverPhotoUrl": photos[0].asset->url
      }`,
      { userId: user.id, sanityHostId }
    ),
  ]);

  const pendingRows = (pendingEvents ?? []) as {
    id: string;
    sanity_event_id: string | null;
    title: string;
    city: string | null;
    status: string;
    submitted_at: string;
  }[];

  const pendingSanityIds = new Set(
    pendingRows.map((e) => e.sanity_event_id).filter(Boolean)
  );

  // Build sanity info map for all events
  const sanityMap = new Map(
    sanityEvents.map((e) => [e._id, e])
  );

  // 3. Merge: start with events_pending rows, then add any Sanity-only events
  const allSanityIds: string[] = [];
  const eventRows: EventRow[] = [];

  // Add events_pending rows
  for (const row of pendingRows) {
    const sanity = row.sanity_event_id ? sanityMap.get(row.sanity_event_id) : null;
    const sanityId = row.sanity_event_id ?? "";
    if (sanityId) allSanityIds.push(sanityId);
    eventRows.push({
      id: row.id,
      sanity_event_id: sanityId,
      sanityId: sanityId || null,
      title: sanity?.title ?? row.title,
      city: sanity?.city ?? row.city,
      status: row.status,
      slug: sanity?.slug ?? null,
      eventDate: sanity?.eventDate ?? null,
      coverPhotoUrl: sanity?.coverPhotoUrl ?? null,
      attendees: 0,
    });
  }

  // Add Sanity-only events (not in events_pending)
  for (const se of sanityEvents) {
    if (pendingSanityIds.has(se._id)) continue;
    allSanityIds.push(se._id);
    eventRows.push({
      id: se._id,
      sanity_event_id: se._id,
      sanityId: se._id,
      title: se.title,
      city: se.city,
      status: se.status === "published" ? "approved" : se.status,
      slug: se.slug,
      eventDate: se.eventDate,
      coverPhotoUrl: se.coverPhotoUrl,
      attendees: 0,
    });
  }

  // 4. Fetch attendee counts
  if (allSanityIds.length > 0) {
    const { data: attendeeCounts } = await adminClient
      .from("event_attendees")
      .select("event_sanity_id")
      .in("event_sanity_id", allSanityIds)
      .eq("status", "confirmed");
    const countMap = new Map<string, number>();
    for (const row of attendeeCounts ?? []) {
      countMap.set(row.event_sanity_id, (countMap.get(row.event_sanity_id) ?? 0) + 1);
    }
    for (const ev of eventRows) {
      ev.attendees = countMap.get(ev.sanity_event_id) ?? 0;
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
          className="px-5 py-2.5 rounded-full bg-amber text-white font-semibold text-[14px] hover:bg-[#d4911c] transition-colors shadow-sm"
        >
          Create event
        </Link>
      </div>

      {/* Event list */}
      {eventRows.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border bg-white p-12 text-center">
          <Calendar className="size-10 text-text3 mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-text mb-1">
            You haven&apos;t created any events yet
          </p>
          <p className="text-[13px] text-text2 max-w-[360px] mx-auto mb-6">
            Share what&apos;s happening in Kenya — parties, festivals, workshops and more.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex px-6 py-3 rounded-full bg-amber text-white font-semibold text-[14px] hover:bg-[#d4911c] transition-colors"
          >
            Create your first event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {eventRows.map((event) => {
            const status = STATUS_STYLES[event.status] ?? STATUS_STYLES.pending;
            const citySlug = (event.city ?? "").toLowerCase().replace(/\s+/g, "-");
            const eventDate = event.eventDate
              ? new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : null;

            return (
              <div
                key={event.id}
                className="flex items-center gap-4 rounded-[16px] bg-white border border-border p-4 hover:shadow-sm transition-shadow"
              >
                {/* Image */}
                <div className="shrink-0 size-16 md:w-28 md:h-20 rounded-xl overflow-hidden bg-surface relative">
                  {event.coverPhotoUrl ? (
                    <Image
                      src={event.coverPhotoUrl + "?w=200&h=140&fit=crop&auto=format&q=80"}
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
                    {event.city && <span>{event.city}</span>}
                  </div>
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex flex-col gap-2">
                  {(event.status === "approved" || event.status === "published") && event.slug && (
                    <Link
                      href={`/events/${citySlug}/${event.slug}`}
                      className="px-3.5 py-1.5 rounded-lg bg-amber/10 text-amber text-[12px] font-semibold hover:bg-amber/20 transition-colors text-center"
                    >
                      View
                    </Link>
                  )}
                  {event.sanity_event_id && (
                    <Link
                      href={`/dashboard/events/${event.id}/attendees`}
                      className="px-3.5 py-1.5 rounded-lg bg-purple-600/10 text-purple-600 text-[12px] font-semibold hover:bg-purple-600/20 transition-colors text-center"
                    >
                      Attendees ({event.attendees})
                    </Link>
                  )}
                  {event.sanityId && (
                    <ListingRowActions id={event.sanityId} editHref={`/dashboard/listings/${event.sanityId}/edit`} variant="host" status={event.status} />
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
