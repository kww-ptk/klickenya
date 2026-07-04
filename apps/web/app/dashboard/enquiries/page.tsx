import { redirect } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { getAuthUser, getHostProfile } from "../_lib/auth";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const sp = await searchParams;
  const filterListingId = sp.listing ?? null;
  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const hostProfile = await getHostProfile(user.id);

  if (!hostProfile) redirect("/dashboard");

  // Get all listing _ids owned by this host from Sanity (marketplace-linked listings)
  const listingIds = await sanityClient.fetch<string[]>(
    `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)]._id`,
    { hostId: hostProfile.user_id, sanityHostId: hostProfile.sanity_host_id ?? "" }
  );

  // Get all property ids owned by this host from Supabase (PMS + resort embeds).
  // Decoupled from Sanity so embed enquiries appear even when a property has no
  // marketplace listing (e.g. resorts that keep their own website).
  const { data: ownedProps } = await adminClient
    .from("properties")
    .select("id")
    .eq("owner_id", hostProfile.user_id);
  const propertyIds = (ownedProps ?? []).map((p) => p.id);

  // Fetch enquiries for those listings
  let enquiries: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    message: string | null;
    listing_title: string | null;
    listing_type: string | null;
    listing_sanity_id: string | null;
    property_id: string | null;
    status: string;
    created_at: string;
    check_in: string | null;
    check_out: string | null;
    guests: number | null;
    calendar_status: string | null;
    notes: string | null;
  }[] = [];

  const SELECT =
    "id, full_name, email, phone, message, listing_title, listing_type, listing_sanity_id, property_id, status, created_at, check_in, check_out, guests, calendar_status, notes";

  if (filterListingId && listingIds.includes(filterListingId)) {
    // Filtered to one marketplace listing — unchanged behaviour.
    const { data } = await adminClient
      .from("contact_requests")
      .select(SELECT)
      .eq("listing_sanity_id", filterListingId)
      .order("created_at", { ascending: false })
      .limit(50);
    enquiries = data ?? [];
  } else if (listingIds.length > 0 || propertyIds.length > 0) {
    // Two separate queries (avoids .or() quoting issues with Sanity ids), then
    // merge + de-dupe by id and keep the newest 50.
    const [byListing, byProperty] = await Promise.all([
      listingIds.length
        ? adminClient.from("contact_requests").select(SELECT).in("listing_sanity_id", listingIds).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as typeof enquiries }),
      propertyIds.length
        ? adminClient.from("contact_requests").select(SELECT).in("property_id", propertyIds).order("created_at", { ascending: false }).limit(50)
        : Promise.resolve({ data: [] as typeof enquiries }),
    ]);
    const seen = new Set<string>();
    enquiries = [...(byListing.data ?? []), ...(byProperty.data ?? [])]
      .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 50);
  }

  // Get the listing title for filter display
  let filterTitle: string | null = null;
  if (filterListingId && enquiries.length > 0) {
    filterTitle = enquiries[0]?.listing_title ?? null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-dark">
            Enquiries
          </h1>
          <p className="text-[13px] text-text3 mt-0.5">
            Guest messages and booking requests for your listings — reply, convert to booking, or close.{" "}{filterTitle
              ? <>{enquiries.length} enquir{enquiries.length === 1 ? "y" : "ies"} for {filterTitle}</>
              : <>{enquiries.length} enquir{enquiries.length === 1 ? "y" : "ies"} across your listings</>
            }
          </p>
        </div>
        {filterListingId && (
          <Link
            href="/dashboard/enquiries"
            className="text-[13px] font-medium text-amber hover:underline"
          >
            View all →
          </Link>
        )}
      </div>

      {enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[36px]">📬</span>
          </div>
          <p className="font-display text-[18px] font-bold text-dark mb-1">
            No enquiries yet
          </p>
          <p className="text-[14px] text-text3 max-w-[280px] mx-auto">
            When guests contact you about your listings, their enquiries will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((e) => {
            const date = new Date(e.created_at).toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric",
            });
            const time = new Date(e.created_at).toLocaleTimeString("en-GB", {
              hour: "2-digit", minute: "2-digit",
            });

            // Date range + nights
            const fmtD = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            const nights = e.check_in && e.check_out
              ? Math.max(1, Math.ceil((new Date(e.check_out + "T00:00:00").getTime() - new Date(e.check_in + "T00:00:00").getTime()) / 86400000))
              : null;

            // Parse estimated total from notes JSON if present
            let estimatedTotal: number | null = null;
            if (e.notes) {
              try {
                const match = e.notes.match(/"estimatedTotal"\s*:\s*(\d+)/);
                if (match) estimatedTotal = parseInt(match[1], 10);
              } catch { /* ignore */ }
            }

            // calendar_status badge
            const calBadge = e.calendar_status
              ? e.calendar_status === "pending"
                ? { label: "Pending", cls: "bg-amber/10 text-amber" }
                : e.calendar_status === "converted"
                  ? { label: "Converted", cls: "bg-green/10 text-green" }
                  : e.calendar_status === "declined"
                    ? { label: "Declined", cls: "bg-surface text-text3" }
                    : e.calendar_status === "held"
                      ? { label: "On hold", cls: "bg-[#EFF6FF] text-[#3B82F6]" }
                      : null
              : null;

            return (
              <Link
                key={e.id}
                href={`/dashboard/enquiries/${e.id}`}
                className="block bg-white rounded-xl lg:rounded-2xl border border-border p-4 lg:p-5 shadow-sm hover:shadow-md hover:border-amber/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-semibold text-dark truncate">
                        {e.full_name}
                      </p>
                      {calBadge && (
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${calBadge.cls}`}>
                          {calBadge.label}
                        </span>
                      )}
                      {!calBadge && (
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          e.status === "new"
                            ? "bg-amber/10 text-amber"
                            : e.status === "replied"
                              ? "bg-green/10 text-green"
                              : "bg-surface text-text3"
                        }`}>
                          {e.status}
                        </span>
                      )}
                    </div>
                    {e.listing_title && (
                      <p className="text-[12px] text-text3 mt-0.5">
                        {e.listing_type && <span className="capitalize">{e.listing_type} · </span>}
                        {e.listing_title}
                      </p>
                    )}
                    {/* Dates + guests */}
                    {e.check_in && e.check_out && (
                      <p className="text-[12px] text-text2 mt-1.5 flex items-center gap-1">
                        <span>📅</span>
                        <span>{fmtD(e.check_in)} → {fmtD(e.check_out)} · {nights} night{nights !== 1 ? "s" : ""}{e.guests ? ` · ${e.guests} guest${e.guests !== 1 ? "s" : ""}` : ""}</span>
                        {estimatedTotal && (
                          <span className="ml-2 font-semibold text-amber">Est. KSh {estimatedTotal.toLocaleString()}</span>
                        )}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[12px] text-amber font-medium">
                        {e.email}
                      </span>
                      <span className="text-[12px] text-text3">
                        {e.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-text3">{date}</p>
                      <p className="text-[11px] text-text3">{time}</p>
                    </div>
                    <svg className="size-4 text-text3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
