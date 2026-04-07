"use client";

// ── Watamu tidal data ──────────────────────────────────
// Watamu has semidiurnal tides: 2 high and 2 low tides per day
// Spring tidal range ~3.2m, neap ~1.2m
// Tidal period: 12h 25min (M2 lunar constituent)

const PERIOD = 12.42; // hours
const PHASE  = 2.13;  // offset so first low ≈ 02:00

const SPRING = { mean: 1.65, amp: 1.45 }; // high ~3.1m, low ~0.2m
const NEAP   = { mean: 1.55, amp: 0.55 }; // high ~2.1m, low ~1.0m
const MAX_H  = 3.5;

function height(t: number, mean: number, amp: number): number {
  return mean + amp * Math.cos((2 * Math.PI * t) / PERIOD + PHASE);
}

// Generate SVG polyline points for 24h curve
function curvePoints(mean: number, amp: number, w: number, h: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * 24;
    const x = (t / 24) * w;
    const y = h - (height(t, mean, amp) / MAX_H) * h;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

// Generate filled area path (curve + bottom edge)
function areaPath(mean: number, amp: number, w: number, h: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * 24;
    const x = (t / 24) * w;
    const y = h - (height(t, mean, amp) / MAX_H) * h;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${pts[0]} L ${pts.join(" L ")} L ${w},${h} L 0,${h} Z`;
}

// Find approximate tide extremes for a typical day
const EXTREMES = [
  { t: 2.1,  type: "low",  spring: height(2.1,  SPRING.mean, SPRING.amp), neap: height(2.1,  NEAP.mean, NEAP.amp) },
  { t: 8.3,  type: "high", spring: height(8.3,  SPRING.mean, SPRING.amp), neap: height(8.3,  NEAP.mean, NEAP.amp) },
  { t: 14.5, type: "low",  spring: height(14.5, SPRING.mean, SPRING.amp), neap: height(14.5, NEAP.mean, NEAP.amp) },
  { t: 20.7, type: "high", spring: height(20.7, SPRING.mean, SPRING.amp), neap: height(20.7, NEAP.mean, NEAP.amp) },
];

const MONTHLY = [
  { month: "Jan", spring: 3.2, neap: 1.1 },
  { month: "Feb", spring: 3.1, neap: 1.1 },
  { month: "Mar", spring: 3.2, neap: 1.2 },
  { month: "Apr", spring: 3.0, neap: 1.2 },
  { month: "May", spring: 2.9, neap: 1.3 },
  { month: "Jun", spring: 2.8, neap: 1.3 },
  { month: "Jul", spring: 2.9, neap: 1.2 },
  { month: "Aug", spring: 3.0, neap: 1.2 },
  { month: "Sep", spring: 3.1, neap: 1.1 },
  { month: "Oct", spring: 3.2, neap: 1.1 },
  { month: "Nov", spring: 3.3, neap: 1.0 },
  { month: "Dec", spring: 3.3, neap: 1.0 },
];

const W = 600;
const H = 160;

const ACTIVITIES = [
  {
    level: "High tide",
    height: "2.5 – 3.3m",
    color: "bg-blue-500",
    text: "text-white",
    icon: "🌊",
    tips: ["Canoe and boat trips in Mida Creek (water deep enough to navigate)", "Swimming and snorkeling over the coral", "Dhow trips and Safari Blue excursions"],
  },
  {
    level: "Mid tide",
    height: "1.2 – 2.5m",
    color: "bg-teal-400",
    text: "text-white",
    icon: "🏄",
    tips: ["Kitesurfing in the lagoon", "Snorkeling with good access to reef", "Beach walks and swimming"],
  },
  {
    level: "Low tide",
    height: "0.0 – 1.2m",
    color: "bg-[#E8A020]",
    text: "text-white",
    icon: "🐚",
    tips: ["Sandbanks emerge — the most dramatic beach scenery", "Walk out to the reef and explore rock pools", "Best for spotting starfish, sea urchins and marine life up close"],
  },
];

export function TideChartBlock() {
  return (
    <div className="my-10 space-y-6">

      {/* ── Tide Curve ── */}
      <div className="rounded-2xl border border-[#E2DDD5] overflow-hidden bg-white">
        <div className="bg-[#16130C] px-5 py-4">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">🌊</span> Typical Daily Tide Pattern — Watamu
          </h3>
          <p className="text-[11px] text-white/40 mt-1">
            Semidiurnal tides: 2 highs and 2 lows every 24 hours. Times shift ~50 minutes later each day.
          </p>
        </div>

        <div className="px-4 pt-4 pb-2">
          <svg
            viewBox={`0 0 ${W} ${H + 30}`}
            className="w-full"
            style={{ height: "auto", minHeight: 120 }}
            aria-label="Typical daily tide curve for Watamu, Kenya"
          >
            {/* Y-axis guide lines */}
            {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((m) => {
              const y = H - (m / MAX_H) * H;
              return (
                <g key={m}>
                  <line x1={0} y1={y} x2={W} y2={y} stroke="#E2DDD5" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={4} y={y - 3} fontSize="9" fill="#9C9485">{m}m</text>
                </g>
              );
            })}

            {/* Filled spring area */}
            <path
              d={areaPath(SPRING.mean, SPRING.amp, W, H)}
              fill="rgba(13,148,136,0.12)"
            />

            {/* Spring tide curve */}
            <polyline
              points={curvePoints(SPRING.mean, SPRING.amp, W, H)}
              fill="none"
              stroke="#0d9488"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Neap tide curve */}
            <polyline
              points={curvePoints(NEAP.mean, NEAP.amp, W, H)}
              fill="none"
              stroke="#0d9488"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              strokeOpacity="0.45"
            />

            {/* Extreme markers */}
            {EXTREMES.map((e) => {
              const x = (e.t / 24) * W;
              const yS = H - (e.spring / MAX_H) * H;
              const label = e.type === "high"
                ? `H ${e.spring.toFixed(1)}m`
                : `L ${e.spring.toFixed(1)}m`;
              const above = e.type === "high";
              return (
                <g key={e.t}>
                  <circle cx={x} cy={yS} r="4" fill={above ? "#0d9488" : "#E8A020"} />
                  <text
                    x={x}
                    y={above ? yS - 8 : yS + 14}
                    textAnchor="middle"
                    fontSize="9"
                    fill={above ? "#0d9488" : "#E8A020"}
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* X-axis hour labels */}
            {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((hr) => {
              const x = (hr / 24) * W;
              const label = hr === 0 || hr === 24 ? "12am" : hr === 12 ? "12pm" : hr < 12 ? `${hr}am` : `${hr - 12}pm`;
              return (
                <text key={hr} x={x} y={H + 20} textAnchor="middle" fontSize="9" fill="#9C9485">
                  {label}
                </text>
              );
            })}

            {/* X-axis baseline */}
            <line x1={0} y1={H} x2={W} y2={H} stroke="#E2DDD5" strokeWidth="1" />
          </svg>
        </div>

        {/* Legend */}
        <div className="px-5 pb-4 flex flex-wrap gap-4 text-[11px] text-[#9C9485]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1.5 rounded bg-[#0d9488]" />
            <span>Spring tide (full/new moon) — range ~3.2m</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] border-t-2 border-dashed border-[#0d9488] opacity-50" />
            <span>Neap tide (quarter moon) — range ~1.2m</span>
          </div>
        </div>
      </div>

      {/* ── Monthly Range Strip ── */}
      <div className="rounded-2xl border border-[#E2DDD5] overflow-hidden bg-white">
        <div className="bg-[#16130C] px-5 py-4">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">📅</span> Spring Tide Range by Month
          </h3>
          <p className="text-[11px] text-white/40 mt-1">
            Higher spring tide range means more dramatic sandbanks and lower reef exposure.
          </p>
        </div>

        <div className="px-5 py-5 space-y-2">
          {MONTHLY.map((m) => {
            const pct = (m.spring / 3.5) * 100;
            return (
              <div key={m.month} className="flex items-center gap-3">
                <div className="w-8 text-[12px] font-bold text-[#16130C] shrink-0">{m.month}</div>
                <div className="flex-1 h-6 bg-[#F4F1EC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-[10px] font-bold text-white whitespace-nowrap">{m.spring}m</span>
                  </div>
                </div>
                <div className="w-16 text-[10px] text-[#9C9485] shrink-0 text-right">
                  neap {m.neap}m
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Activity Guide ── */}
      <div className="rounded-2xl border border-[#E2DDD5] overflow-hidden bg-white">
        <div className="bg-[#16130C] px-5 py-4">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">🗺️</span> What to Do at Each Tide Level
          </h3>
          <p className="text-[11px] text-white/40 mt-1">
            Tides change everything in Watamu. Plan activities around them for the best experience.
          </p>
        </div>

        <div className="divide-y divide-[#F4F1EC]">
          {ACTIVITIES.map((a) => (
            <div key={a.level} className="px-5 py-4 flex gap-4 items-start">
              <div className={`shrink-0 rounded-xl px-3 py-1.5 text-center min-w-[72px] ${a.color} ${a.text}`}>
                <div className="text-[18px]">{a.icon}</div>
                <div className="text-[10px] font-bold mt-0.5 leading-tight">{a.level}</div>
                <div className="text-[9px] opacity-75 mt-0.5">{a.height}</div>
              </div>
              <ul className="space-y-1">
                {a.tips.map((tip) => (
                  <li key={tip} className="text-[13px] text-[#5E5848] flex gap-2">
                    <span className="text-[#9C9485] mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[#9C9485] text-center">
        Tide times shift approximately 50 minutes later each day. Check exact times locally before planning boat trips or reef walks.
      </p>

    </div>
  );
}
