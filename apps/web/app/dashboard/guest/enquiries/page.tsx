import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/app/dashboard/_lib/auth";
import { createClient } from "@/lib/supabase/server";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function daysAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function nights(checkIn: string, checkOut: string) {
  const a = new Date(checkIn + "T00:00:00");
  const b = new Date(checkOut + "T00:00:00");
  return Math.max(1, Math.ceil((b.getTime() - a.getTime()) / 86_400_000));
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending:   { label: "Awaiting response", className: "bg-amber/15 text-amber" },
  held:      { label: "On hold",           className: "bg-[#4F46E5]/15 text-[#4F46E5]" },
  converted: { label: "Booking confirmed", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  declined:  { label: "Declined",          className: "bg-text3/15 text-text3" },
};

export default async function GuestEnquiriesPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: enquiries } = await supabase
    .from("contact_requests")
    .select("id, listing_title, listing_sanity_id, room_id, check_in, check_out, guests, calendar_status, created_at, notes")
    .eq("guest_user_id", user.id)
    .order("created_at", { ascending: false });

  const items = enquiries ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-display font-bold text-dark">My Enquiries</h1>
        <p className="text-[14px] text-text3 mt-1">
          {items.length} enquir{items.length !== 1 ? "ies" : "y"} submitted
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#F0EDE8] p-12 text-center">
          <p className="text-[15px] font-semibold text-dark">No enquiries yet</p>
          <p className="text-[13px] text-text3 mt-1 mb-6">
            Find a stay and send your first enquiry
          </p>
          <Link
            href="/stays"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber text-white text-[13px] font-semibold rounded-xl hover:bg-[#C78A1A] transition-colors"
          >
            Browse stays
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((enq) => {
            const status = enq.calendar_status ?? "pending";
            const badge = STATUS_LABELS[status] ?? STATUS_LABELS.pending;
            const n = enq.check_in && enq.check_out ? nights(enq.check_in, enq.check_out) : null;

            return (
              <div
                key={enq.id}
                className="bg-white rounded-2xl border border-[#F0EDE8] p-5 space-y-3"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-dark truncate">
                      {enq.listing_title ?? "Property enquiry"}
                    </p>
                    <p className="text-[12px] text-text3 mt-0.5">
                      Submitted {daysAgo(enq.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Dates row */}
                {enq.check_in && enq.check_out && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-dark">
                    <span>
                      <span className="text-text3">Check-in:</span>{" "}
                      {formatDate(enq.check_in)}
                    </span>
                    <span>
                      <span className="text-text3">Check-out:</span>{" "}
                      {formatDate(enq.check_out)}
                    </span>
                    {n && (
                      <span className="text-text3">
                        {n} night{n !== 1 ? "s" : ""}
                      </span>
                    )}
                    {enq.guests && (
                      <span className="text-text3">
                        {enq.guests} guest{enq.guests !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* CTA row */}
                <div className="flex items-center gap-3 pt-1">
                  {status === "converted" ? (
                    <Link
                      href="/dashboard/guest/bookings"
                      className="text-[13px] font-medium text-[#22C55E] hover:text-green transition-colors"
                    >
                      View booking →
                    </Link>
                  ) : status === "pending" && enq.listing_sanity_id ? (
                    <Link
                      href={`/stays/${enq.listing_sanity_id}`}
                      className="text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
                    >
                      View listing →
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
