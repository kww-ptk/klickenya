import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ListingRequestActions } from "./ListingRequestActions";

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

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">
        {label}
      </p>
      <p className="text-[14px] text-dark">{value || "—"}</p>
    </div>
  );
}

export default async function ListingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: request } = await adminClient
    .from("listing_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!request) notFound();

  const canApprove = request.status === "submitted" || request.status === "new";
  const canReject = request.status !== "rejected" && request.status !== "approved";

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/listing-requests"
          className="flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to list
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-display font-bold text-dark">
            {request.draft_title || request.business_name || "Listing Request"}
          </h1>
          <p className="text-[14px] text-text3 mt-1">
            from {request.name || "Unknown"} &middot; {formatDate(request.created_at)}
          </p>
        </div>
        <StatusBadge status={request.status || "new"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* AI Analysis */}
          {(request.ai_score != null || request.ai_summary || (request.ai_flags?.length ?? 0) > 0) && (
            <div className="bg-[#FDF8F0] rounded-2xl border border-amber p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-display font-bold text-dark">AI Analysis</h2>
                {request.ai_score != null && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold ${
                      request.ai_score >= 80
                        ? "bg-green-100 text-green-700"
                        : request.ai_score >= 60
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    Score: {request.ai_score}/100
                  </span>
                )}
              </div>
              {request.ai_summary && (
                <p className="text-[14px] text-text2 leading-relaxed">{request.ai_summary}</p>
              )}
              {(request.ai_flags?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-2">
                    Flags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(request.ai_flags as string[]).map((flag: string) => (
                      <span
                        key={flag}
                        className="px-2 py-1 bg-red-50 text-red-600 text-[11px] font-medium rounded-lg border border-red-100"
                      >
                        {flag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Listing Content */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
            <h2 className="text-[18px] font-display font-bold text-dark">
              Listing Content
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Draft Title" value={request.draft_title} />
              <Field label="City" value={request.draft_city || request.location} />
              <Field label="Type" value={request.listing_type} />
              <Field label="Subcategory" value={request.draft_subcategory} />
              <Field label="Business Name" value={request.business_name} />
              {request.draft_website && (
                <div>
                  <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">
                    Website
                  </p>
                  <a
                    href={request.draft_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-amber hover:underline break-all"
                  >
                    {request.draft_website}
                  </a>
                </div>
              )}
              {request.draft_instagram && (
                <Field label="Instagram" value={`@${request.draft_instagram}`} />
              )}
              {request.draft_phone && (
                <Field label="Business Phone" value={request.draft_phone} />
              )}
              {request.draft_email && (
                <Field label="Business Email" value={request.draft_email} />
              )}
            </div>

            {(request.draft_description || request.description) && (
              <div>
                <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-2">
                  Description
                </p>
                <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-dark leading-relaxed whitespace-pre-wrap">
                  {request.draft_description || request.description}
                </div>
              </div>
            )}
          </div>

          {/* Submitter Details */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-5">
            <h2 className="text-[18px] font-display font-bold text-dark">
              Submitter Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Name" value={request.name} />
              <div>
                <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">Email</p>
                {request.email ? (
                  <a href={`mailto:${request.email}`} className="text-[14px] text-amber hover:underline">
                    {request.email}
                  </a>
                ) : <p className="text-[14px] text-dark">—</p>}
              </div>
              <div>
                <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">Phone</p>
                {request.phone ? (
                  <a href={`tel:${request.phone}`} className="text-[14px] text-amber hover:underline">
                    {request.phone}
                  </a>
                ) : <p className="text-[14px] text-dark">—</p>}
              </div>
              <Field label="Submitted" value={formatDate(request.created_at)} />
              <Field label="OTP Verified" value={request.otp_verified ? "Yes" : "No"} />
              {request.google_place_id && (
                <Field label="Google Place ID" value={request.google_place_id} />
              )}
              {request.website_url && (
                <div>
                  <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">Website URL</p>
                  <a
                    href={request.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] text-amber hover:underline break-all"
                  >
                    {request.website_url}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          {request.admin_notes && (
            <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6">
              <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-2">
                Admin Notes
              </p>
              <div className="bg-[#F7F5F2] rounded-xl p-4 text-[14px] text-dark leading-relaxed whitespace-pre-wrap">
                {request.admin_notes}
              </div>
            </div>
          )}

          {/* Actions panel */}
          <ListingRequestActions
            id={id}
            currentStatus={request.status || "new"}
            currentNotes={request.admin_notes || ""}
            canApprove={canApprove}
            canReject={canReject}
            submitterEmail={request.email || ""}
            submitterName={request.name || ""}
            draftTitle={request.draft_title || request.business_name || ""}
          />
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-4">
            <h2 className="text-[18px] font-display font-bold text-dark">Status</h2>
            <StatusBadge status={request.status || "new"} />
            {request.reviewed_at && (
              <p className="text-[12px] text-text3">
                Reviewed {formatDate(request.reviewed_at)}
              </p>
            )}
            {request.sanity_listing_id && (
              <div>
                <p className="text-[12px] text-text3 uppercase tracking-wider font-medium mb-1">
                  Sanity Listing
                </p>
                <p className="text-[13px] font-mono text-dark break-all">
                  {request.sanity_listing_id}
                </p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#F0EDE8] p-6 space-y-3">
            <h2 className="text-[18px] font-display font-bold text-dark">Quick Actions</h2>
            <Link
              href="/admin/listing-requests"
              className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              Back to all requests
            </Link>
            {request.email && (
              <a
                href={`mailto:${request.email}`}
                className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Email {request.name || "submitter"}
              </a>
            )}
            {request.phone && (
              <a
                href={`tel:${request.phone}`}
                className="flex items-center gap-2 text-[13px] font-medium text-amber hover:text-[#C78A1A] transition-colors"
              >
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                Call {request.name || "submitter"}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
