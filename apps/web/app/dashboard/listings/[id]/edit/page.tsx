import { notFound, redirect } from "next/navigation";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { LISTING_EDIT_QUERY } from "@/lib/sanity/queries";
import { sanityDocToForm } from "@/lib/listings/listingFields";
import { hostOwnsListing } from "@/lib/listings/ownership";
import { ListingEditor } from "@/components/listings/ListingEditor";
import { getAuthUser, getHostProfile, getIsAdmin } from "@/app/dashboard/_lib/auth";

export const dynamic = "force-dynamic";

export default async function HostEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");
  const hostProfile = await getHostProfile(user.id);
  const isAdmin = await getIsAdmin(user.id);
  const { ok } = await hostOwnsListing(id, user.id, hostProfile?.sanity_host_id ?? null);
  if (!ok && !isAdmin) redirect("/dashboard/listings");
  const doc = await sanityWriteClient.fetch(LISTING_EDIT_QUERY, { id });
  if (!doc) notFound();
  const initialValues = sanityDocToForm(doc);
  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
      <ListingEditor
        mode="edit" role="host" listingId={id} initialValues={initialValues}
        onSuccessRedirect="/dashboard/listings?updated=1"
        heading="Edit listing" backHref="/dashboard/listings"
      />
    </div>
  );
}
