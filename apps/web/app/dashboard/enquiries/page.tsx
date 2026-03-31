import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const sp = await searchParams;
  const filterListingId = sp.listing ?? null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("user_id, sanity_host_id")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile) redirect("/dashboard");

  // Get all listing _ids owned by this host from Sanity
  const listingIds = await sanityClient.fetch<string[]>(
    `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)]._id`,
    { hostId: hostProfile.user_id, sanityHostId: hostProfile.sanity_host_id ?? "" }
  );

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
    status: string;
    created_at: string;
  }[] = [];

  if (listingIds.length > 0) {
    let query = adminClient
      .from("contact_requests")
      .select("id, full_name, email, phone, message, listing_title, listing_type, listing_sanity_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filterListingId && listingIds.includes(filterListingId)) {
      query = query.eq("listing_sanity_id", filterListingId);
    } else {
      query = query.in("listing_sanity_id", listingIds);
    }

    const { data } = await query;
    enquiries = data ?? [];
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
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            Enquiries
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            {filterTitle
              ? <>{enquiries.length} enquir{enquiries.length === 1 ? "y" : "ies"} for {filterTitle}</>
              : <>{enquiries.length} enquir{enquiries.length === 1 ? "y" : "ies"} across your listings</>
            }
          </p>
        </div>
        {filterListingId && (
          <Link
            href="/dashboard/enquiries"
            className="text-[13px] font-medium text-[#E8A020] hover:underline"
          >
            View all →
          </Link>
        )}
      </div>

      {enquiries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2DDD5] p-12 text-center shadow-sm">
          <div className="w-20 h-20 rounded-full bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[36px]">📬</span>
          </div>
          <p className="font-display text-[18px] font-bold text-[#16130C] mb-1">
            No enquiries yet
          </p>
          <p className="text-[14px] text-[#9C9485] max-w-[280px] mx-auto">
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

            return (
              <Link
                key={e.id}
                href={`/dashboard/enquiries/${e.id}`}
                className="block bg-white rounded-xl lg:rounded-2xl border border-[#E2DDD5] p-4 lg:p-5 shadow-sm hover:shadow-md hover:border-[#E8A020]/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#16130C] truncate">
                        {e.full_name}
                      </p>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        e.status === "new"
                          ? "bg-[#E8A020]/10 text-[#E8A020]"
                          : e.status === "replied"
                            ? "bg-[#16A34A]/10 text-[#16A34A]"
                            : "bg-[#F4F1EC] text-[#9C9485]"
                      }`}>
                        {e.status}
                      </span>
                    </div>
                    {e.listing_title && (
                      <p className="text-[12px] text-[#9C9485] mt-0.5">
                        {e.listing_type && <span className="capitalize">{e.listing_type} · </span>}
                        {e.listing_title}
                      </p>
                    )}
                    {e.message && (
                      <p className="text-[13px] text-[#5E5848] mt-2 line-clamp-2">{e.message}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[12px] text-[#E8A020] font-medium">
                        {e.email}
                      </span>
                      <span className="text-[12px] text-[#9C9485]">
                        {e.phone}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-[#9C9485]">{date}</p>
                      <p className="text-[11px] text-[#9C9485]">{time}</p>
                    </div>
                    <svg className="size-4 text-[#9C9485]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
