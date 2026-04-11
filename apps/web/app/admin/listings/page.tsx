import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";

export const revalidate = 0;

const TYPE_TABS = [
  { label: "All", value: "" },
  { label: "Stay", value: "stay" },
  { label: "Experience", value: "experience" },
  { label: "Event", value: "event" },
  { label: "Rental", value: "rental" },
  { label: "Service", value: "service" },
  { label: "Restaurant", value: "restaurant" },
] as const;

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
] as const;

type Listing = {
  _id: string;
  title: string;
  slug: { current: string };
  type: string;
  subcategory: string | null;
  city: string;
  status: string;
  price: number;
  priceUnit: string;
  _createdAt: string;
};

// Restaurants appear as type="restaurant" OR type="experience" + subcategory="restaurants"
function isRestaurantListing(l: Listing): boolean {
  return l.type === "restaurant" || (l.type === "experience" && l.subcategory === "restaurants");
}

function formatPrice(price: number, priceUnit: string): string {
  const formatted = new Intl.NumberFormat("en-KE").format(price);
  const suffix = priceUnit && priceUnit !== "once" ? ` / ${priceUnit}` : "";
  return `KSh ${formatted}${suffix}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filterType = params.type ?? "";
  const filterStatus = params.status ?? "";

  const studioUrl =
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? "http://localhost:3333";

  // Fetch listings from Sanity, enquiry counts, and menu data in parallel
  const [listings, { data: contactRequests }, { data: menuData }] = await Promise.all([
    sanityClient.fetch<Listing[]>(
      `*[_type == "listing"] | order(_createdAt desc) {
        _id, title, slug, type, subcategory, city, status, price, priceUnit, _createdAt
      }`
    ),
    adminClient.from("contact_requests").select("listing_id"),
    adminClient.from("menus").select("listing_slug, reservations_enabled"),
  ]);

  // Build enquiry count map
  const countMap = new Map<string, number>();
  contactRequests?.forEach((r: { listing_id: string }) => {
    countMap.set(r.listing_id, (countMap.get(r.listing_id) ?? 0) + 1);
  });

  // Build menu map keyed by listing_slug for reservation status lookup
  const menuBySlug = new Map(
    (menuData ?? []).map((m: { listing_slug: string | null; reservations_enabled: boolean }) => [m.listing_slug, m])
  );

  // Apply filters
  const filtered = listings.filter((listing) => {
    if (filterType && listing.type !== filterType) return false;
    if (filterStatus && listing.status !== filterStatus) return false;
    return true;
  });

  function buildHref(overrides: { type?: string; status?: string }): string {
    const p = new URLSearchParams();
    const nextType = overrides.type ?? filterType;
    const nextStatus = overrides.status ?? filterStatus;
    if (nextType) p.set("type", nextType);
    if (nextStatus) p.set("status", nextStatus);
    const qs = p.toString();
    return `/admin/listings${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-[24px] font-bold text-[#16130C]">
          Listings
        </h1>
        <p className="mt-1 text-[14px] text-[#9C9485]">
          Manage listings in Sanity Studio. This view is read-only.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="space-y-3">
        {/* Type filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
            Type
          </span>
          {TYPE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ type: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filterType === tab.value
                  ? "bg-[#16130C] text-white"
                  : "bg-white text-[#16130C] hover:bg-[#F7F5F2]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
            Status
          </span>
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ status: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filterStatus === tab.value
                  ? "bg-[#16130C] text-white"
                  : "bg-white text-[#16130C] hover:bg-[#F7F5F2]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[13px] text-[#9C9485]">
        {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  City
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Enquiries
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Reservations
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Published
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#9C9485]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-[13px] text-[#9C9485]"
                  >
                    No listings found.
                  </td>
                </tr>
              ) : (
                filtered.map((listing) => {
                  const enquiryCount = countMap.get(listing._id) ?? 0;
                  const isRestaurant = isRestaurantListing(listing);
                  const menuInfo = isRestaurant ? menuBySlug.get(listing.slug.current) : undefined;
                  return (
                    <tr
                      key={listing._id}
                      className="border-b border-[#F0EDE8] transition-colors hover:bg-[#F7F5F2]"
                    >
                      <td className="max-w-[240px] truncate px-6 py-3 text-[13px] font-medium text-[#16130C]">
                        {listing.title}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#16130C]">
                        {capitalize(listing.type)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#16130C]">
                        {listing.city}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={listing.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#16130C]">
                        {formatPrice(listing.price, listing.priceUnit)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[#16130C]">
                        {enquiryCount > 0 ? enquiryCount : "\u2014"}
                      </td>
                      <td className="px-4 py-3">
                        {isRestaurant ? (
                          menuInfo?.reservations_enabled ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#7C3AED]/10 text-[#7C3AED]">On</span>
                          ) : (
                            <span className="text-[13px] text-[#9C9485]">\u2014</span>
                          )
                        ) : (
                          <span className="text-[13px] text-[#F0EDE8]">\u2014</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#9C9485]">
                        {formatDate(listing._createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isRestaurant && (
                            <Link
                              href={`/dashboard/listings/${listing._id}/reservations`}
                              className="text-[13px] font-medium text-[#7C3AED] underline-offset-2 hover:underline"
                            >
                              Command center
                            </Link>
                          )}
                          <a
                            href={`${studioUrl}/structure/listing;${listing._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-amber underline-offset-2 hover:underline"
                          >
                            Edit in Sanity
                          </a>
                          <Link
                            href={`/listings/${listing.type}/${listing.slug.current}`}
                            className="text-[13px] font-medium text-[#9C9485] underline-offset-2 hover:text-[#16130C] hover:underline"
                          >
                            View on site
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
