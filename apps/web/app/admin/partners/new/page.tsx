import Link from "next/link";
import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import { UNASSIGNED_LISTINGS_QUERY } from "@/lib/partner/adminQueries";
import { PartnerForm } from "../_components/PartnerForm";

interface SanityListing {
  _id: string;
  title: string;
  slug: string;
  type?: string;
  city?: string;
}

export default async function NewPartnerPage() {
  const listings = await sanityClient.fetch<SanityListing[]>(UNASSIGNED_LISTINGS_QUERY);

  const { data: menus } = await adminClient
    .from("menus")
    .select("listing_slug")
    .eq("is_published", true);

  const menuSlugs = new Set(
    (menus ?? []).map((m) => m.listing_slug).filter(Boolean)
  );

  const restaurantListings = listings.filter((l) => menuSlugs.has(l.slug));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold text-dark">
          Create Partner Site
        </h1>
        <Link
          href="/admin/partners"
          className="text-[13px] text-text3 hover:text-dark transition-colors"
        >
          ← Back to Partners
        </Link>
      </div>

      {restaurantListings.length === 0 && (
        <p className="text-[13px] text-text3 bg-white rounded-2xl shadow-sm px-6 py-4">
          No published restaurant listings with a menu are available to assign yet.
          Publish a listing and add a menu in the host dashboard first.
        </p>
      )}

      <PartnerForm mode="create" listings={restaurantListings} />
    </div>
  );
}
