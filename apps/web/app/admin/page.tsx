import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const revalidate = 0;

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

type ContactRequest = {
  id: string;
  notes?: string;
  full_name: string;
  phone: string;
  created_at: string;
  status: string;
};

type PropertyEnquiry = {
  id: string;
  property_title?: string;
  full_name: string;
  phone: string;
  created_at: string;
  status: string;
};

type ListingRequest = {
  id: string;
  name: string;
  draft_title?: string;
  business_name?: string;
  listing_type: string;
  email: string;
  created_at: string;
  status: string;
};

type ClaimRequest = {
  id: string;
  listing_title: string;
  listing_type: string;
  claimant_name: string;
  claimant_email: string;
  status: string;
  created_at: string;
};

type NewsletterSubscriber = {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
};

type GeneralContact = {
  id: string;
  name: string;
  subject: string;
  email: string;
  created_at: string;
};

type AmbassadorApplication = {
  id: string;
  name: string;
  role: string;
  city: string;
  created_at: string;
  status: string;
};

export default async function AdminDashboardPage() {
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // --- Fetch all data in parallel ---
  const [
    totalListings,
    publishedListings,
    contactRequestsThisWeek,
    respondedContactsThisWeek,
    propertyEnquiriesThisWeek,
    respondedEnquiriesThisWeek,
    totalBlogPosts,
    publishedBlogPosts,
    recentContacts,
    recentEnquiries,
    // New tables
    listingRequestsThisWeek,
    respondedListingReqsThisWeek,
    generalContactsThisWeek,
    ambassadorAppsThisWeek,
    approvedAmbassadorsThisWeek,
    recentListingRequests,
    recentGeneralContacts,
    recentAmbassadors,
    totalNewsletterSubs,
    recentNewsletterSubs,
    claimRequestsThisWeek,
    pendingClaimsCount,
    recentClaims,
    submittedListingReqsCount,
  ] = await Promise.all([
    // Sanity: total listings
    sanityClient.fetch<number>(`count(*[_type == "listing"])`),
    // Sanity: published listings
    sanityClient.fetch<number>(
      `count(*[_type == "listing" && status == "published"])`
    ),
    // Supabase: contact requests this week (total new)
    adminClient
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => count ?? 0),
    // Supabase: contact requests this week (responded)
    adminClient
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("status", "responded")
      .then(({ count }) => count ?? 0),
    // Supabase: property enquiries this week (total new)
    adminClient
      .from("property_enquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => count ?? 0),
    // Supabase: property enquiries this week (responded)
    adminClient
      .from("property_enquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("status", "responded")
      .then(({ count }) => count ?? 0),
    // Sanity: total blog posts
    sanityClient.fetch<number>(`count(*[_type == "blogPost"])`),
    // Sanity: published blog posts
    sanityClient.fetch<number>(
      `count(*[_type == "blogPost" && status == "published"])`
    ),
    // Supabase: recent 5 contact requests
    adminClient
      .from("contact_requests")
      .select("id, notes, full_name, phone, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as ContactRequest[]),
    // Supabase: recent 5 property enquiries
    adminClient
      .from("property_enquiries")
      .select("id, property_title, full_name, phone, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as PropertyEnquiry[]),
    // Listing requests this week
    adminClient
      .from("listing_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => count ?? 0),
    // Listing requests this week (responded)
    adminClient
      .from("listing_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("status", "responded")
      .then(({ count }) => count ?? 0),
    // General contacts this week
    adminClient
      .from("general_contacts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => count ?? 0),
    // Ambassador applications this week
    adminClient
      .from("ambassador_applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => count ?? 0),
    // Ambassador applications this week (approved)
    adminClient
      .from("ambassador_applications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .eq("status", "approved")
      .then(({ count }) => count ?? 0),
    // Recent 5 listing requests
    adminClient
      .from("listing_requests")
      .select("id, name, draft_title, business_name, listing_type, email, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as ListingRequest[]),
    // Recent 5 general contacts
    adminClient
      .from("general_contacts")
      .select("id, name, subject, email, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as GeneralContact[]),
    // Recent 5 ambassador applications
    adminClient
      .from("ambassador_applications")
      .select("id, name, role, city, created_at, status")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as AmbassadorApplication[]),
    // Total newsletter subscribers
    adminClient
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => count ?? 0),
    // Recent 10 newsletter subscribers
    adminClient
      .from("newsletter_subscribers")
      .select("id, email, source, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error?.code === "42703") {
          // source column doesn't exist yet — fetch without it
          return adminClient
            .from("newsletter_subscribers")
            .select("id, email, created_at")
            .order("created_at", { ascending: false })
            .limit(10)
            .then(({ data: d }) =>
              (d ?? []).map((r: Record<string, unknown>) => ({ ...r, source: null })) as NewsletterSubscriber[]
            );
        }
        return (data ?? []) as NewsletterSubscriber[];
      }),
    // Claim requests this week
    adminClient
      .from("claim_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo)
      .then(({ count }) => count ?? 0),
    // Pending claims
    adminClient
      .from("claim_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "verified"])
      .then(({ count }) => count ?? 0),
    // Recent 5 claims
    adminClient
      .from("claim_requests")
      .select("id, listing_title, listing_type, claimant_name, claimant_email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data ?? []) as ClaimRequest[]),
    // Listing requests awaiting admin review (submitted = OTP verified)
    adminClient
      .from("listing_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted")
      .then(({ count }) => count ?? 0),
  ]);

  const draftListings = totalListings - publishedListings;
  const draftBlogPosts = totalBlogPosts - publishedBlogPosts;
  const pendingContacts = contactRequestsThisWeek - respondedContactsThisWeek;
  const pendingEnquiries =
    propertyEnquiriesThisWeek - respondedEnquiriesThisWeek;
  const pendingListingReqs =
    listingRequestsThisWeek - respondedListingReqsThisWeek;
  const pendingAmbassadors =
    ambassadorAppsThisWeek - approvedAmbassadorsThisWeek;

  const sanityStudioUrl =
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? "/studio";

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <h1 className="font-display text-[28px] font-bold text-dark">
        Dashboard
      </h1>

      {/* Stats cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Listings */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {totalListings}
          </p>
          <p className="mt-1 text-[13px] text-text3">Total Listings</p>
          <p className="mt-1 text-[13px] text-text3">
            {publishedListings} published / {draftListings} draft
          </p>
        </div>

        {/* Contact Requests This Week */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {contactRequestsThisWeek}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            Contact Requests This Week
          </p>
          <p className="mt-1 text-[13px] text-text3">
            {respondedContactsThisWeek} responded / {pendingContacts} pending
          </p>
        </div>

        {/* Property Enquiries This Week */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {propertyEnquiriesThisWeek}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            Property Enquiries This Week
          </p>
          <p className="mt-1 text-[13px] text-text3">
            {respondedEnquiriesThisWeek} responded / {pendingEnquiries} pending
          </p>
        </div>

        {/* Blog Posts */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {totalBlogPosts}
          </p>
          <p className="mt-1 text-[13px] text-text3">Blog Posts</p>
          <p className="mt-1 text-[13px] text-text3">
            {publishedBlogPosts} published / {draftBlogPosts} draft
          </p>
        </div>
      </div>

      {/* New stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {/* Listing Requests This Week */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {listingRequestsThisWeek}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            Listing Requests This Week
          </p>
          {submittedListingReqsCount > 0 ? (
            <Link
              href="/admin/listing-requests?status=submitted"
              className="mt-1 inline-block text-[13px] font-semibold text-amber hover:underline"
            >
              {submittedListingReqsCount} awaiting review →
            </Link>
          ) : (
            <p className="mt-1 text-[13px] text-text3">
              {respondedListingReqsThisWeek} responded
            </p>
          )}
        </div>

        {/* General Contacts This Week */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {generalContactsThisWeek}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            General Contacts This Week
          </p>
        </div>

        {/* Ambassador Applications This Week */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {ambassadorAppsThisWeek}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            Ambassador Apps This Week
          </p>
          <p className="mt-1 text-[13px] text-text3">
            {approvedAmbassadorsThisWeek} approved / {pendingAmbassadors}{" "}
            pending
          </p>
        </div>

        {/* Newsletter Subscribers */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {totalNewsletterSubs}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            Newsletter Subscribers
          </p>
        </div>

        {/* Claim Requests */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="font-display text-[32px] font-bold text-dark">
            {claimRequestsThisWeek}
          </p>
          <p className="mt-1 text-[13px] text-text3">
            Claims This Week
          </p>
          <p className="mt-1 text-[13px] text-text3">
            {pendingClaimsCount} pending review
          </p>
        </div>
      </div>

      {/* Two side-by-side tables - original */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Contact Requests */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
            <h2 className="font-display text-[16px] font-bold text-dark">
              Recent Contact Requests
            </h2>
            <Link
              href="/admin/contact-requests"
              className="text-[12px] font-medium text-amber hover:text-[#C78A1A]"
            >
              View all
            </Link>
          </div>
          {recentContacts.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text3">
              No contact requests yet.
            </p>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {recentContacts.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-dark">
                      {req.notes?.match(/^Listing: (.+?)(?:\s*\(|$)/m)?.[1] ?? "General enquiry"}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text3">
                      {req.full_name} &middot; {req.phone}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-[13px] text-text3">
                      {formatDate(req.created_at)}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Property Enquiries */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
            <h2 className="font-display text-[16px] font-bold text-dark">
              Recent Property Enquiries
            </h2>
            <Link
              href="/admin/property-enquiries"
              className="text-[12px] font-medium text-amber hover:text-[#C78A1A]"
            >
              View all
            </Link>
          </div>
          {recentEnquiries.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text3">
              No property enquiries yet.
            </p>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {recentEnquiries.map((enq) => (
                <div
                  key={enq.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-dark">
                      {enq.property_title ?? "Property enquiry"}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text3">
                      {enq.full_name} &middot; {enq.phone}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-[13px] text-text3">
                      {formatDate(enq.created_at)}
                    </span>
                    <StatusBadge status={enq.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New tables row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Listing Requests */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
            <h2 className="font-display text-[16px] font-bold text-dark">
              Listing Requests
            </h2>
            <Link
              href="/admin/listing-requests"
              className="text-[12px] font-medium text-amber hover:text-[#C78A1A]"
            >
              View all
            </Link>
          </div>
          {recentListingRequests.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text3">
              No listing requests yet.
            </p>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {recentListingRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/admin/listing-requests/${req.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-[#F7F5F2] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-dark">
                      {req.draft_title || req.business_name || req.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text3">
                      {req.listing_type} &middot; {req.name}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-[13px] text-text3">
                      {formatDate(req.created_at)}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent General Contacts */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
            <h2 className="font-display text-[16px] font-bold text-dark">
              General Contacts
            </h2>
            <Link
              href="/admin/general-contacts"
              className="text-[12px] font-medium text-amber hover:text-[#C78A1A]"
            >
              View all
            </Link>
          </div>
          {recentGeneralContacts.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text3">
              No general contacts yet.
            </p>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {recentGeneralContacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/general-contacts/${c.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-[#F7F5F2] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-dark">
                      {c.subject}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text3">
                      {c.name} &middot; {c.email}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0">
                    <span className="text-[13px] text-text3">
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Ambassador Applications */}
        <div className="rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
            <h2 className="font-display text-[16px] font-bold text-dark">
              Ambassadors
            </h2>
            <Link
              href="/admin/ambassadors"
              className="text-[12px] font-medium text-amber hover:text-[#C78A1A]"
            >
              View all
            </Link>
          </div>
          {recentAmbassadors.length === 0 ? (
            <p className="px-6 py-8 text-center text-[13px] text-text3">
              No ambassador applications yet.
            </p>
          ) : (
            <div className="divide-y divide-[#F0EDE8]">
              {recentAmbassadors.map((a) => (
                <Link
                  key={a.id}
                  href={`/admin/ambassadors/${a.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-[#F7F5F2] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-dark">
                      {a.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-text3">
                      {a.role}
                      {a.city ? ` \u00b7 ${a.city}` : ""}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-[13px] text-text3">
                      {formatDate(a.created_at)}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Claim Requests */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
          <h2 className="font-display text-[16px] font-bold text-dark">
            Claim Requests
          </h2>
          <Link
            href="/admin/claims"
            className="text-[12px] font-medium text-amber hover:text-[#C78A1A]"
          >
            View all
          </Link>
        </div>
        {recentClaims.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-text3">
            No claim requests yet.
          </p>
        ) : (
          <div className="divide-y divide-[#F0EDE8]">
            {recentClaims.map((claim) => (
              <Link
                key={claim.id}
                href={`/admin/claims/${claim.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-[#F7F5F2] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-dark">
                    {claim.listing_title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-text3">
                    {claim.claimant_name} &middot; {claim.claimant_email}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  <span className="text-[13px] text-text3">
                    {formatDate(claim.created_at)}
                  </span>
                  <StatusBadge status={claim.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter Subscribers */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F0EDE8] px-6 py-4">
          <h2 className="font-display text-[16px] font-bold text-dark">
            Newsletter Subscribers
          </h2>
          <span className="text-[12px] text-text3">
            {totalNewsletterSubs} total
          </span>
        </div>
        {recentNewsletterSubs.length === 0 ? (
          <p className="px-6 py-8 text-center text-[13px] text-text3">
            No subscribers yet.
          </p>
        ) : (
          <div className="divide-y divide-[#F0EDE8]">
            {recentNewsletterSubs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-dark">
                    {sub.email}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  {sub.source && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      sub.source === "coming-soon"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {sub.source}
                    </span>
                  )}
                  <span className="text-[13px] text-text3">
                    {formatDate(sub.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={sanityStudioUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl bg-amber px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-amber/90"
        >
          Open Sanity Studio
        </a>
        <Link
          href="/admin/contact-requests"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:bg-[#F9F7F4]"
        >
          Contact requests
        </Link>
        <Link
          href="/admin/claims"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:bg-[#F9F7F4]"
        >
          Claim requests
        </Link>
        <Link
          href="/admin/listing-requests"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:bg-[#F9F7F4]"
        >
          Listing requests
        </Link>
        <Link
          href="/admin/general-contacts"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:bg-[#F9F7F4]"
        >
          General contacts
        </Link>
        <Link
          href="/admin/property-enquiries"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:bg-[#F9F7F4]"
        >
          Property enquiries
        </Link>
        <Link
          href="/admin/ambassadors"
          className="inline-flex items-center rounded-xl border border-border bg-white px-4 py-2.5 text-[13px] font-semibold text-dark transition-colors hover:bg-[#F9F7F4]"
        >
          Ambassadors
        </Link>
      </div>
    </div>
  );
}
