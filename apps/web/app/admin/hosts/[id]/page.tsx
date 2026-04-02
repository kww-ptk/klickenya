import { notFound } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityPreviewClient as sanityClient } from "@/lib/sanity/client";
import { HostListingActions } from "./HostListingActions";

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

  // Fetch assigned listings from Sanity
  const assignedListings = await sanityClient.fetch<
    { _id: string; title: string; type: string; city: string | null; slug: string; isVerified: boolean }[]
  >(
    `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)] | order(_createdAt desc) {
      _id, title, type, city, "slug": slug.current, isVerified
    }`,
    { hostId: host.user_id, sanityHostId: host.sanity_host_id ?? "" }
  ).catch(() => []);

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
      <Link href="/admin/hosts" className="inline-flex items-center gap-1.5 text-[13px] text-[#9C9485] hover:text-[#16130C] transition-colors">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Hosts
      </Link>

      {/* Section A — Host Details */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          {photoUrl ? (
            <img src={`${photoUrl}?w=96&h=96&fit=crop&auto=format`} alt="" className="size-16 rounded-2xl object-cover" />
          ) : (
            <div className="size-16 rounded-2xl bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[20px] font-bold">
              {initials}
            </div>
          )}
          <div>
            <h1 className="font-display text-[24px] font-bold text-[#16130C]">{host.display_name}</h1>
            <p className="text-[13px] text-[#9C9485] mt-0.5">{host.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[13px]">
          <div>
            <p className="text-[#9C9485]">Phone</p>
            <p className="font-medium text-[#16130C]">{host.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#9C9485]">Slug</p>
            <p className="font-medium text-[#16130C]">{host.slug ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#9C9485]">City</p>
            <p className="font-medium text-[#16130C]">{host.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#9C9485]">Website</p>
            <p className="font-medium text-[#16130C] truncate">{host.website_url ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#9C9485]">Created</p>
            <p className="font-medium text-[#16130C]">{new Date(host.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div>
            <p className="text-[#9C9485]">User ID</p>
            <p className="font-medium text-[#16130C] font-mono text-[11px] truncate">{host.user_id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-5 border-t border-[#F0EDE8]">
          {host.slug && (
            <Link href={`/hosts/${host.slug}`} className="text-[13px] font-medium text-[#E8A020] hover:underline">
              Public profile →
            </Link>
          )}
          {host.sanity_host_id && (
            <a href={`${sanityStudioUrl}/structure/host;${host.sanity_host_id}`} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-[#6B2D8B] hover:underline">
              Edit in Sanity →
            </a>
          )}
        </div>
      </div>

      {/* Section B — Assigned Listings */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-4">
          Assigned Listings <span className="text-[#9C9485] font-normal">({assignedListings.length})</span>
        </h2>

        {assignedListings.length === 0 ? (
          <p className="text-[13px] text-[#9C9485]">No listings assigned to this host.</p>
        ) : (
          <div className="space-y-3">
            {assignedListings.map((listing) => {
              const typeSlug = listing.type === "experience" ? "experiences" : listing.type + "s";
              const citySlug = (listing.city ?? "").toLowerCase().replace(/ /g, "-");
              return (
                <div key={listing._id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#F0EDE8] hover:bg-[#F7F5F2] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#16130C] truncate">{listing.title}</p>
                    <p className="text-[11px] text-[#9C9485]">
                      {listing.type} · {listing.city ?? "—"}
                      {listing.isVerified && <span className="ml-2 text-[#16A34A]">✓ Verified</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/${typeSlug}/${citySlug}/${listing.slug}`}
                      className="text-[12px] font-medium text-[#E8A020] hover:underline"
                    >
                      View
                    </Link>
                    <a
                      href={`${sanityStudioUrl}/structure/listing;${listing._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-[#6B2D8B] hover:underline"
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

      {/* Section C — Assign a Listing */}
      <div className="rounded-2xl bg-white shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-[#16130C] mb-4">
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
