import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { sanityClient } from "@/lib/sanity/client";
import { AnalyticsClient } from "./AnalyticsClient";

export const revalidate = 0;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseInt(sp.range ?? "30", 10);
  const days = [7, 30, 90].includes(range) ? range : 30;

  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 86400_000).toISOString();

  // Current period events
  const { data: events } = await adminClient
    .from("listing_events")
    .select("listing_slug, listing_type, event_type, city, referrer, device, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  // Previous period (for comparison)
  const { data: prevEvents } = await adminClient
    .from("listing_events")
    .select("event_type")
    .gte("created_at", prevSince)
    .lt("created_at", since);

  const allEvents = events ?? [];
  const allPrev = prevEvents ?? [];

  // Top-level stats
  const totalViews = allEvents.filter((e) => e.event_type === "page_view").length;
  const totalClicks = allEvents.filter((e) => e.event_type === "contact_click").length;
  const totalSent = allEvents.filter((e) => e.event_type === "contact_sent").length;
  const convRate = totalViews > 0 ? ((totalSent / totalViews) * 100).toFixed(1) : "0";
  const prevViews = allPrev.filter((e) => e.event_type === "page_view").length;
  const viewsChange = prevViews > 0 ? Math.round(((totalViews - prevViews) / prevViews) * 100) : 0;

  // Per-listing breakdown
  const listingMap = new Map<string, { slug: string; type: string; city: string; views: number; clicks: number; sent: number }>();
  for (const e of allEvents) {
    if (!listingMap.has(e.listing_slug)) {
      listingMap.set(e.listing_slug, { slug: e.listing_slug, type: e.listing_type, city: e.city ?? "", views: 0, clicks: 0, sent: 0 });
    }
    const entry = listingMap.get(e.listing_slug)!;
    if (e.event_type === "page_view") entry.views++;
    if (e.event_type === "contact_click") entry.clicks++;
    if (e.event_type === "contact_sent") entry.sent++;
  }

  // Fetch listing titles from Sanity
  const slugs = Array.from(listingMap.keys());
  let slugToTitle = new Map<string, string>();
  if (slugs.length > 0) {
    const titles = await sanityClient.fetch<{ slug: string; title: string }[]>(
      `*[_type == "listing" && slug.current in $slugs]{ "slug": slug.current, title }`,
      { slugs }
    ).catch(() => []);
    slugToTitle = new Map(titles.map((t) => [t.slug, t.title]));
  }

  const topByViews = Array.from(listingMap.values())
    .map((l) => ({ ...l, title: slugToTitle.get(l.slug) ?? l.slug }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const topByConversion = Array.from(listingMap.values())
    .filter((l) => l.views >= 10)
    .map((l) => ({ ...l, title: slugToTitle.get(l.slug) ?? l.slug, conversion: ((l.sent / l.views) * 100).toFixed(1) }))
    .sort((a, b) => parseFloat(b.conversion) - parseFloat(a.conversion))
    .slice(0, 10);

  // Most viewed + most contacted
  const mostViewed = topByViews[0]?.title ?? "—";
  const mostContacted = Array.from(listingMap.values())
    .sort((a, b) => b.sent - a.sent)[0];
  const mostContactedTitle = mostContacted ? (slugToTitle.get(mostContacted.slug) ?? mostContacted.slug) : "—";

  // Daily views bar chart
  const dailyViews: { date: string; count: number }[] = [];
  const viewsByDay = new Map<string, number>();
  for (const e of allEvents) {
    if (e.event_type !== "page_view") continue;
    const day = e.created_at.slice(0, 10);
    viewsByDay.set(day, (viewsByDay.get(day) ?? 0) + 1);
  }
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    dailyViews.push({ date: key, count: viewsByDay.get(key) ?? 0 });
  }

  // City breakdown
  const cityMap = new Map<string, { views: number; contacts: number }>();
  for (const e of allEvents) {
    const c = e.city || "Unknown";
    if (!cityMap.has(c)) cityMap.set(c, { views: 0, contacts: 0 });
    const entry = cityMap.get(c)!;
    if (e.event_type === "page_view") entry.views++;
    if (e.event_type === "contact_sent") entry.contacts++;
  }
  const cityBreakdown = Array.from(cityMap.entries())
    .map(([city, stats]) => ({ city, ...stats }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Type breakdown
  const typeMap = new Map<string, { views: number; contacts: number }>();
  for (const e of allEvents) {
    const t = e.listing_type || "unknown";
    if (!typeMap.has(t)) typeMap.set(t, { views: 0, contacts: 0 });
    const entry = typeMap.get(t)!;
    if (e.event_type === "page_view") entry.views++;
    if (e.event_type === "contact_sent") entry.contacts++;
  }
  const typeBreakdown = Array.from(typeMap.entries())
    .map(([type, stats]) => ({ type, ...stats }))
    .sort((a, b) => b.views - a.views);

  // Referrer analysis
  const refMap = new Map<string, number>();
  for (const e of allEvents) {
    if (e.referrer) {
      try {
        const domain = new URL(e.referrer).hostname.replace("www.", "");
        refMap.set(domain, (refMap.get(domain) ?? 0) + 1);
      } catch {
        refMap.set("direct", (refMap.get("direct") ?? 0) + 1);
      }
    } else {
      refMap.set("direct", (refMap.get("direct") ?? 0) + 1);
    }
  }
  const topReferrers = Array.from(refMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Device breakdown
  const deviceCount = { mobile: 0, desktop: 0, tablet: 0 };
  for (const e of allEvents) {
    if (e.device === "mobile") deviceCount.mobile++;
    else if (e.device === "tablet") deviceCount.tablet++;
    else deviceCount.desktop++;
  }
  const total = allEvents.length || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold text-dark">Analytics</h1>
        <div className="flex items-center gap-1 bg-white rounded-xl border border-border p-1">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?range=${d}`}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-colors ${
                days === d ? "bg-amber text-white" : "text-text3 hover:bg-[#F5F3F0]"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: "Page Views", value: totalViews, sub: viewsChange !== 0 ? `${viewsChange > 0 ? "+" : ""}${viewsChange}% vs prev` : null },
          { label: "Contact Clicks", value: totalClicks },
          { label: "Forms Sent", value: totalSent },
          { label: "Conversion", value: `${convRate}%` },
          { label: "Most Viewed", value: mostViewed, small: true },
          { label: "Most Contacted", value: mostContactedTitle, small: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-4">
            <p className="text-[11px] text-text3 font-medium mb-1">{s.label}</p>
            <p className={`font-display font-bold tracking-[-0.02em] text-dark ${s.small ? "text-[14px] truncate" : "text-[22px]"}`}>
              {s.value}
            </p>
            {s.sub && (
              <p className={`text-[11px] font-medium mt-0.5 ${viewsChange > 0 ? "text-[#22C55E]" : "text-red-500"}`}>
                {s.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      <AnalyticsClient
        dailyViews={dailyViews}
        topByViews={topByViews}
        topByConversion={topByConversion}
        cityBreakdown={cityBreakdown}
        typeBreakdown={typeBreakdown}
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
