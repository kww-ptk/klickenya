import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthUser, getHostProfile } from "../../_lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import { sanityPreviewClient } from "@/lib/sanity/client";
import { ClaimForm } from "@/components/claim/ClaimForm";

export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export default async function DashboardClaimPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const host = await getHostProfile(user.id);
  if (!host) redirect("/dashboard");

  const listing = await sanityPreviewClient
    .fetch<{
      _id: string;
      title: string;
      type: string;
      subcategory: string | null;
      city: string | null;
      slug: string;
      hostId: string | null;
      hostRef: string | null;
    } | null>(
      `*[_type == "listing" && _id == $id][0]{
        _id, title, type, subcategory, city, "slug": slug.current,
        hostId, "hostRef": host._ref
      }`,
      { id }
    )
    .catch(() => null);

  if (!listing) notFound();

  const owns =
    listing.hostId === user.id ||
    (!!host.sanity_host_id && listing.hostRef === host.sanity_host_id);
  if (!owns) redirect("/dashboard");

  // Contact fields for prefill (the endpoint re-derives these authoritatively).
  const { data: contact } = await adminClient
    .from("host_profiles")
    .select("display_name, email, phone")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="max-w-xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors mb-5"
      >
        <span aria-hidden>←</span> Back to dashboard
      </Link>

      <h1 className="font-display text-[24px] font-bold text-dark mb-1">
        Fully claim {listing.title}
      </h1>
      <p className="text-[14px] text-text2 mb-6">
        Confirm your details and consent. This keeps your listing accurate and
        lets us feature your photos.
      </p>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <ClaimForm
          mode="authenticated"
          listingSlug={listing.slug}
          listingSanityId={listing._id}
          listingTitle={listing.title}
          listingType={listing.type}
          listingSubcategory={listing.subcategory}
          listingCity={listing.city ?? undefined}
          prefillName={contact?.display_name ?? host.display_name ?? ""}
          prefillEmail={contact?.email ?? user.email ?? ""}
          prefillPhone={contact?.phone ?? ""}
        />
      </div>
    </div>
  );
}
