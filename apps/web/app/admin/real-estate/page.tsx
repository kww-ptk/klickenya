import Link from "next/link";
import { Suspense } from "react";
import { sanityClient } from "@/lib/sanity/client";
import { adminClient } from "@/lib/supabase/admin";
import { studioEditUrl } from "@/lib/sanity/studio";
import { PropertyStatusSelect } from "@/components/admin/PropertyStatusSelect";
import { AdminTableSearch } from "@/components/admin/AdminTableSearch";
import {
  PROPERTY_CATEGORIES,
  PROPERTY_STATUSES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  isPropertyCategory,
  propertyPath,
  type PropertyCategory,
} from "@/lib/real-estate/constants";
import { formatPriceFull, priceSuffix } from "@/lib/real-estate/format";

export const revalidate = 0;

type Property = {
  _id: string;
  title: string;
  slug: { current: string } | null;
  listingCategory: string;
  city: string;
  neighbourhood: string;
  status: string;
  price: number;
  currency: string;
  priceType: string;
  photoCount: number;
  agent: { displayName: string } | null;
  partnerSlug: string | null;
  _createdAt: string;
  _updatedAt: string;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminRealEstatePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filterCategory = params.category ?? "";
  const filterStatus = params.status ?? "";
  const query = (params.q ?? "").trim().toLowerCase();

  const [properties, { data: propertyEnquiries }] = await Promise.all([
    sanityClient.fetch<Property[]>(
      `*[_type == "property"] | order(_createdAt desc) {
        _id, title, slug, listingCategory, city, neighbourhood, status, price, currency, priceType,
        "photoCount": count(photos),
        "agent": agent->{ displayName },
        "partnerSlug": partner->slug.current,
        _createdAt, _updatedAt
      }`
    ),
    adminClient.from("property_enquiries").select("property_id"),
  ]);

  const countMap = new Map<string, number>();
  propertyEnquiries?.forEach((r: { property_id: string }) => {
    countMap.set(r.property_id, (countMap.get(r.property_id) ?? 0) + 1);
  });

  // Counts are computed against the OTHER active filter, so each tab shows how
  // many rows picking it would actually give you.
  const matchesQuery = (p: Property) =>
    !query ||
    [p.title, p.city, p.neighbourhood, p.agent?.displayName]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query));

  const categoryCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  for (const p of properties) {
    if (!matchesQuery(p)) continue;
    if (!filterStatus || p.status === filterStatus) {
      categoryCounts.set(
        p.listingCategory,
        (categoryCounts.get(p.listingCategory) ?? 0) + 1
      );
    }
    if (!filterCategory || p.listingCategory === filterCategory) {
      statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1);
    }
  }

  const filtered = properties.filter((p) => {
    if (filterCategory && p.listingCategory !== filterCategory) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return matchesQuery(p);
  });

  // Listings that will not render properly on the public site.
  const missingPhotos = filtered.filter(
    (p) => p.status === "available" && (p.photoCount ?? 0) === 0
  ).length;

  function buildHref(overrides: { category?: string; status?: string }): string {
    const p = new URLSearchParams();
    const nextCategory = overrides.category ?? filterCategory;
    const nextStatus = overrides.status ?? filterStatus;
    if (nextCategory) p.set("category", nextCategory);
    if (nextStatus) p.set("status", nextStatus);
    if (query) p.set("q", query);
    const qs = p.toString();
    return `/admin/real-estate${qs ? `?${qs}` : ""}`;
  }

  const categoryTabs = [
    { label: "All", value: "", count: Array.from(categoryCounts.values()).reduce((a, b) => a + b, 0) },
    ...PROPERTY_CATEGORIES.map((c) => ({
      label: CATEGORY_LABELS[c],
      value: c as string,
      count: categoryCounts.get(c) ?? 0,
    })),
  ];

  const statusTabs = [
    { label: "All", value: "", count: Array.from(statusCounts.values()).reduce((a, b) => a + b, 0) },
    ...PROPERTY_STATUSES.map((s) => ({
      label: STATUS_LABELS[s],
      value: s as string,
      count: statusCounts.get(s) ?? 0,
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-bold tracking-[-0.03em] text-dark lg:text-[28px]">
          Real Estate
        </h1>
        <p className="mt-1 text-[13px] text-text3">
          Property sale and rental listings. Change a status here and the public
          pages update immediately; everything else is edited in Sanity.
        </p>
      </div>

      {missingPhotos > 0 && (
        <div className="rounded-xl border border-amber/30 bg-amber/8 px-4 py-3 text-[13px] text-dark">
          <strong>{missingPhotos}</strong>{" "}
          {missingPhotos === 1 ? "listing is" : "listings are"} marked available
          with no photos. They render as an empty placeholder on the site.
        </div>
      )}

      <Suspense fallback={null}>
        <AdminTableSearch
          placeholder="Search by title, city, neighbourhood or agent"
          paramName="q"
        />
      </Suspense>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-text3">
            Category
          </span>
          {categoryTabs.map((tab) => (
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
              <span className="ml-1.5 opacity-55">{tab.count}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-text3">
            Status
          </span>
          {statusTabs.map((tab) => (
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
              <span className="ml-1.5 opacity-55">{tab.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-[13px] text-text3">
        {filtered.length} propert{filtered.length !== 1 ? "ies" : "y"}
      </p>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px]">
            <thead>
              <tr className="border-b border-[#F0EDE8]">
                {[
                  "Title",
                  "Category",
                  "Location",
                  "Status",
                  "Price",
                  "Photos",
                  "Enquiries",
                  "Agent",
                  "Updated",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text3 first:px-6"
                  >
                    {heading}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-12 text-center text-[13px] text-text3"
                  >
                    No properties match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((property) => {
                  const enquiryCount = countMap.get(property._id) ?? 0;
                  const slug = property.slug?.current;
                  const suffix = priceSuffix(
                    property.listingCategory,
                    property.priceType
                  );
                  return (
                    <tr
                      key={property._id}
                      className="border-b border-[#F0EDE8] transition-colors hover:bg-[#F7F5F2]"
                    >
                      <td className="max-w-[240px] px-6 py-3 text-[13px] font-medium text-dark">
                        <span className="line-clamp-1">{property.title}</span>
                        {property.partnerSlug && (
                          <span className="mt-0.5 inline-block rounded bg-[#6366F1]/12 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#6366F1]">
                            partner: {property.partnerSlug}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-dark">
                        {isPropertyCategory(property.listingCategory)
                          ? CATEGORY_LABELS[
                              property.listingCategory as PropertyCategory
                            ]
                          : property.listingCategory}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-dark">
                        {[property.neighbourhood, property.city]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <PropertyStatusSelect
                          propertyId={property._id}
                          status={property.status}
                          title={property.title}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-dark">
                        {formatPriceFull(property.price, property.currency)}
                        {suffix && (
                          <span className="text-text3"> / mo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px]">
                        {property.photoCount > 0 ? (
                          <span className="text-dark">{property.photoCount}</span>
                        ) : (
                          <span className="font-semibold text-[#EF4444]">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-dark">
                        {enquiryCount > 0 ? (
                          <Link
                            href="/admin/property-enquiries"
                            className="font-semibold text-amber underline-offset-2 hover:underline"
                          >
                            {enquiryCount}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-text3">
                        {property.agent?.displayName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-text3">
                        {formatDate(property._updatedAt ?? property._createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={studioEditUrl("property", property._id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-amber underline-offset-2 hover:underline"
                          >
                            Edit
                          </a>
                          {slug && property.status !== "draft" && (
                            <Link
                              href={propertyPath(slug)}
                              target="_blank"
                              className="text-[13px] font-medium text-text3 underline-offset-2 hover:text-dark hover:underline"
                            >
                              View
                            </Link>
                          )}
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
