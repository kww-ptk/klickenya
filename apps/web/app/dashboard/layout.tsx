import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanityClient } from "@/lib/sanity/client";
import { DashboardNavLink } from "./_components/DashboardNavLink";
import { DashboardSignOut } from "./_components/DashboardSignOut";
import { DashboardBottomNav } from "./_components/DashboardBottomNav";
import { DashboardMobileHeader } from "./_components/DashboardMobileHeader";
import { adminClient } from "@/lib/supabase/admin";
import { getAuthUser, getUserProfile, getHostProfile } from "./_lib/auth";

/* ---------- SVG Icons ---------- */

function DashboardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3M2.25 18V6a2.25 2.25 0 012.25-2.25h15A2.25 2.25 0 0121.75 6v12A2.25 2.25 0 0119.5 20.25h-15A2.25 2.25 0 012.25 18z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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

function MenuIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

/* ---------- Layout ---------- */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  // Parallel: fetch user profile + host profile together
  const [profile, hostProfile] = await Promise.all([
    getUserProfile(user.id),
    getHostProfile(user.id),
  ]);

  // Parallel: fetch photo + enquiry count together (both depend on hostProfile)
  let photoUrl: string | null = null;
  let enquiryCount = 0;

  if (hostProfile?.sanity_host_id) {
    const [photoResult, enquiryResult] = await Promise.allSettled([
      sanityClient.fetch<{ photo?: { asset?: { url?: string } } } | null>(
        `*[_type == "host" && _id == $id][0]{ photo{ asset->{ url } } }`,
        { id: hostProfile.sanity_host_id }
      ),
      (async () => {
        const listingIds = await sanityClient.fetch<string[]>(
          `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)]._id`,
          { hostId: user.id, sanityHostId: hostProfile.sanity_host_id }
        );
        if (listingIds.length === 0) return 0;
        const { count } = await adminClient
          .from("contact_requests")
          .select("id", { count: "exact", head: true })
          .in("listing_sanity_id", listingIds)
          .eq("status", "new");
        return count ?? 0;
      })(),
    ]);
    if (photoResult.status === "fulfilled") {
      photoUrl = photoResult.value?.photo?.asset?.url ?? null;
    }
    if (enquiryResult.status === "fulfilled") {
      enquiryCount = enquiryResult.value;
    }
  }

  // Check if the user has any guest activity (bookings or enquiries as a guest)
  let hasGuestActivity = false;
  const [guestBookingRes, guestEnquiryRes] = await Promise.allSettled([
    (async () => {
      const supabase = await createClient();
      const { count } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("guest_user_id", user.id);
      return count ?? 0;
    })(),
    (async () => {
      const supabase = await createClient();
      const { count } = await supabase
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("guest_user_id", user.id);
      return count ?? 0;
    })(),
  ]);
  if (
    (guestBookingRes.status === "fulfilled" && guestBookingRes.value > 0) ||
    (guestEnquiryRes.status === "fulfilled" && guestEnquiryRes.value > 0)
  ) {
    hasGuestActivity = true;
  }

  const displayName = hostProfile?.display_name ?? profile?.full_name ?? "Host";
  const planTier = hostProfile?.plan_tier ?? "basic";
  const showPasswordBanner = profile?.role === "host" && hostProfile?.password_changed === false;

  const initials = displayName
    .split(/\s+/)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const planColor =
    planTier === "pro" || planTier === "agency"
      ? "bg-[#6B2D8B]/15 text-[#6B2D8B]"
      : planTier === "grow"
        ? "bg-[#0D7377]/15 text-[#0D7377]"
        : "bg-[#E8A020]/15 text-[#E8A020]";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, visible on desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[240px] bg-[#16130C] flex-col">
        {/* Back to website */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-4 py-3 border-b border-white/10 text-[#9C9485] hover:text-white transition-colors"
        >
          <span className="shrink-0 size-5">
            <GlobeIcon />
          </span>
          <span className="hidden lg:inline text-[13px] font-medium">
            Back to Klickenya
          </span>
        </Link>

        {/* Host profile */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="shrink-0 size-10 rounded-full bg-gradient-to-br from-[#E8A020] to-[#6B2D8B] flex items-center justify-center text-white text-[14px] font-bold overflow-hidden">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={displayName}
                width={40}
                height={40}
                className="size-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-[14px] font-semibold text-white truncate">
              {displayName}
            </p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${planColor}`}>
              {planTier}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          <DashboardNavLink
            href="/dashboard"
            label="Dashboard"
            icon={<DashboardIcon />}
          />
          <DashboardNavLink
            href="/dashboard/listings"
            label="My Listings"
            icon={<BuildingIcon />}
          />
          <DashboardNavLink
            href="/dashboard/property"
            label="Property PMS"
            icon={<HomeIcon />}
          />
          <DashboardNavLink
            href="/dashboard/menus"
            label="Menu"
            icon={<MenuIcon />}
          />
          <DashboardNavLink
            href="/dashboard/stats"
            label="Stats"
            icon={<ChartIcon />}
          />
          <DashboardNavLink
            href="/dashboard/events"
            label="My Events"
            icon={<CalendarIcon />}
          />
          <DashboardNavLink
            href="/dashboard/enquiries"
            label="Enquiries"
            icon={<InboxIcon />}
            badge={enquiryCount}
          />
          <DashboardNavLink
            href="/dashboard/profile/edit"
            label="Edit Profile"
            icon={<UserIcon />}
          />
          <DashboardNavLink
            href="/dashboard/settings"
            label="Settings"
            icon={<GearIcon />}
          />
          {hasGuestActivity && (
            <>
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-white/30">My Stays</p>
              </div>
              <DashboardNavLink
                href="/dashboard/guest/enquiries"
                label="My Enquiries"
                icon={<InboxIcon />}
              />
              <DashboardNavLink
                href="/dashboard/guest/bookings"
                label="My Bookings"
                icon={<HomeIcon />}
              />
            </>
          )}
        </nav>

        {/* Bottom: guest profile + password banner + sign out */}
        <div className="border-t border-white/10 px-4 py-4 space-y-3">
          <Link
            href="/profile"
            className="flex items-center gap-2 text-[12px] text-[#9C9485] hover:text-white transition-colors"
          >
            <span className="shrink-0 size-4">
              <UserIcon />
            </span>
            <span className="hidden lg:inline">Guest Profile</span>
          </Link>
          {showPasswordBanner && (
            <Link
              href="/reset-password"
              className="flex items-center gap-2 text-[12px] text-[#E8A020] hover:text-[#F5C842] transition-colors"
            >
              <span className="shrink-0 size-4">
                <LockIcon />
              </span>
              <span className="hidden lg:inline">Set password</span>
            </Link>
          )}
          {profile?.email && (
            <p className="hidden lg:block text-[12px] text-[#9C9485] truncate">
              {profile.email}
            </p>
          )}
          <DashboardSignOut />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-[240px] min-h-screen bg-[#FAFAF8] min-w-0 overflow-x-hidden">
        <DashboardMobileHeader enquiryCount={enquiryCount} />
        <div className="p-5 pb-24 lg:p-8 lg:pb-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <DashboardBottomNav enquiryCount={enquiryCount} />
    </div>
  );
}
