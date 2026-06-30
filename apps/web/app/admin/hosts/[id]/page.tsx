import { notFound } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityPreviewClient as sanityClient } from "@/lib/sanity/client";
import { HostListingActions, SyncListingsButton } from "./HostListingActions";
import { HostFormModal } from "../HostFormModal";
import { DeleteHostButton } from "../DeleteHostButton";

export const revalidate = 0;

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminHostDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: host } = await adminClient
    .from("host_profiles")
    .select("id, user_id, display_name, email, phone, slug, city, website_url, social_url, sanity_host_id, created_at")
    .eq("id", id)
    .single();

  if (!host) notFound();

  // Fetch auth user for last_sign_in
  const { data: authUser } = await adminClient
    .from("users")
    .select("full_name, email")
    .eq("id", host.user_id)
    .single();

  // Fetch Sanity host photo
  let photoUrl: string | null = null;
  if (host.sanity_host_id) {
    const sanityHost = await sanityClient.fetch<{ photoUrl?: string } | null>(
      `*[_type == "host" && _id == $id][0]{ "photoUrl": photo.asset->url }`,
      { id: host.sanity_host_id }
    ).catch(() => null);
    photoUrl = sanityHost?.photoUrl ?? null;
  }

  // Fetch assigned listings from Sanity.
  // Three ways a listing can be linked to this host:
  //   1. hostId == user_id  (forward field, set on listing)
  //   2. host._ref == sanity_host_id  (reference field, set on listing)
  //   3. _id in host document's listings[] array  (inverse array, always populated on assign)
  // Condition 3 catches listings assigned before hostId/host._ref were written correctly.
  const assignedListings = await sanityClient.fetch<
    { _id: string; title: string; type: string; subcategory: string | null; city: string | null; slug: string; isVerified: boolean }[]
  >(
    `*[_type == "listing" && (
      hostId == $hostId
      || host._ref == $sanityHostId
      || (_type == "listing" && _id in *[_type == "host" && _id == $sanityHostId][0].listings[]._ref)
    )] | order(_createdAt desc) {
      _id, title, type, subcategory, city, "slug": slug.current, isVerified
    }`,
    { hostId: host.user_id, sanityHostId: host.sanity_host_id ?? "" }
  ).catch(() => []);

  // Detect restaurant listings and fetch their menus
  const isRestaurant = (l: { type: string; subcategory: string | null }) =>
    l.type === "restaurant" || (l.type === "experience" && l.subcategory === "restaurants");
  const restaurantSlugs = assignedListings.filter(isRestaurant).map((l) => l.slug);

  let menus: { id: string; slug: string; display_name: string | null; is_published: boolean; listing_slug: string | null; reservations_enabled: boolean }[] = [];
  if (restaurantSlugs.length > 0) {
    const { data } = await adminClient
      .from("menus")
      .select("id, slug, display_name, is_published, listing_slug, reservations_enabled")
      .in("slug", restaurantSlugs);
    menus = data ?? [];
  }

  // Build slug → Sanity _id map so menu cards can link to the listing command center
  const listingIdBySlug = new Map(assignedListings.map((l) => [l.slug, l._id]));

  // Detect stay/rental listings and fetch their linked properties (for dashboard links)
  const isStay = (l: { type: string }) => l.type === "stay" || l.type === "rental";
  const staySlugs = assignedListings.filter(isStay).map((l) => l.slug);
  let properties: { id: string; listing_slug: string | null }[] = [];
  if (staySlugs.length > 0) {
    const { data } = await adminClient
      .from("properties")
      .select("id, listing_slug")
      .in("listing_slug", staySlugs);
    properties = data ?? [];
  }
  // Build listing_slug → property id map
  const propertyIdBySlug = new Map(properties.map((p) => [p.listing_slug, p.id]));

  const initials = (host.display_name ?? "?")
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sanityStudioUrl = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "http://localhost:3333";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/admin/hosts" className="inline-flex items-center gap-1.5 text-[13px] text-text3 hover:text-dark transition-colors">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Hosts
      </Link>

      {/* Section A — Host Details */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img src={`${photoUrl}?w=96&h=96&fit=crop&auto=format`} alt="" className="size-16 rounded-2xl object-cover" />
            ) : (
              <div className="size-16 rounded-2xl bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[20px] font-bold">
                {initials}
              </div>
            )}
            <div>
              <h1 className="font-display text-[24px] font-bold text-dark">{host.display_name}</h1>
              <p className="text-[13px] text-text3 mt-0.5">{host.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <HostFormModal
              mode="edit"
              hostId={host.id}
              initialName={host.display_name ?? ""}
              initialEmail={host.email ?? ""}
              initialPhone={host.phone ?? ""}
              triggerLabel="Edit"
              triggerClassName="px-4 py-2 text-[13px] font-semibold rounded-xl border border-border text-dark hover:bg-[#F5F3F0] transition-colors"
            />
            <DeleteHostButton hostId={host.id} hostName={host.display_name ?? "this host"} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
          <div>
            <p className="text-text3">Phone</p>
            <p className="font-medium text-dark">{host.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-text3">Slug</p>
            <p className="font-medium text-dark">{host.slug ?? "—"}</p>
          </div>
          <div>
            <p className="text-text3">City</p>
            <p className="font-medium text-dark">{host.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-text3">Website</p>
            <p className="font-medium text-dark truncate">{host.website_url ?? "—"}</p>
          </div>
          <div>
            <p className="text-text3">Created</p>
            <p className="font-medium text-dark">{new Date(host.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div>
            <p className="text-text3">User ID</p>
            <p className="font-medium text-dark font-mono text-[11px] truncate">{host.user_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#F0EDE8]">
          {host.slug && (
            <Link href={`/hosts/${host.slug}`} className="text-[13px] font-medium text-amber hover:underline">
              Public profile →
            </Link>
          )}
          {host.sanity_host_id && (
            <a href={`${sanityStudioUrl}/structure/host;${host.sanity_host_id}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-purple hover:underline">
              Edit in Sanity →
            </a>
          )}
        </div>
      </div>

      {/* Section B — Assigned Listings */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[16px] font-bold text-dark">
            Assigned Listings <span className="text-text3 font-normal">({assignedListings.length})</span>
          </h2>
          {assignedListings.length > 0 && <SyncListingsButton hostId={id} />}
        </div>

        {assignedListings.length === 0 ? (
          <p className="text-[13px] text-text3">No listings assigned to this host.</p>
        ) : (
          <div className="space-y-3">
            {assignedListings.map((listing) => {
              const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
              const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
              return (
                <div key={listing._id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-dark truncate">{listing.title}</p>
                    <p className="text-[11px] text-text3">
                      {listing.type} · {listing.city ?? "—"}
                      {listing.isVerified && <span className="ml-2 text-green">✓ Verified</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/${typeSlug}/${citySlug}/${listing.slug}`}
                      className="text-[12px] font-medium text-amber hover:underline"
                    >
                      View
                    </Link>
                    {isRestaurant(listing) && (() => {
                      const menu = menus.find((m) => m.slug === listing.slug || m.listing_slug === listing.slug);
                      return menu ? (
                        <Link
                          href={`/admin/hosts/${id}/menu/${menu.id}`}
                          className="text-[12px] font-medium text-teal hover:underline"
                        >
                          Menu
                        </Link>
                      ) : null;
                    })()}
                    {isStay(listing) && (() => {
                      const propId = propertyIdBySlug.get(listing.slug);
                      return propId ? (
                        <Link
                          href={`/dashboard/property/${propId}`}
                          className="text-[12px] font-medium text-teal hover:underline"
                        >
                          Dashboard ↗
                        </Link>
                      ) : null;
                    })()}
                    <a
                      href={`${sanityStudioUrl}/structure/listing;${listing._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-purple hover:underline"
                    >
                      Sanity
                    </a>
                    <HostListingActions
                      hostId={id}
                      sanityId={listing._id}
                      listingTitle={listing.title}
                      isVerified={listing.isVerified}
                      action="unassign"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section C — Menu Management (restaurants only) */}
      {menus.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm p-6">
          <h2 className="font-display text-[16px] font-bold text-dark mb-4">
            Menu Management <span className="text-text3 font-normal">({menus.length})</span>
          </h2>
          <div className="space-y-3">
            {menus.map((menu) => (
              <div key={menu.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-dark truncate">{menu.display_name ?? menu.slug}</p>
                  <p className="text-[11px] text-text3 font-mono">/m/{menu.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {menu.is_published ? (
                    <span className="text-[10px] font-bold text-green bg-green/8 px-2 py-0.5 rounded-full">Live</span>
                  ) : (
                    <span className="text-[10px] font-bold text-text3 bg-surface px-2 py-0.5 rounded-full">Draft</span>
                  )}
                  {menu.reservations_enabled && (
                    <span className="text-[10px] font-bold text-[#7C3AED] bg-[#7C3AED]/8 px-2 py-0.5 rounded-full">Reservations</span>
                  )}
                  <Link
                    href={`/admin/hosts/${id}/menu/${menu.id}`}
                    className="text-[12px] font-semibold text-amber hover:underline"
                  >
                    Edit menu
                  </Link>
                  {menu.listing_slug && listingIdBySlug.has(menu.listing_slug) && (
                    <Link
                      href={`/dashboard/listings/${listingIdBySlug.get(menu.listing_slug)}/reservations`}
                      className="text-[12px] font-semibold text-[#7C3AED] hover:underline"
                    >
                      Dashboard ↗
                    </Link>
                  )}
                  {menu.is_published && (
                    <Link
                      href={`/m/${menu.slug}`}
                      target="_blank"
                      className="text-[12px] font-medium text-text3 hover:text-dark transition-colors"
                    >
                      View ↗
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section D — Assign a Listing */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-dark mb-4">
          Assign a Listing
        </h2>
        <HostListingActions
          hostId={id}
          hostName={host.display_name ?? "Host"}
          action="search"
        />
      </div>
    </div>
  );
}
