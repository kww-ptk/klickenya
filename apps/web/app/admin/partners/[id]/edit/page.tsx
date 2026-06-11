import Link from "next/link";
import { notFound } from "next/navigation";
import { sanityClient } from "@/lib/sanity/client";
import {
  ADMIN_PARTNER_BY_ID_QUERY,
  UNASSIGNED_LISTINGS_QUERY,
} from "@/lib/partner/adminQueries";
import { PartnerForm } from "../../_components/PartnerForm";

interface EditPartnerData {
  _id: string;
  name: string;
  slug: string;
  colorPrimary?: string;
  colorAccent?: string;
  colorDark?: string;
  fontDisplay?: string;
  fontBody?: string;
  enabledModules?: string[];
  allowedListingTypes?: string[];
  domains?: string[];
  listingId?: string;
}

interface SanityListing {
  _id: string;
  title: string;
  slug: string;
  type?: string;
  city?: string;
}

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const partner = await sanityClient.fetch<EditPartnerData | null>(
    ADMIN_PARTNER_BY_ID_QUERY,
    { id }
  );

  if (!partner) notFound();

  const listings = await sanityClient.fetch<SanityListing[]>(
    UNASSIGNED_LISTINGS_QUERY
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold text-dark">
          Edit Partner Site
        </h1>
        <Link
          href="/admin/partners"
          className="text-[13px] text-text3 hover:text-dark transition-colors"
        >
          ← Back to Partners
        </Link>
      </div>

      <PartnerForm
        mode="edit"
        partner={partner}
        listings={listings}
      />
    </div>
  );
}
