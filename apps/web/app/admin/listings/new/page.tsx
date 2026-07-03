import { ListingEditor } from "@/components/listings/ListingEditor";

export default function AdminNewListingPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <ListingEditor
        mode="create"
        role="admin"
        onSuccessRedirect="/admin/listings?created=1"
        heading="New Listing"
        backHref="/admin/listings"
      />
    </div>
  );
}
