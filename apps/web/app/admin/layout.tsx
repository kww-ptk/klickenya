import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { AdminNavLink } from "./_components/AdminNavLink";
import { AdminSignOut } from "./_components/AdminSignOut";
import { AdminBottomNav } from "./_components/AdminBottomNav";

/* ---------- SVG icon components ---------- */

function DashboardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z"
      />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3M2.25 18V6a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 6v12A2.25 2.25 0 0119.5 20.25h-15A2.25 2.25 0 012.25 18z"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function BlogIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
      />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/* ---------- Layout ---------- */

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch unread counts (using adminClient to bypass RLS)
  const [contactRes, enquiryRes, listingReqRes, generalContactRes, ambassadorRes, claimRes, newsletterRes, eventsRes] = await Promise.all([
    adminClient
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    adminClient
      .from("property_enquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    adminClient
      .from("listing_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    adminClient
      .from("general_contacts")
      .select("id", { count: "exact", head: true }),
    adminClient
      .from("ambassador_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    adminClient
      .from("claim_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "verified"]),
    adminClient
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true }),
    adminClient
      .from("events_pending")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const unreadContacts = contactRes.count ?? 0;
  const unreadEnquiries = enquiryRes.count ?? 0;
  const unreadListingReqs = listingReqRes.count ?? 0;
  const unreadGeneralContacts = generalContactRes.count ?? 0;
  const unreadAmbassadors = ambassadorRes.count ?? 0;
  const pendingClaims = claimRes.count ?? 0;
  const totalSubscribers = newsletterRes.count ?? 0;
  const pendingEvents = eventsRes.count ?? 0;

  const sanityStudioUrl =
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "http://localhost:3333";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, visible on desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[240px] bg-[#16130C] flex-col">
        {/* Logo area */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
          <div className="shrink-0 size-8 rounded-lg bg-[#6B2D8B] flex items-center justify-center">
            <span className="text-white font-bold text-[15px]">k</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[18px] font-bold tracking-[-0.03em] text-white">
              klickenya
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#E8A020]/15 text-[#E8A020] text-[11px] font-semibold">
              Admin
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          <AdminNavLink
            href="/admin"
            label="Dashboard"
            icon={<DashboardIcon />}
          />
          <AdminNavLink
            href="/admin/contact-requests"
            label="Contact Requests"
            icon={<InboxIcon />}
            badge={unreadContacts}
          />
          <AdminNavLink
            href="/admin/listing-requests"
            label="Listing Requests"
            icon={<ClipboardIcon />}
            badge={unreadListingReqs}
          />
          <AdminNavLink
            href="/admin/general-contacts"
            label="General Contacts"
            icon={<EnvelopeIcon />}
            badge={unreadGeneralContacts}
          />
          <AdminNavLink
            href="/admin/property-enquiries"
            label="Property Enquiries"
            icon={<BuildingIcon />}
            badge={unreadEnquiries}
          />
          <AdminNavLink
            href="/admin/ambassadors"
            label="Ambassadors"
            icon={<MegaphoneIcon />}
            badge={unreadAmbassadors}
          />
          <AdminNavLink
            href="/admin/claims"
            label="Verification Requests"
            icon={<ShieldIcon />}
            badge={pendingClaims}
          />
          <AdminNavLink
            href="/admin/events"
            label="Events"
            icon={<CalendarIcon />}
            badge={pendingEvents}
          />
          <AdminNavLink
            href="/admin/hosts"
            label="Hosts"
            icon={<UsersIcon />}
          />
          <AdminNavLink
            href="/admin/analytics"
            label="Analytics"
            icon={<ChartIcon />}
          />
          <AdminNavLink
            href="/admin/newsletter"
            label="Subscribers"
            icon={<UsersIcon />}
            badge={totalSubscribers}
          />
          <AdminNavLink
            href="/admin/listings"
            label="Listings"
            icon={<ListIcon />}
          />
          <AdminNavLink
            href="/admin/real-estate"
            label="Real Estate"
            icon={<HomeIcon />}
          />
          <AdminNavLink
            href={sanityStudioUrl}
            label="Blog Posts"
            icon={<BlogIcon />}
            external
          />
          <AdminNavLink
            href="/admin/settings"
            label="Settings"
            icon={<GearIcon />}
          />
        </nav>

        {/* User / Sign out */}
        <div className="border-t border-white/10 px-4 py-4 space-y-2">
          {user?.email && (
            <p className="hidden lg:block text-[12px] text-[#9C9485] truncate">
              {user.email}
            </p>
          )}
          <AdminSignOut />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-[240px] min-h-screen bg-[#FAFAF8]">
        <div className="p-5 pb-24 lg:p-8 lg:pb-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <AdminBottomNav
        contactsCount={unreadContacts}
        listingReqsCount={unreadListingReqs}
        generalContactsCount={unreadGeneralContacts}
        enquiriesCount={unreadEnquiries}
        ambassadorsCount={unreadAmbassadors}
        claimsCount={pendingClaims}
        eventsCount={pendingEvents}
        subscribersCount={totalSubscribers}
      />
    </div>
  );
}
