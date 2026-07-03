import { notFound } from "next/navigation";
import { sanityWriteClient } from "@/lib/sanity/writeClient";
import { LISTING_EDIT_QUERY } from "@/lib/sanity/queries";
import { sanityDocToForm } from "@/lib/listings/listingFields";
import { ListingEditor } from "@/components/listings/ListingEditor";

export const dynamic = "force-dynamic";

export default async function AdminEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await sanityWriteClient.fetch(LISTING_EDIT_QUERY, { id });
  if (!doc) notFound();
  const initialValues = sanityDocToForm(doc);
  return (
    <div className="max-w-2xl space-y-6">
      <ListingEditor
        mode="edit" role="admin" listingId={id} initialValues={initialValues}
        onSuccessRedirect="/admin/listings?updated=1"
        heading={`Edit — ${doc.title}`} backHref="/admin/listings"
      />
    </div>
  );
}
