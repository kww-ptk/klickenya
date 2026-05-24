import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { notFound } from "next/navigation";
import Link from "next/link";

const RESERVATION_STATUS_BADGE: Record<string, string> = {
  pending:   "bg-[#E8A020]/15 text-[#E8A020]",
  approved:  "bg-[#22C55E]/15 text-[#22C55E]",
  declined:  "bg-red-100 text-red-600",
  cancelled: "bg-[#9C9485]/15 text-[#9C9485]",
  completed: "bg-[#4F46E5]/15 text-[#4F46E5]",
  no_show:   "bg-red-100 text-red-600",
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatNairobiDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDatetime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: reservation, error } = await adminClient
    .from("reservations")
    .select(
      `id, guest_name, guest_email, guest_phone, party_size,
       reserved_for, status, notes, decline_reason, internal_notes,
       source, source_origin, source_ref,
       created_at, updated_at, approved_by, menu_id,
       menu:menus(id, display_name, slug, listing_slug, business_id)`,
    )
    .eq("id", id)
    .single();

  if (error || !reservation) notFound();

  const menu = Array.isArray(reservation.menu)
    ? reservation.menu[0]
    : (reservation.menu as Record<string, string> | null);

  // Resolve Sanity listing _id from menu.listing_slug for the command-center deep-link
  let listingId: string | null = null;
  if (menu?.listing_slug) {
    const sanityListing = await sanityClient
      .fetch<{ _id: string } | null>(
        `*[_type == "listing" && slug.current == $slug][0]{ _id }`,
        { slug: menu.listing_slug },
      )
      .catch(() => null);
    listingId = sanityListing?._id ?? null;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <Link
        href="/admin/reservations"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to all reservations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-display font-bold text-[#16130C]">
            Reservation #{shortId(reservation.id)}
          </h1>
          <p className="text-[14px] text-[#9C9485] mt-1">
            {reservation.guest_name} · {menu?.display_name ?? menu?.slug ?? "—"} · {formatNairobiDateTime(reservation.reserved_for)}
          </p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold ${RESERVATION_STATUS_BADGE[reservation.status] ?? "bg-[#F0EDE8] text-[#9C9485]"}`}>
          {reservation.status?.replace("_", "-") ?? "—"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — reservation detail */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reservation info */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[16px] font-display font-bold text-[#16130C]">Reservation Details</h2>
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <Field label="Guest Name" value={reservation.guest_name} />
              <Field label="Party Size" value={`${reservation.party_size} ${reservation.party_size === 1 ? "person" : "people"}`} />
              <Field label="Date & Time" value={formatNairobiDateTime(reservation.reserved_for)} />
              <Field label="Status" value={reservation.status?.replace("_", "-")} />
              <Field label="Restaurant" value={menu?.display_name ?? menu?.slug ?? "—"} />
              <Field label="Created" value={formatDatetime(reservation.created_at)} />
              <Field
                label="Booked via"
                value={
                  reservation.source === "embed"
                    ? `Embed${reservation.source_origin ? ` — ${reservation.source_origin}` : ""}${reservation.source_ref ? ` · ${reservation.source_ref}` : ""}`
                    : reservation.source ?? "—"
                }
              />
              {reservation.decline_reason && (
                <div className="col-span-2">
                  <Field label="Decline Reason" value={reservation.decline_reason} />
                </div>
              )}
              {reservation.notes && (
                <div className="col-span-2">
                  <Field label="Guest Notes" value={reservation.notes} />
                </div>
              )}
            </div>
          </div>

          {/* Internal notes */}
          {reservation.internal_notes && (
            <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
              <h2 className="text-[16px] font-display font-bold text-[#16130C] mb-3">Internal Notes</h2>
              <p className="text-[13px] text-[#16130C] whitespace-pre-wrap">{reservation.internal_notes}</p>
            </div>
          )}
        </div>

        {/* Right — links */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[16px] font-display font-bold text-[#16130C]">Links</h2>

            {reservation.guest_email && (
              <a
                href={`mailto:${reservation.guest_email}`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Email guest
              </a>
            )}

            {reservation.guest_phone && (
              <a
                href={`tel:${reservation.guest_phone}`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Call guest
              </a>
            )}

            {listingId && (
              <Link
                href={`/dashboard/listings/${listingId}/reservations`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Open reservations dashboard
              </Link>
            )}

            {reservation.guest_email && (
              <p className="text-[12px] text-[#9C9485] pt-1 border-t border-[#F0EDE8]">
                {reservation.guest_email}
              </p>
            )}
          </div>

          {/* IDs */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3 text-[12px]">
            <h2 className="text-[14px] font-display font-bold text-[#16130C]">IDs</h2>
            <Field label="Reservation ID" value={reservation.id} mono />
            <Field label="Menu ID" value={reservation.menu_id} mono />
            {reservation.approved_by && (
              <Field label="Approved by" value={reservation.approved_by} mono />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-[14px] text-[#16130C] ${mono ? "font-mono text-[12px]" : ""}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
