"use client";

interface PerListing {
  slug: string;
  title: string;
  views: number;
  clicks: number;
  sent: number;
  phone: number;
}

interface StatsClientProps {
  perListing: PerListing[];
  dailyViews: { date: string; count: number }[];
  topReferrers: [string, number][];
  deviceSplit: { mobile: number; desktop: number; tablet: number };
}

export function StatsClient({ perListing, dailyViews, topReferrers, deviceSplit }: StatsClientProps) {
  const maxDaily = Math.max(...dailyViews.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Daily views bar chart */}
      <div className="bg-white rounded-xl border border-[#E2DDD5] p-5">
        <h2 className="text-[15px] font-bold text-[#16130C] mb-4">Daily Page Views</h2>
        <div className="flex items-end gap-[2px] h-[120px]">
          {dailyViews.map((d) => {
            const height = Math.max(2, (d.count / maxDaily) * 100);
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
                <div
                  className="w-full rounded-t bg-[#E8A020]/70 hover:bg-[#E8A020] transition-colors min-w-[3px]"
                  style={{ height: `${height}%` }}
                  title={`${d.date}: ${d.count} views`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[#9C9485]">
          <span>{dailyViews[0]?.date.slice(5)}</span>
          <span>{dailyViews[dailyViews.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Per-listing table */}
      {perListing.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E2DDD5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F0EDE8]">
            <h2 className="text-[15px] font-bold text-[#16130C]">Per Listing</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#F0EDE8] text-[#9C9485]">
                  <th className="px-5 py-2.5 font-medium">Listing</th>
                  <th className="px-5 py-2.5 font-medium text-right">Views</th>
                  <th className="px-5 py-2.5 font-medium text-right">Clicks</th>
                  <th className="px-5 py-2.5 font-medium text-right">Sent</th>
                  <th className="px-5 py-2.5 font-medium text-right">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EDE8]">
                {perListing.map((l) => (
                  <tr key={l.slug} className="hover:bg-[#F7F5F2]">
                    <td className="px-5 py-2.5 font-medium text-[#16130C] truncate max-w-[200px]">{l.title}</td>
                    <td className="px-5 py-2.5 text-right">{l.views}</td>
                    <td className="px-5 py-2.5 text-right">{l.clicks}</td>
                    <td className="px-5 py-2.5 text-right">{l.sent}</td>
                    <td className="px-5 py-2.5 text-right">{l.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top referrers */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] p-5">
          <h2 className="text-[15px] font-bold text-[#16130C] mb-3">Top Sources</h2>
          {topReferrers.length === 0 ? (
            <p className="text-[13px] text-[#9C9485]">No data yet</p>
          ) : (
            <div className="space-y-2">
              {topReferrers.map(([domain, count]) => (
                <div key={domain} className="flex items-center justify-between">
                  <span className="text-[13px] text-[#16130C]">{domain}</span>
                  <span className="text-[13px] font-semibold text-[#9C9485]">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device split */}
        <div className="bg-white rounded-xl border border-[#E2DDD5] p-5">
          <h2 className="text-[15px] font-bold text-[#16130C] mb-3">Devices</h2>
          <div className="flex gap-3">
            {[
              { label: "Mobile", pct: deviceSplit.mobile, color: "bg-[#E8A020]" },
              { label: "Desktop", pct: deviceSplit.desktop, color: "bg-[#6B2D8B]" },
              { label: "Tablet", pct: deviceSplit.tablet, color: "bg-[#0D7377]" },
            ].map((d) => (
              <div key={d.label} className="flex-1 text-center">
                <div className="h-2 rounded-full bg-[#F0EDE8] mb-2">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${d.pct}%` }} />
                </div>
                <p className="text-[20px] font-bold text-[#16130C]">{d.pct}%</p>
                <p className="text-[11px] text-[#9C9485]">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
