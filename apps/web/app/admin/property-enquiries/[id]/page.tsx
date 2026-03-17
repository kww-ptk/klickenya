import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PropertyEnquiryActions } from "./PropertyEnquiryActions";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PropertyEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: enquiry } = await adminClient
    .from("property_enquiries")
    .select("*")
    .eq("id", id)
    .single();

  if (!enquiry) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/property-enquiries"
          className="flex items-center gap-1.5 text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to list
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-display font-bold text-[#16130C]">
            Property Enquiry
          </h1>
          <p className="text-[14px] text-[#9C9485] mt-1">
            from {enquiry.name || "Unknown"} &middot;{" "}
            {formatDate(enquiry.created_at)}
          </p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mortgage interest banner */}
          {enquiry.mortgage_interest && (
            <div className="bg-[#E8A020]/10 border border-[#E8A020]/30 rounded-2xl p-5 flex items-start gap-3">
              <svg
                className="size-5 text-[#E8A020] shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                />
              </svg>
              <div>
                <p className="text-[14px] font-semibold text-[#E8A020]">
                  Interested in mortgage options
                </p>
                <p className="text-[13px] text-[#C78A1A] mt-0.5">
                  This enquirer has expressed interest in mortgage financing for
                  this property.
                </p>
              </div>
            </div>
          )}

          {/* Enquiry details card */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Enquiry Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Property
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {enquiry.property_title || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Property ID
                </p>
                <p className="text-[14px] text-[#16130C] font-mono text-[13px]">
                  {enquiry.property_id || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Name
                </p>
                <p className="text-[14px] text-[#16130C] font-medium">
                  {enquiry.name || "\u2014"}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Email
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {enquiry.email ? (
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="text-[#E8A020] hover:underline"
                    >
                      {enquiry.email}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Phone
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {enquiry.phone ? (
                    <a
                      href={`tel:${enquiry.phone}`}
                      className="text-[#E8A020] hover:underline"
                    >
                      {enquiry.phone}
                    </a>
                  ) : (
                    "\u2014"
                  )}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Enquiry Type
                </p>
                <p className="text-[14px] text-[#16130C] capitalize">
                  {(enquiry.enquiry_type || "\u2014").replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Mortgage Interest
                </p>
                {enquiry.mortgage_interest ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold bg-[#E8A020]/15 text-[#E8A020]">
                    Yes
                  </span>
                ) : (
                  <p className="text-[14px] text-[#9C9485]">No</p>
                )}
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Status
                </p>
                <StatusBadge status={enquiry.status || "new"} />
              </div>
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-1">
                  Submitted
                </p>
                <p className="text-[14px] text-[#16130C]">
                  {formatDate(enquiry.created_at)}
                </p>
              </div>
            </div>

            {/* Message */}
            {enquiry.message && (
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">
                  Message
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-[#16130C] leading-relaxed whitespace-pre-wrap">
                  {enquiry.message}
                </div>
              </div>
            )}

            {/* Notes */}
            {enquiry.notes && (
              <div>
                <p className="text-[12px] text-[#9C9485] uppercase tracking-wider font-medium mb-2">
                  Notes
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-[#16130C] leading-relaxed whitespace-pre-wrap">
                  {enquiry.notes}
                </div>
              </div>
            )}
          </div>

          {/* Actions (client component) */}
          <PropertyEnquiryActions
            id={id}
            currentStatus={enquiry.status || "new"}
            currentNotes={enquiry.notes || ""}
          />
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Status
            </h2>
            <div className="flex items-center gap-2">
              <StatusBadge status={enquiry.status || "new"} />
            </div>
            <div className="pt-2 space-y-2">
              {enquiry.status !== "responded" && (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-[13px] font-medium rounded-lg bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors"
                  disabled
                >
                  Mark Responded
                </button>
              )}
              {enquiry.status !== "closed" && (
                <button
                  type="button"
                  className="w-full px-4 py-2 text-[13px] font-medium rounded-lg bg-[#9C9485]/10 text-[#9C9485] hover:bg-[#9C9485]/20 transition-colors"
                  disabled
                >
                  Mark Closed
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#9C9485]">
              Use the actions panel below to update status.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[18px] font-display font-bold text-[#16130C]">
              Quick Actions
            </h2>
            <Link
              href="/admin/property-enquiries"
              className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                />
              </svg>
              Back to all enquiries
            </Link>
            {enquiry.email && (
              <a
                href={`mailto:${enquiry.email}`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
                Email {enquiry.name || "enquirer"}
              </a>
            )}
            {enquiry.phone && (
              <a
                href={`tel:${enquiry.phone}`}
                className="flex items-center gap-2 text-[13px] font-medium text-[#E8A020] hover:text-[#C78A1A] transition-colors"
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
                Call {enquiry.name || "enquirer"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
