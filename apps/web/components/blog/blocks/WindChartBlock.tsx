"use client";

import { useEffect, useState, useCallback } from "react";

/* ─── Static Data ─── */

const MONTHLY_WIND = [
  { month: "Jan", avg: 17, dir: "NE", season: "Kaskazi", tier: "prime" as const },
  { month: "Feb", avg: 18, dir: "NE", season: "Kaskazi", tier: "prime" as const },
  { month: "Mar", avg: 16, dir: "NE", season: "Kaskazi", tier: "good" as const },
  { month: "Apr", avg: 13, dir: "NE/SE", season: "Transition", tier: "variable" as const },
  { month: "May", avg: 15, dir: "SE", season: "Transition", tier: "variable" as const },
  { month: "Jun", avg: 19, dir: "SE", season: "Kusi", tier: "good" as const },
  { month: "Jul", avg: 23, dir: "SE", season: "Kusi", tier: "prime" as const },
  { month: "Aug", avg: 22, dir: "SE", season: "Kusi", tier: "prime" as const },
  { month: "Sep", avg: 18, dir: "SE", season: "Kusi", tier: "good" as const },
  { month: "Oct", avg: 12, dir: "SE/NE", season: "Transition", tier: "variable" as const },
  { month: "Nov", avg: 9, dir: "Variable", season: "Calm", tier: "marginal" as const },
  { month: "Dec", avg: 15, dir: "NE", season: "Kaskazi", tier: "good" as const },
];

const WATER_TEMP = [
  { month: "Jan", temp: 27 }, { month: "Feb", temp: 28 }, { month: "Mar", temp: 29 },
  { month: "Apr", temp: 29 }, { month: "May", temp: 28 }, { month: "Jun", temp: 27 },
  { month: "Jul", temp: 26 }, { month: "Aug", temp: 26 }, { month: "Sep", temp: 26 },
  { month: "Oct", temp: 27 }, { month: "Nov", temp: 28 }, { month: "Dec", temp: 28 },
];

const MAX_WIND = 30; // max scale for bar chart

const TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  prime: { bg: "bg-emerald-600", text: "text-white", label: "Prime" },
  good: { bg: "bg-emerald-400", text: "text-white", label: "Good" },
  variable: { bg: "bg-amber", text: "text-white", label: "Variable" },
  marginal: { bg: "bg-text3", text: "text-white", label: "Marginal" },
};

const TIER_BAR_COLORS: Record<string, string> = {
  prime: "bg-emerald-600",
  good: "bg-emerald-400",
  variable: "bg-amber",
  marginal: "bg-red-400",
};

/* ─── Types ─── */

interface HourlyForecast {
  time: string;
  windSpeed: number;
  windDir: number;
  gust: number;
}

interface DayForecast {
  date: string;
  label: string;
  hours: HourlyForecast[];
}

/* ─── Helpers ─── */

function directionToDeg(dir: string): number {
  const map: Record<string, number> = {
    N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
    E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
    S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
    W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
  };
  return map[dir] ?? 0;
}

function degToCompass(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function windColor(speed: number): string {
  if (speed >= 15) return "text-emerald-600";
  if (speed >= 10) return "text-amber";
  return "text-red-400";
}

/* ─── Component ─── */

export function WindChartBlock() {
  const [forecast, setForecast] = useState<DayForecast[] | null>(null);
  const [forecastError, setForecastError] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=-3.35&longitude=40.02&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=3&timezone=Africa%2FNairobi`
      );
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();

      const hours: HourlyForecast[] = data.hourly.time.map((t: string, i: number) => ({
        time: t,
        windSpeed: Math.round((data.hourly.wind_speed_10m[i] / 1.852) * 10) / 10, // km/h → knots
        windDir: data.hourly.wind_direction_10m[i],
        gust: Math.round((data.hourly.wind_gusts_10m[i] / 1.852) * 10) / 10,
      }));

      // Group by day
      const dayMap = new Map<string, HourlyForecast[]>();
      hours.forEach((h) => {
        const dateKey = h.time.split("T")[0];
        if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
        dayMap.get(dateKey)!.push(h);
      });

      const days: DayForecast[] = [];
      let idx = 0;
      dayMap.forEach((hrs, dateKey) => {
        const labels = ["Today", "Tomorrow", "Day 3"];
        days.push({
          date: dateKey,
          label: labels[idx] ?? dateKey,
          hours: hrs.filter((_, i) => i % 3 === 0), // every 3 hours
        });
        idx++;
      });

      setForecast(days);
    } catch {
      setForecastError(true);
    }
  }, []);

  useEffect(() => {
    if (forecastOpen && !forecast && !forecastError) {
      fetchForecast();
    }
  }, [forecastOpen, forecast, forecastError, fetchForecast]);

  return (
    <div className="my-10 space-y-6">
      {/* ── Section: Monthly Wind Speed Chart ── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="bg-dark px-5 py-4">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">💨</span> Monthly Wind Speeds — Watamu
          </h3>
          <p className="text-[11px] text-white/40 mt-1">
            Average knots at 10m. Green = kite-able (15+), amber = variable (10-15), red = marginal (&lt;10).
          </p>
        </div>

        <div className="px-5 py-5 space-y-2">
          {MONTHLY_WIND.map((m) => {
            const pct = (m.avg / MAX_WIND) * 100;
            const barColor = TIER_BAR_COLORS[m.tier];
            const seasonTag =
              m.month === "Jan" ? "Kaskazi ↗" :
              m.month === "Jul" ? "Kusi ↘" :
              null;

            return (
              <div key={m.month} className="flex items-center gap-3">
                <div className="w-8 text-[12px] font-bold text-dark shrink-0">
                  {m.month}
                </div>
                <div className="flex-1 h-7 bg-surface rounded-full overflow-hidden relative">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${pct}%` }}
                  >
                    <span className="text-[11px] font-bold text-white whitespace-nowrap">
                      {m.avg} kt
                    </span>
                  </div>
                </div>
                <div
                  className="w-5 h-5 flex items-center justify-center text-[12px] text-dark shrink-0"
                  style={{ transform: `rotate(${directionToDeg(m.dir.split("/")[0])}deg)` }}
                  title={m.dir}
                >
                  ▲
                </div>
                <div className="w-6 text-[11px] text-text3 shrink-0">
                  {m.dir}
                </div>
                {seasonTag && (
                  <span className="text-[10px] font-bold text-amber uppercase tracking-wide whitespace-nowrap">
                    {seasonTag}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-5 pb-4 flex flex-wrap gap-3">
          {Object.entries(TIER_BAR_COLORS).map(([tier, bg]) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${bg}`} />
              <span className="text-[11px] text-text3 capitalize">{tier}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section: Wind Season Calendar ── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="bg-dark px-5 py-4">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">🗓️</span> Kite Season Calendar
          </h3>
        </div>

        <div className="px-5 py-5">
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
            {MONTHLY_WIND.map((m) => {
              const tier = TIER_COLORS[m.tier];
              const wt = WATER_TEMP.find((w) => w.month === m.month);
              return (
                <div
                  key={m.month}
                  className={`${tier.bg} ${tier.text} rounded-lg p-2 text-center`}
                >
                  <div className="text-[11px] font-bold">{m.month}</div>
                  <div className="text-[10px] opacity-80">{m.avg} kt</div>
                  {wt && (
                    <div className="text-[9px] opacity-60 mt-0.5">{wt.temp}°C 🌊</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar legend */}
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            {Object.entries(TIER_COLORS).map(([, v]) => (
              <div key={v.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${v.bg}`} />
                <span className="text-[11px] text-text3">{v.label}</span>
              </div>
            ))}
          </div>

          {/* Season bands */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center text-[11px]">
            <span className="px-3 py-1 rounded-full bg-surface text-dark font-medium">
              🪁 Kaskazi (NE): Dec — Mar
            </span>
            <span className="px-3 py-1 rounded-full bg-surface text-dark font-medium">
              🪁 Kusi (SE): Jun — Sep
            </span>
          </div>
        </div>
      </div>

      {/* ── Section: Live Wind Forecast (collapsible) ── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-white">
        <button
          onClick={() => setForecastOpen((v) => !v)}
          className="w-full bg-dark px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[#1e1a12] transition-colors"
        >
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">📡</span> Live Wind Forecast — Next 3 Days
          </h3>
          <span className={`text-white/60 text-[18px] transition-transform duration-300 ${forecastOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>

        {forecastOpen && (
          <div className="px-5 py-5">
            {!forecast && !forecastError && (
              /* Loading skeleton */
              <div className="space-y-4">
                {[1, 2, 3].map((d) => (
                  <div key={d} className="space-y-2">
                    <div className="h-4 w-24 bg-surface rounded animate-pulse" />
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <div key={h} className="w-16 h-20 bg-surface rounded-lg animate-pulse shrink-0" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {forecastError && (
              <div className="text-center py-6">
                <p className="text-[13px] text-text3">
                  Could not load live forecast. Check back later or visit{" "}
                  <a
                    href="https://www.windy.com/-3.35/40.02?wind"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-amber hover:text-dark"
                  >
                    Windy.com
                  </a>{" "}
                  directly.
                </p>
              </div>
            )}

            {forecast && (
              <div className="space-y-5">
                {forecast.map((day) => (
                  <div key={day.date}>
                    <h4 className="text-[12px] font-bold text-dark uppercase tracking-wide mb-2">
                      {day.label}{" "}
                      <span className="text-text3 font-normal normal-case tracking-normal">
                        — {new Date(day.date + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </h4>
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {day.hours.map((h) => {
                        const hour = new Date(h.time).getHours();
                        const hourLabel = hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
                        const compass = degToCompass(h.windDir);
                        const speed = Math.round(h.windSpeed);
                        const gust = Math.round(h.gust);
                        const isDaytime = hour >= 6 && hour <= 18;

                        return (
                          <div
                            key={h.time}
                            className={`shrink-0 w-16 rounded-lg border border-border p-2 text-center ${isDaytime ? "bg-white" : "bg-[#FAF8F5]"}`}
                          >
                            <div className="text-[10px] text-text3 font-medium">{hourLabel}</div>
                            <div className={`text-[16px] font-bold mt-1 ${windColor(speed)}`}>
                              {speed}
                            </div>
                            <div className="text-[9px] text-text3">kt</div>
                            <div
                              className="text-[14px] text-dark mx-auto mt-1"
                              style={{ transform: `rotate(${h.windDir}deg)`, width: "fit-content" }}
                              title={`${compass} (${h.windDir}°)`}
                            >
                              ▲
                            </div>
                            <div className="text-[9px] text-text3 mt-0.5">{compass}</div>
                            {gust > speed + 3 && (
                              <div className="text-[9px] text-red-400 font-medium mt-0.5">
                                G{gust}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Kite-ability summary */}
                <div className="bg-surface rounded-xl p-4">
                  <p className="text-[11px] text-text3 uppercase tracking-wide font-bold mb-2">
                    Quick read
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {forecast.map((day) => {
                      const dayHours = day.hours.filter((h) => {
                        const hr = new Date(h.time).getHours();
                        return hr >= 8 && hr <= 17;
                      });
                      const avgSpeed = dayHours.length
                        ? Math.round(dayHours.reduce((s, h) => s + h.windSpeed, 0) / dayHours.length)
                        : 0;
                      const kitable = avgSpeed >= 15;
                      return (
                        <div
                          key={day.date}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium ${
                            kitable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <span>{kitable ? "✓" : "~"}</span>
                          <span>{day.label}: avg {avgSpeed} kt daytime</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section: Windy Map Embed ── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="bg-dark px-5 py-4">
          <h3 className="text-[14px] font-bold text-white flex items-center gap-2">
            <span className="text-[18px]">🗺️</span> Live Wind Map — Watamu
          </h3>
        </div>
        <div className="relative w-full" style={{ minHeight: 400 }}>
          <iframe
            width="100%"
            height="400"
            src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricWind=kt&metricTemp=%C2%B0C&zoom=11&overlay=wind&product=ecmwf&level=surface&lat=-3.35&lon=40.02"
            frameBorder="0"
            loading="lazy"
            title="Windy wind map centered on Watamu, Kenya"
            className="w-full"
            style={{ border: 0 }}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <p className="text-[10px] text-text3 text-center">
        Data sources:{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber">
          Open-Meteo
        </a>
        ,{" "}
        <a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber">
          Windy.com
        </a>
        . Wind speeds in knots at 10m elevation. Historical averages based on multi-year station data.
      </p>
    </div>
  );
}
