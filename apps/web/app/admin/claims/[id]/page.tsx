import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ClaimActions } from "./ClaimActions";
import { studioEditUrl } from "@/lib/sanity/studio";

export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminClaimDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: claim } = await adminClient
    .from("claim_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!claim) notFound();

  const listingUrl = `/${claim.listing_type === "experience" ? "experiences" : claim.listing_type + "s"}/${(claim.listing_city ?? "").toLowerCase().replace(/ /g, "-")}/${claim.listing_slug}`;

  const photoConsentLabel: Record<string, string> = {
    yes_all: "✓ Yes — use all photos",
    yes_logo_only: "Logo and key photos only",
    no: "✗ No — will provide own",
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[24px] font-bold text-dark">
            {claim.listing_title}
          </h1>
          <p className="text-sm text-text3 mt-1">
            {claim.listing_type} · {claim.listing_city ?? "—"} · Claimed{" "}
            {new Date(claim.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {/* Owner info */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-dark mb-4">Owner Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
          <div>
            <p className="text-text3">Name</p>
            <p className="font-medium text-dark mt-0.5">{claim.claimant_name}</p>
          </div>
          <div>
            <p className="text-text3">Email</p>
            <p className="font-medium text-dark mt-0.5">{claim.claimant_email}</p>
          </div>
          <div>
            <p className="text-text3">Phone</p>
            <p className="font-medium text-dark mt-0.5">{claim.claimant_phone}</p>
          </div>
        </div>
        {(claim.website_url || claim.social_media_url) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px] mt-4 pt-4 border-t border-[#F0EDE8]">
            {claim.website_url && (
              <div>
                <p className="text-text3">Website</p>
                <a href={claim.website_url} target="_blank" rel="noopener noreferrer" className="font-medium text-amber hover:underline mt-0.5 block truncate">
                  {claim.website_url}
                </a>
              </div>
            )}
            {claim.social_media_url && (
              <div>
                <p className="text-text3">Social Media</p>
                <p className="font-medium text-dark mt-0.5">{claim.social_media_url}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listing feedback */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-dark mb-4">Listing Feedback</h2>
        <div className="space-y-3 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-text3">Everything correct:</span>
            <span className={`font-semibold ${claim.everything_correct === true ? "text-green" : claim.everything_correct === false ? "text-red-500" : "text-text3"}`}>
              {claim.everything_correct === true ? "Yes ✓" : claim.everything_correct === false ? "No ✗" : "Not answered"}
            </span>
          </div>

          {claim.everything_correct === false && claim.incorrect_fields && (
            <div>
              <p className="text-text3 mb-1.5">Issues reported:</p>
              <div className="flex flex-wrap gap-1.5">
                {(claim.incorrect_fields as string[]).map((field: string) => (
                  <span key={field} className="inline-flex rounded-full bg-red-50 text-red-700 text-[11px] font-medium px-2.5 py-1">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {claim.additional_notes && (
            <div>
              <p className="text-text3 mb-1">Notes from owner:</p>
              <p className="text-dark bg-[#F7F5F2] rounded-lg p-3 whitespace-pre-line">{claim.additional_notes}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-text3">Photo consent:</span>
            <span className="font-medium text-dark">
              {photoConsentLabel[claim.photo_consent] ?? "Not specified"}
            </span>
          </div>
        </div>
      </div>

      {/* Consent & verification */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-dark mb-4">Consent & Verification</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
          <div>
            <p className="text-text3">Terms accepted</p>
            <p className="font-medium text-dark mt-0.5">{claim.consent_given ? "Yes ✓" : "No"}</p>
          </div>
          <div>
            <p className="text-text3">Agreed at</p>
            <p className="font-medium text-dark mt-0.5">
              {claim.consent_timestamp
                ? new Date(claim.consent_timestamp).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-text3">Email verified</p>
            <p className="font-medium text-dark mt-0.5">
              {claim.verified_at
                ? new Date(claim.verified_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                : "Not yet"}
            </p>
          </div>
          <div>
            <p className="text-text3">IP address</p>
            <p className="font-medium text-dark mt-0.5">{claim.claimant_ip ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 text-[13px]">
        <a
          href={listingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 font-semibold text-dark hover:bg-[#F9F7F4] transition-colors"
        >
          View listing →
        </a>
        <a
          href={studioEditUrl("listing", claim.listing_sanity_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 font-semibold text-dark hover:bg-[#F9F7F4] transition-colors"
        >
          Open in Sanity →
        </a>
      </div>

      {/* Approve / Reject */}
      {(claim.status === "pending" || claim.status === "verified") && (
        <ClaimActions claimId={claim.id} currentStatus={claim.status} />
      )}
    </div>
  );
}
