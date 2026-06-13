"use client";

interface TopListing {
  slug: string;
  title: string;
  type: string;
  city: string;
  views: number;
  clicks: number;
  sent: number;
  conversion?: string;
}

interface AnalyticsClientProps {
  dailyViews: { date: string; count: number }[];
  topByViews: TopListing[];
  topByConversion: (TopListing & { conversion: string })[];
  cityBreakdown: { city: string; views: number; contacts: number }[];
  typeBreakdown: { type: string; views: number; contacts: number }[];
  topReferrers: [string, number][];
  deviceSplit: { mobile: number; desktop: number; tablet: number };
}

export function AnalyticsClient({
  dailyViews,
  topByViews,
  topByConversion,
  cityBreakdown,
  typeBreakdown,
  topReferrers,
  deviceSplit,
}: AnalyticsClientProps) {
  const maxDaily = Math.max(...dailyViews.map((d) => d.count), 1);
  const maxCityViews = Math.max(...cityBreakdown.map((c) => c.views), 1);

  return (
    <div className="space-y-6">
      {/* Daily views */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="font-display text-[16px] font-bold text-dark mb-4">Platform Views Over Time</h2>
        <div className="flex items-end gap-[2px] h-[140px]">
          {dailyViews.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col justify-end" title={`${d.date}: ${d.count}`}>
              <div
                className="w-full rounded-t bg-amber/70 hover:bg-amber transition-colors min-w-[3px]"
                style={{ height: `${Math.max(2, (d.count / maxDaily) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-text3">
          <span>{dailyViews[0]?.date.slice(5)}</span>
          <span>{dailyViews[dailyViews.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Top by views */}
      {topByViews.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EDE8]">
            <h2 className="font-display text-[16px] font-bold text-dark">Top Listings by Views</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F0EDE8] text-text3">
                  <th className="px-6 py-2.5 font-medium w-8">#</th>
                  <th className="px-6 py-2.5 font-medium">Listing</th>
                  <th className="px-6 py-2.5 font-medium">Type</th>
                  <th className="px-6 py-2.5 font-medium">City</th>
                  <th className="px-6 py-2.5 font-medium text-right">Views</th>
                  <th className="px-6 py-2.5 font-medium text-right">Contacts</th>
                  <th className="px-6 py-2.5 font-medium text-right">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {topByViews.map((l, i) => (
                  <tr key={l.slug} className="hover:bg-[#F7F5F2]">
                    <td className="px-6 py-2.5 text-text3">{i + 1}</td>
                    <td className="px-6 py-2.5 font-medium text-dark truncate max-w-[200px]">{l.title}</td>
                    <td className="px-6 py-2.5 text-text3 capitalize">{l.type}</td>
                    <td className="px-6 py-2.5 text-text3">{l.city || "—"}</td>
                    <td className="px-6 py-2.5 text-right font-semibold">{l.views}</td>
                    <td className="px-6 py-2.5 text-right">{l.sent}</td>
                    <td className="px-6 py-2.5 text-right">{l.views > 0 ? ((l.sent / l.views) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top by conversion */}
      {topByConversion.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EDE8]">
            <h2 className="font-display text-[16px] font-bold text-dark">Top by Conversion Rate <span className="text-text3 font-normal text-[13px]">(min 10 views)</span></h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F0EDE8] text-text3">
                  <th className="px-6 py-2.5 font-medium">Listing</th>
                  <th className="px-6 py-2.5 font-medium text-right">Views</th>
                  <th className="px-6 py-2.5 font-medium text-right">Sent</th>
                  <th className="px-6 py-2.5 font-medium text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {topByConversion.map((l) => (
                  <tr key={l.slug} className="hover:bg-[#F7F5F2]">
                    <td className="px-6 py-2.5 font-medium text-dark truncate max-w-[200px]">{l.title}</td>
                    <td className="px-6 py-2.5 text-right">{l.views}</td>
                    <td className="px-6 py-2.5 text-right">{l.sent}</td>
                    <td className="px-6 py-2.5 text-right font-semibold text-[#22C55E]">{l.conversion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* City breakdown */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-display text-[16px] font-bold text-dark mb-4">By City</h2>
          <div className="space-y-3">
            {cityBreakdown.map((c) => (
              <div key={c.city}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="text-dark font-medium">{c.city}</span>
                  <span className="text-text3">{c.views} views · {c.contacts} contacts</span>
                </div>
                <div className="h-2 rounded-full bg-[#F0EDE8]">
                  <div className="h-full rounded-full bg-purple/70" style={{ width: `${(c.views / maxCityViews) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Type breakdown */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-display text-[16px] font-bold text-dark mb-4">By Listing Type</h2>
          <div className="space-y-3">
            {typeBreakdown.map((t) => (
              <div key={t.type} className="flex items-center justify-between text-[13px] py-2 border-b border-[#F0EDE8] last:border-0">
                <span className="text-dark font-medium capitalize">{t.type}</span>
                <div className="text-text3">
                  <span className="font-semibold text-dark">{t.views}</span> views · <span className="font-semibold text-dark">{t.contacts}</span> contacts
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Referrers */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-display text-[16px] font-bold text-dark mb-4">Traffic Sources</h2>
          {topReferrers.length === 0 ? (
            <p className="text-[13px] text-text3">No data yet</p>
          ) : (
            <div className="space-y-2.5">
              {topReferrers.map(([domain, count]) => (
                <div key={domain} className="flex items-center justify-between text-[13px]">
                  <span className="text-dark">{domain}</span>
                  <span className="font-semibold text-text3">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device split */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-display text-[16px] font-bold text-dark mb-4">Devices</h2>
          <div className="flex gap-4">
            {[
              { label: "Mobile", pct: deviceSplit.mobile, color: "bg-amber" },
              { label: "Desktop", pct: deviceSplit.desktop, color: "bg-purple" },
              { label: "Tablet", pct: deviceSplit.tablet, color: "bg-teal" },
            ].map((d) => (
              <div key={d.label} className="flex-1 text-center">
                <div className="h-2 rounded-full bg-[#F0EDE8] mb-2">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} />
                </div>
                <p className="text-[22px] font-bold text-dark">{d.pct}%</p>
                <p className="text-[11px] text-text3">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
