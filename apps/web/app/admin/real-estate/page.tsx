import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { studioEditUrl } from "@/lib/sanity/studio";
import Link from "next/link";

export const revalidate = 0;

const CATEGORY_TABS = [
  { label: "All", value: "" },
  { label: "For Sale", value: "for-sale" },
  { label: "For Rent", value: "for-rent" },
  { label: "Land", value: "land" },
  { label: "Commercial", value: "commercial" },
] as const;

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Available", value: "available" },
  { label: "Under Offer", value: "under-offer" },
  { label: "Sold", value: "sold" },
  { label: "Let", value: "let" },
  { label: "Draft", value: "draft" },
] as const;

type Property = {
  _id: string;
  title: string;
  slug: { current: string };
  listingCategory: string;
  city: string;
  status: string;
  price: number;
  priceType: string;
  agent: { displayName: string } | null;
  _createdAt: string;
};

function formatPrice(price: number, priceType: string): string {
  const formatted = new Intl.NumberFormat("en-KE").format(price);
  if (priceType === "per-month" || priceType === "mo") {
    return `KSh ${formatted} / mo`;
  }
  return `KSh ${formatted}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCategory(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function AdminRealEstatePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filterCategory = params.category ?? "";
  const filterStatus = params.status ?? "";


  // Fetch properties from Sanity and enquiry counts from Supabase in parallel
  const [properties, { data: propertyEnquiries }] = await Promise.all([
    sanityClient.fetch<Property[]>(
      `*[_type == "property"] | order(_createdAt desc) {
        _id, title, slug, listingCategory, city, status, price, priceType,
        "agent": agent->{ displayName },
        _createdAt
      }`
    ),
    adminClient.from("property_enquiries").select("property_id"),
  ]);

  // Build enquiry count map
  const countMap = new Map<string, number>();
  propertyEnquiries?.forEach((r: { property_id: string }) => {
    countMap.set(r.property_id, (countMap.get(r.property_id) ?? 0) + 1);
  });

  // Apply filters
  const filtered = properties.filter((property) => {
    if (filterCategory && property.listingCategory !== filterCategory)
      return false;
    if (filterStatus && property.status !== filterStatus) return false;
    return true;
  });

  function buildHref(overrides: {
    category?: string;
    status?: string;
  }): string {
    const p = new URLSearchParams();
    const nextCategory = overrides.category ?? filterCategory;
    const nextStatus = overrides.status ?? filterStatus;
    if (nextCategory) p.set("category", nextCategory);
    if (nextStatus) p.set("status", nextStatus);
    const qs = p.toString();
    return `/admin/real-estate${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-[24px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
          Real Estate
        </h1>
        <p className="mt-1 text-[13px] text-text3">
          Property sale and rental submissions from agents, owners, and developers — review and publish to the marketplace.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="space-y-3">
        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-text3">
            Category
          </span>
          {CATEGORY_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ category: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filterCategory === tab.value
                  ? "bg-dark text-white"
                  : "bg-white text-dark hover:bg-[#F7F5F2]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-text3">
            Status
          </span>
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ status: tab.value })}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                filterStatus === tab.value
                  ? "bg-dark text-white"
                  : "bg-white text-dark hover:bg-[#F7F5F2]"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[13px] text-text3">
        {filtered.length} propert{filtered.length !== 1 ? "ies" : "y"}
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  City
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Enquiries
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Published
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-[13px] text-text3"
                  >
                    No properties found.
                  </td>
                </tr>
              ) : (
                filtered.map((property) => {
                  const enquiryCount = countMap.get(property._id) ?? 0;
                  return (
                    <tr
                      key={property._id}
                      className="border-b border-[#F0EDE8] transition-colors hover:bg-[#F7F5F2]"
                    >
                      <td className="max-w-[220px] truncate px-6 py-3 text-[13px] font-medium text-dark">
                        {property.title}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-dark">
                        {formatCategory(property.listingCategory)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-dark">
                        {property.city}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={property.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-dark">
                        {formatPrice(property.price, property.priceType)}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-dark">
                        {enquiryCount > 0 ? enquiryCount : "\u2014"}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text3">
                        {property.agent?.displayName ?? "\u2014"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-text3">
                        {formatDate(property._createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={studioEditUrl("property", property._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-amber underline-offset-2 hover:underline"
                          >
                            Edit in Sanity
                          </a>
                          <Link
                            href={`/real-estate/${property.slug.current}`}
                            className="text-[13px] font-medium text-text3 underline-offset-2 hover:text-dark hover:underline"
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
