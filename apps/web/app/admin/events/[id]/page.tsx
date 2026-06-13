import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { EventReviewActions } from "./EventReviewActions";

interface EventPending {
  id: string;
  sanity_event_id: string | null;
  host_id: string;
  title: string;
  city: string | null;
  status: string;
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  is_new_host: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEventDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: event } = await adminClient
    .from("events_pending")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) notFound();
  const ev = event as EventPending;

  // Host info
  const { data: hostProfile } = await adminClient
    .from("host_profiles")
    .select("display_name, user_id")
    .eq("user_id", ev.host_id)
    .single();

  const { data: hostUser } = await adminClient
    .from("users")
    .select("email")
    .eq("id", ev.host_id)
    .single();

  // Prior approved count
  const { count: approvedCount } = await adminClient
    .from("events_pending")
    .select("id", { count: "exact", head: true })
    .eq("host_id", ev.host_id)
    .eq("status", "approved");

  // Sanity data
  let sanityEvent: {
    title: string;
    city: string | null;
    eventDate: string | null;
    venue: string | null;
    coverPhotoUrl: string | null;
    subcategory: string | null;
  } | null = null;

  if (ev.sanity_event_id) {
    sanityEvent = await sanityClient.fetch(
      `*[_type == "listing" && _id == $id][0]{
        title, city, eventDate, venue, subcategory,
        "coverPhotoUrl": photos[0].asset->url
      }`,
      { id: ev.sanity_event_id }
    );
  }

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-[800px] mx-auto px-5 md:px-10 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-text">{ev.title}</h1>
          <p className="text-text2 text-[14px] mt-1">
            {ev.city ?? "Unknown city"} · Submitted {new Date(ev.submitted_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
          </p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusStyles[ev.status] ?? statusStyles.pending}`}>
          {ev.status}
        </span>
      </div>

      {/* Cover image */}
      {sanityEvent?.coverPhotoUrl && (
        <div className="rounded-xl overflow-hidden border border-border mb-8 relative h-[240px]">
          <Image
            src={sanityEvent.coverPhotoUrl + "?w=800&h=400&fit=crop&auto=format&q=80"}
            alt={ev.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Event details */}
      <div className="rounded-xl border border-border bg-white p-6 mb-6 space-y-3">
        <h3 className="text-[16px] font-bold text-text mb-3">Event Details</h3>
        <Row label="Title" value={sanityEvent?.title ?? ev.title} />
        <Row label="Category" value={sanityEvent?.subcategory?.replace(/_/g, " ") ?? "—"} />
        <Row label="City" value={sanityEvent?.city ?? ev.city ?? "—"} />
        <Row label="Venue" value={sanityEvent?.venue ?? "—"} />
        <Row label="Date" value={sanityEvent?.eventDate ? new Date(sanityEvent.eventDate).toLocaleDateString("en-GB", { dateStyle: "medium" }) : "—"} />
      </div>

      {/* Host info */}
      <div className="rounded-xl border border-border bg-white p-6 mb-6 space-y-3">
        <h3 className="text-[16px] font-bold text-text mb-3">Host Info</h3>
        <Row label="Name" value={hostProfile?.display_name ?? "Unknown"} />
        <Row label="Email" value={hostUser?.email ?? "Unknown"} />
        <Row label="Prior approved events" value={String(approvedCount ?? 0)} />
        {ev.is_new_host && (
          <div className="inline-flex px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold uppercase tracking-wide">
            New host — first event
          </div>
        )}
      </div>

      {/* Rejection reason */}
      {ev.status === "rejected" && ev.rejection_reason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 mb-6">
          <h3 className="text-[16px] font-bold text-red-700 mb-2">Rejection Reason</h3>
          <p className="text-[14px] text-red-600 whitespace-pre-line">{ev.rejection_reason}</p>
        </div>
      )}

      {/* Actions */}
      {ev.status === "pending" && (
        <EventReviewActions eventId={ev.id} eventTitle={ev.title} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[12px] font-semibold text-text3 uppercase tracking-wide w-36 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[14px] text-text">{value}</span>
    </div>
  );
}
