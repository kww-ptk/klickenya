import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { HostFormModal } from "./HostFormModal";

export const revalidate = 0;

export default async function AdminHostsPage() {
  const { data: hosts } = await adminClient
    .from("host_profiles")
    .select("id, user_id, display_name, email, phone, slug, created_at, sanity_host_id")
    .order("created_at", { ascending: false });

  const allHosts = hosts ?? [];

  // Fetch listing counts per host from Sanity
  const hostUserIds = allHosts.map((h) => h.user_id).filter(Boolean);
  let listingCountMap = new Map<string, number>();

  if (hostUserIds.length > 0) {
    const counts = await sanityClient.fetch<{ hostId: string; count: number }[]>(
      `*[_type == "listing" && hostId in $ids]{
        "hostId": hostId
      } | order(hostId) {
        "hostId": hostId,
        "count": count(hostId)
      }`,
      { ids: hostUserIds }
    ).catch(() => [] as { hostId: string }[]);

    // Count manually since GROQ aggregation is limited
    for (const item of counts) {
      if (item.hostId) {
        listingCountMap.set(item.hostId, (listingCountMap.get(item.hostId) ?? 0) + 1);
      }
    }
  }

  // Fetch Sanity host photos
  const sanityHostIds = allHosts.map((h) => h.sanity_host_id).filter(Boolean);
  let photoMap = new Map<string, string>();
  if (sanityHostIds.length > 0) {
    const photos = await sanityClient.fetch<{ _id: string; photoUrl: string | null }[]>(
      `*[_type == "host" && _id in $ids]{ _id, "photoUrl": photo.asset->url }`,
      { ids: sanityHostIds }
    ).catch(() => []);
    for (const p of photos) {
      if (p.photoUrl) photoMap.set(p._id, p.photoUrl);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-[28px] font-bold text-dark">Hosts</h1>
            <span className="text-[12px] font-semibold text-text3 bg-[#F0EDE8] px-2 py-0.5 rounded-full">{allHosts.length}</span>
          </div>
          <p className="text-[13px] text-text3 mt-1">All host accounts — view assigned listings, manage menus, and control feature access.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text3">{allHosts.length} total</span>
          <HostFormModal
            mode="create"
            triggerLabel="+ Create Host"
            triggerClassName="px-4 py-2 text-[13px] font-semibold rounded-xl bg-amber text-white hover:bg-[#d4911c] transition-colors"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        {allHosts.length === 0 ? (
          <p className="px-6 py-12 text-center text-[13px] text-text3">
            No hosts yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F0EDE8] text-text3">
                  <th className="px-6 py-3 font-medium">Host</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Listings</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                  <th className="px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {allHosts.map((host) => {
                  const photoUrl = host.sanity_host_id ? photoMap.get(host.sanity_host_id) : null;
                  const listingCount = listingCountMap.get(host.user_id) ?? 0;
                  const initials = (host.display_name ?? "?")
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={host.id} className="hover:bg-[#F7F5F2] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          {photoUrl ? (
                            <img
                              src={`${photoUrl}?w=64&h=64&fit=crop&auto=format`}
                              alt=""
                              className="size-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-8 rounded-full bg-gradient-to-br from-amber to-purple flex items-center justify-center text-white text-[10px] font-bold">
                              {initials}
                            </div>
                          )}
                          <span className="font-medium text-dark">{host.display_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-text3">{host.email ?? "—"}</td>
                      <td className="px-6 py-3 text-text3">{host.phone ?? "—"}</td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-dark">{listingCount}</span>
                      </td>
                      <td className="px-6 py-3 text-text3">
                        {new Date(host.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/admin/hosts/${host.id}`} className="text-amber font-medium hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
