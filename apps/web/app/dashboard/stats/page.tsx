import { redirect } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { StatsClient } from "./StatsClient";
import { getAuthUser, getHostProfile } from "../_lib/auth";

export const revalidate = 0;

export default async function DashboardStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseInt(sp.range ?? "30", 10);
  const days = [7, 30, 90].includes(range) ? range : 30;

  const { user } = await getAuthUser();
  if (!user) redirect("/login");

  const hostProfile = await getHostProfile(user.id);
  if (!hostProfile) redirect("/dashboard");

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // Parallel: fetch Sanity listings + Supabase events together
  const [listings, { data: events }] = await Promise.all([
    sanityClient.fetch<{ slug: string; title: string }[]>(
      `*[_type == "listing" && (hostId == $hostId || host._ref == $sanityHostId)] | order(title asc) {
        "slug": slug.current, title
      }`,
      { hostId: hostProfile.user_id, sanityHostId: hostProfile.sanity_host_id ?? "" }
    ).catch(() => [] as { slug: string; title: string }[]),
    adminClient
      .from("listing_events")
      .select("listing_slug, event_type, referrer, device, created_at")
      .eq("host_user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  const slugToTitle = new Map(listings.map((l) => [l.slug, l.title]));

  const allEvents = events ?? [];

  // Aggregate stats
  const totalViews = allEvents.filter((e) => e.event_type === "page_view").length;
  const totalContactClicks = allEvents.filter((e) => e.event_type === "contact_click").length;
  const totalContactSent = allEvents.filter((e) => e.event_type === "contact_sent").length;
  const conversionRate = totalViews > 0 ? ((totalContactSent / totalViews) * 100).toFixed(1) : "0";

  // Per-listing breakdown
  const listingMap = new Map<string, { views: number; clicks: number; sent: number; phone: number; topReferrer: string }>();
  const referrerCount = new Map<string, number>();

  for (const e of allEvents) {
    const slug = e.listing_slug;
    if (!listingMap.has(slug)) {
      listingMap.set(slug, { views: 0, clicks: 0, sent: 0, phone: 0, topReferrer: "" });
    }
    const entry = listingMap.get(slug)!;
    if (e.event_type === "page_view") entry.views++;
    if (e.event_type === "contact_click") entry.clicks++;
    if (e.event_type === "contact_sent") entry.sent++;
    if (e.event_type === "phone_click") entry.phone++;

    // Referrer tracking
    if (e.referrer) {
      try {
        const domain = new URL(e.referrer).hostname.replace("www.", "");
        referrerCount.set(domain, (referrerCount.get(domain) ?? 0) + 1);
      } catch {
        referrerCount.set("direct", (referrerCount.get("direct") ?? 0) + 1);
      }
    } else {
      referrerCount.set("direct", (referrerCount.get("direct") ?? 0) + 1);
    }
  }

  const perListing = Array.from(listingMap.entries()).map(([slug, stats]) => ({
    slug,
    title: slugToTitle.get(slug) ?? slug,
    ...stats,
  })).sort((a, b) => b.views - a.views);

  // Daily views for bar chart
  const dailyViews: { date: string; count: number }[] = [];
  const viewsByDay = new Map<string, number>();
  for (const e of allEvents) {
    if (e.event_type !== "page_view") continue;
    const day = e.created_at.slice(0, 10);
    viewsByDay.set(day, (viewsByDay.get(day) ?? 0) + 1);
  }
  // Fill in all days in range
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    dailyViews.push({ date: key, count: viewsByDay.get(key) ?? 0 });
  }

  // Top referrers
  const topReferrers = Array.from(referrerCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Device split
  const deviceCount = { mobile: 0, desktop: 0, tablet: 0 };
  for (const e of allEvents) {
    if (e.device === "mobile") deviceCount.mobile++;
    else if (e.device === "tablet") deviceCount.tablet++;
    else deviceCount.desktop++;
  }
  const total = allEvents.length || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
            Stats
          </h1>
          <p className="text-[13px] text-[#9C9485] mt-0.5">
            Last {days} days across {listings.length} listing{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[#E2DDD5] p-1">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/dashboard/stats?range=${d}`}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${
                days === d ? "bg-[#E8A020] text-white" : "text-[#9C9485] hover:bg-[#F5F3F0]"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Page Views", value: totalViews, color: "text-[#16130C]" },
          { label: "Contact Clicks", value: totalContactClicks, color: "text-[#E8A020]" },
          { label: "Forms Sent", value: totalContactSent, color: "text-[#6B2D8B]" },
          { label: "Conversion", value: `${conversionRate}%`, color: "text-[#22C55E]" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E2DDD5] p-4 text-center">
            <p className={`font-display text-[24px] font-bold tracking-[-0.02em] ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-[#9C9485] font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <StatsClient
        perListing={perListing}
        dailyViews={dailyViews}
        topReferrers={topReferrers}
        deviceSplit={{
          mobile: Math.round((deviceCount.mobile / total) * 100),
          desktop: Math.round((deviceCount.desktop / total) * 100),
          tablet: Math.round((deviceCount.tablet / total) * 100),
        }}
      />
    </div>
  );
}
